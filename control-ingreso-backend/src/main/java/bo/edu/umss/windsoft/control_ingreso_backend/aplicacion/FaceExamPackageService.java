package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceEnrollmentRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceExamPackageStudentDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class FaceExamPackageService {
    private static final String ACTIVO = "ACTIVO";
    private final ContextoUsuarioService contextoUsuarioService;
    private final ExamenRepository examenRepository;
    private final AyudanteExamenRepository ayudanteExamenRepository;
    private final HabilitacionRepository habilitacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final FaceEnrollmentRepository enrollmentRepository;
    private final AsignacionIngresoService asignacionIngresoService;
    private final AmbienteRepository ambienteRepository;

    public FaceExamPackageService(ContextoUsuarioService contextoUsuarioService, ExamenRepository examenRepository,
                                  AyudanteExamenRepository ayudanteExamenRepository,
                                  HabilitacionRepository habilitacionRepository, UsuarioRepository usuarioRepository,
                                  FaceEnrollmentRepository enrollmentRepository,
                                  AsignacionIngresoService asignacionIngresoService,
                                  AmbienteRepository ambienteRepository) {
        this.contextoUsuarioService = contextoUsuarioService;
        this.examenRepository = examenRepository;
        this.ayudanteExamenRepository = ayudanteExamenRepository;
        this.habilitacionRepository = habilitacionRepository;
        this.usuarioRepository = usuarioRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.asignacionIngresoService = asignacionIngresoService;
        this.ambienteRepository = ambienteRepository;
    }

    public List<FaceExamPackageStudentDto> obtenerPaquete(Integer idExamen) {
        ContextoUsuarioService.UsuarioActual actual = contextoUsuarioService.actual();
        var examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Examen no encontrado."));
        List<AyudanteExamen> asignaciones = List.of();
        if (actual.esDocente() || actual.esAdmin()) {
            // El docente o administrador puede descargar la nómina completa del examen
        } else if (actual.esOperador()) {
            asignaciones = ayudanteExamenRepository.findByIdIdayudanteAndEstadoAsignacion(actual.idUsuario(), ACTIVO)
                    .stream().filter(a -> idExamen.equals(a.getId().getIdexamen())).toList();
            // Si no se encuentra por idayudante = idUsuario, se busca si hay asignación vinculada al examen
            if (asignaciones.isEmpty()) {
                asignaciones = ayudanteExamenRepository.findAll().stream()
                        .filter(a -> idExamen.equals(a.getId().getIdexamen()) && ACTIVO.equalsIgnoreCase(a.getEstadoAsignacion()))
                        .filter(a -> actual.idUsuario().equals(a.getId().getIdayudante()))
                        .toList();
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Rol no autorizado para descargar el paquete facial.");
        }

        Map<Integer, Integer> ambientePorSis = asignacionIngresoService.obtenerListaOficial(idExamen, null).stream()
                .filter(dto -> Boolean.TRUE.equals(dto.getHabilitado()))
                .filter(dto -> dto.getCodSisEstudiante() != null && dto.getIdAmbiente() != null)
                .collect(Collectors.toMap(EstudianteListaOficialDTO::getCodSisEstudiante,
                        EstudianteListaOficialDTO::getIdAmbiente, (primero, segundo) -> primero));
        List<Habilitacion> habilitados = habilitacionRepository
                .findHabilitadosConEstudiante(examen.getIdAsignatura(), idExamen);
        Set<Integer> idsEstudiante = habilitados.stream().map(h -> h.getEstudiante().getIdusuario())
                .collect(Collectors.toSet());
        Map<Integer, Usuario> usuarios = usuarioRepository.findAllById(idsEstudiante).stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, u -> u));
        Map<Integer, FaceEnrollment> enrolamientos = enrollmentRepository
                .findByIdUsuarioInAndEstado(idsEstudiante, "activo").stream()
                .collect(Collectors.toMap(FaceEnrollment::getIdUsuario, e -> e));

        Integer primerAmbiente = ambienteRepository.findByIdExamen(idExamen).stream()
                .map(Ambiente::getIdAmbiente)
                .findFirst()
                .orElse(null);

        List<FaceExamPackageStudentDto> paquete = habilitados.stream()
                .map(h -> {
                    Integer idAmb = ambientePorSis.get(h.getEstudiante().getCodsisestudiante());
                    if (idAmb == null) idAmb = primerAmbiente;
                    return aDto(h, usuarios.get(h.getEstudiante().getIdusuario()),
                            idAmb,
                            enrolamientos.get(h.getEstudiante().getIdusuario()));
                })
                .filter(dto -> dto.idAmbiente() != null)
                .toList();
        if (actual.esOperador() && !asignaciones.isEmpty()) {
            return filtrarOperador(paquete, asignaciones);
        }
        return paquete;
    }

    private FaceExamPackageStudentDto aDto(Habilitacion habilitacion, Usuario usuario, Integer idAmbiente,
                                           FaceEnrollment enrollment) {
        String nombres = usuario == null || usuario.getNombreusuario() == null ? "" : usuario.getNombreusuario().trim();
        String apellidos = usuario == null || usuario.getApellidousuario() == null ? "" : usuario.getApellidousuario().trim();
        String apellidoPaterno = apellidos.isBlank() ? "" : apellidos.split("\\s+")[0];
        return new FaceExamPackageStudentDto(habilitacion.getEstudiante().getIdusuario(),
                habilitacion.getEstudiante().getCodsisestudiante(), (nombres + " " + apellidos).trim(),
                apellidoPaterno, idAmbiente, enrollment == null ? null : enrollment.getEmbedding(), enrollment == null);
    }

    private List<FaceExamPackageStudentDto> filtrarOperador(List<FaceExamPackageStudentDto> paquete,
                                                            List<AyudanteExamen> asignaciones) {
        return paquete.stream().filter(estudiante -> asignaciones.stream().anyMatch(asignacion -> {
            if (!estudiante.idAmbiente().equals(asignacion.getId().getIdambiente())) return false;
            if ("ONLINE".equalsIgnoreCase(asignacion.getModoAsignacion())) return true;
            String inicial = inicialNormalizada(estudiante.apellidoPaterno());
            String desde = inicialNormalizada(asignacion.getApellidoDesde());
            String hasta = inicialNormalizada(asignacion.getApellidoHasta());
            return inicial != null && desde != null && hasta != null
                    && inicial.compareTo(desde) >= 0 && inicial.compareTo(hasta) <= 0;
        })).toList();
    }

    /** Quita tildes pero conserva Ñ para respetar los rangos de asignación. */
    private String inicialNormalizada(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String inicial = valor.trim().substring(0, 1).toUpperCase(Locale.ROOT);
        if ("Ñ".equals(inicial)) return "Ñ";
        return Normalizer.normalize(inicial, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }
}
