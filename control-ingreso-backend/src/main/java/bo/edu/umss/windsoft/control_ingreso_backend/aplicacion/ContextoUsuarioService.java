package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Quién está haciendo la petición y sobre qué exámenes puede operar (HU06/HU10).
 *
 * Recomendación de la ingeniera (09/10): las incidencias e ingresos excepcionales
 * se registran sobre un examen YA ASIGNADO a quien los registra:
 * - ADMINISTRADOR: todos los exámenes.
 * - DOCENTE: los exámenes de los que es responsable (examen.idusuario).
 * - OPERADOR: las aulas de examen que tiene asignadas y ACTIVAS en
 *   ayudante_examen (la misma asignación que usa la HU05), y solo donde la
 *   operación lo permite (registrar incidencias).
 *
 * Cada acceso negado queda en auditoría como ACCESO_DENEGADO.
 */
@Service
public class ContextoUsuarioService {

    public record UsuarioActual(Integer idUsuario, String correo, String rol) {
        public boolean esAdmin() {
            return TipoUsuarioResolver.ADMINISTRADOR.equals(rol);
        }

        public boolean esDocente() {
            return TipoUsuarioResolver.DOCENTE.equals(rol);
        }

        public boolean esOperador() {
            return TipoUsuarioResolver.OPERADOR.equals(rol);
        }
    }

    private static final String ASIGNACION_ACTIVA = "ACTIVO";

    private final DocenteAsignaturaRepository docenteAsignaturaRepository;
    private final ExamenRepository examenRepository;
    private final AyudanteExamenRepository ayudanteExamenRepository;
    private final AuditoriaService auditoriaService;

    public ContextoUsuarioService(DocenteAsignaturaRepository docenteAsignaturaRepository,
                                  ExamenRepository examenRepository,
                                  AyudanteExamenRepository ayudanteExamenRepository,
                                  AuditoriaService auditoriaService) {
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.examenRepository = examenRepository;
        this.ayudanteExamenRepository = ayudanteExamenRepository;
        this.auditoriaService = auditoriaService;
    }

    public UsuarioActual actual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String rol = auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replaceFirst("^ROLE_", ""))
                .findFirst()
                .orElse(null);
        return new UsuarioActual((Integer) auth.getDetails(), auth.getName(), rol);
    }

    /** Exámenes de los que el docente es responsable. */
    public Set<Integer> examenesDelDocente(Integer idUsuario) {
        return examenRepository.findByIdUsuario(idUsuario).stream()
                .map(Examen::getIdExamen)
                .collect(Collectors.toSet());
    }

    /** Aulas de examen (idambiente) asignadas y activas para el operador. */
    public Set<Integer> ambientesDelOperador(Integer idUsuario) {
        return ayudanteExamenRepository.findByIdIdayudanteAndEstadoAsignacion(idUsuario, ASIGNACION_ACTIVA).stream()
                .map(AyudanteExamen::getId)
                .map(AyudanteExamenId::getIdambiente)
                .collect(Collectors.toSet());
    }

    /**
     * Verifica que el usuario pueda operar sobre esa aula de examen; si no,
     * audita ACCESO_DENEGADO y lanza 403.
     *
     * @param permiteOperador true solo para operaciones abiertas al operador
     * @param accion          qué intentaba hacer (va al detalle de la auditoría)
     */
    public void verificarAccesoAmbiente(UsuarioActual usuario, Ambiente ambiente, boolean permiteOperador,
                                        String accion, String ip) {
        verificarRol(usuario, permiteOperador, accion, ip);
        if (usuario.esAdmin()) {
            return;
        }

        String mensaje;
        if (usuario.esOperador()) {
            if (operadorTieneAsignado(usuario.idUsuario(), ambiente)) {
                return;
            }
            mensaje = "No tiene asignada esta aula de examen.";
        } else {
            if (esResponsableDelExamen(usuario.idUsuario(), ambiente.getIdExamen())) {
                return;
            }
            // Se distingue el caso de QA ("No es docente de esta materia") del
            // docente que sí es de la materia pero no tiene asignado ese examen.
            mensaje = asignaturasDelDocente(usuario.idUsuario()).contains(ambiente.getIdAsignatura())
                    ? "No es el docente asignado a este examen."
                    : "No es docente de esta materia.";
        }
        registrarAccesoDenegado(usuario, accion + " · examen " + ambiente.getIdExamen()
                + " · aula de examen " + ambiente.getIdAmbiente() + " · " + mensaje, ip);
        throw new AccesoDenegadoException(mensaje);
    }

    /** Solo el rol, sin mirar el examen: ADMINISTRADOR, DOCENTE y (si se permite) OPERADOR. */
    public void verificarRol(UsuarioActual usuario, boolean permiteOperador, String accion, String ip) {
        if (usuario.esAdmin() || usuario.esDocente() || (usuario.esOperador() && permiteOperador)) {
            return;
        }
        String mensaje = "Acceso denegado: su rol no tiene permiso para esta acción.";
        registrarAccesoDenegado(usuario, accion + " · " + mensaje, ip);
        throw new AccesoDenegadoException(mensaje);
    }

    public void registrarAccesoDenegado(UsuarioActual usuario, String detalles, String ip) {
        auditoriaService.registrar("ACCESO_DENEGADO", usuario.correo(), usuario.correo(),
                "Rol " + usuario.rol() + " · " + detalles, ip);
    }

    private boolean esResponsableDelExamen(Integer idUsuario, Integer idExamen) {
        return examenRepository.findById(idExamen)
                .map(e -> idUsuario.equals(e.getIdUsuario()))
                .orElse(false);
    }

    private boolean operadorTieneAsignado(Integer idUsuario, Ambiente ambiente) {
        AyudanteExamenId id = new AyudanteExamenId(idUsuario, ambiente.getIdAsignatura(),
                ambiente.getIdExamen(), ambiente.getIdAmbiente());
        return ayudanteExamenRepository.findById(id)
                .map(a -> ASIGNACION_ACTIVA.equals(a.getEstadoAsignacion()))
                .orElse(false);
    }

    private Set<Integer> asignaturasDelDocente(Integer idUsuario) {
        List<Integer> ids = docenteAsignaturaRepository.findByIdIdusuario(idUsuario).stream()
                .map(da -> da.getId().getIdasignatura())
                .toList();
        return Set.copyOf(ids);
    }
}
