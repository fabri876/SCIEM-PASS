package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Quién está haciendo la petición y a qué materias tiene acceso (HU06/HU10).
 *
 * - ADMINISTRADOR: todas las materias.
 * - DOCENTE: solo las que tiene en docenteasignatura.
 * - OPERADOR: solo donde la operación lo permite (registrar incidencias).
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

    private final DocenteAsignaturaRepository docenteAsignaturaRepository;
    private final AuditoriaService auditoriaService;

    public ContextoUsuarioService(DocenteAsignaturaRepository docenteAsignaturaRepository,
                                  AuditoriaService auditoriaService) {
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
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

    public Set<Integer> asignaturasDelDocente(Integer idUsuario) {
        return docenteAsignaturaRepository.findByIdIdusuario(idUsuario).stream()
                .map(da -> da.getId().getIdasignatura())
                .collect(Collectors.toSet());
    }

    /**
     * Verifica que el usuario pueda operar sobre la materia; si no, audita
     * ACCESO_DENEGADO y lanza 403.
     *
     * @param permiteOperador true solo para operaciones abiertas al operador
     * @param accion          qué intentaba hacer (va al detalle de la auditoría)
     */
    public void verificarAccesoMateria(UsuarioActual usuario, Integer idAsignatura, boolean permiteOperador,
                                       String accion, String ip) {
        verificarRol(usuario, permiteOperador, accion, ip);
        if (!usuario.esDocente() || asignaturasDelDocente(usuario.idUsuario()).contains(idAsignatura)) {
            return;
        }
        String mensaje = "No es docente de esta materia.";
        registrarAccesoDenegado(usuario, accion + " · asignatura " + idAsignatura + " · " + mensaje, ip);
        throw new AccesoDenegadoException(mensaje);
    }

    /** Solo el rol, sin mirar la materia: ADMINISTRADOR, DOCENTE y (si se permite) OPERADOR. */
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
}
