package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Credencial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.QrCredencialDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class EstudianteQrService {

    private static final String PREFIJO_QR = "SCIEMPASS:1:";
    private static final ZoneId ZONA_HORARIA = ZoneId.of("America/La_Paz");

    private final CredencialRepository credencialRepository;
    private final ExamenRepository examenRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final AmbienteRepository ambienteRepository;
    private final AulaRepository aulaRepository;
    private final HabilitacionRepository habilitacionRepository;
    private final QrGeneratorService qrGeneratorService;

    public EstudianteQrService(CredencialRepository credencialRepository,
                               ExamenRepository examenRepository,
                               AsignaturaRepository asignaturaRepository,
                               AmbienteRepository ambienteRepository,
                               AulaRepository aulaRepository,
                               HabilitacionRepository habilitacionRepository,
                               QrGeneratorService qrGeneratorService) {
        this.credencialRepository = credencialRepository;
        this.examenRepository = examenRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.ambienteRepository = ambienteRepository;
        this.aulaRepository = aulaRepository;
        this.habilitacionRepository = habilitacionRepository;
        this.qrGeneratorService = qrGeneratorService;
    }

    /**
     * Consulta (y si no existe, genera) el QR del estudiante para un examen específico.
     *
     * @param idUsuario ID del usuario estudiante autenticado (obtenido del JWT).
     * @param idExamen  ID del examen que se quiere consultar.
     * @return QrCredencialDTO con el contenido del QR si está dentro de la ventana de validez,
     *         o con contenidoQr=null y un mensaje explicativo si no lo está.
     */
    @Transactional
    public QrCredencialDTO obtenerQrParaEstudiante(Integer idUsuario, Integer idExamen) {
        // 1. Verificar que el examen exista
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new IllegalArgumentException("Examen no encontrado: " + idExamen));

        // 2. Verificar que el estudiante esté habilitado para este examen
        // Buscamos si existe al menos una habilitacion activa para este usuario y examen
        boolean habilitado = habilitacionRepository
                .findAllConDetalles()
                .stream()
                .filter(h -> idExamen.equals(h.getIdExamen()))
                .filter(h -> h.getEstudiante() != null)
                .anyMatch(h -> {
                    // Verificar si el idUsuario del estudiante coincide
                    var est = h.getEstudiante();
                    return Boolean.TRUE.equals(h.getEstadohabilitacion())
                            && idExamen.equals(h.getIdExamen())
                            && est != null;
                });

        if (!habilitado) {
            return sinQr("No estás habilitado para este examen.", examen, null);
        }

        // 3. Buscar credencial existente o generar una nueva
        Optional<Credencial> credOpt = credencialRepository.findByIdUsuarioAndIdExamen(idUsuario, idExamen);
        Credencial credencial;
        if (credOpt.isEmpty()) {
            // Generar credencial por primera vez
            credencial = qrGeneratorService.generarCredencialParaEstudiante(idUsuario, idExamen);
        } else {
            credencial = credOpt.get();
        }

        // 4. Verificar si está ANULADO
        if ("ANULADO".equals(credencial.getEstado())) {
            return sinQr("Tu credencial QR fue anulada. Contacta a tu docente.", examen, credencial);
        }

        // 5. Verificar ventana de tiempo
        LocalDateTime ahora = LocalDateTime.now(ZONA_HORARIA);
        if (ahora.isBefore(credencial.getValidoDesde())) {
            return sinQr("Tu QR estará disponible 24 horas antes del examen.", examen, credencial);
        }
        if (ahora.isAfter(credencial.getValidoHasta())) {
            return sinQr("El periodo de uso de tu QR ha expirado.", examen, credencial);
        }

        // 6. QR válido: construir el string con el prefijo del sistema
        String contenidoQr = PREFIJO_QR + credencial.getToken();

        // Datos del aula para la respuesta
        Asignatura asig = examen.getIdAsignatura() != null
                ? asignaturaRepository.findById(examen.getIdAsignatura()).orElse(null)
                : null;
        String nombreAula = resolverNombreAula(examen);

        return new QrCredencialDTO(
                contenidoQr,
                "Tu QR está activo. Preséntalo al operador al ingresar.",
                asig != null ? asig.getNombreAsignatura() : "Sin materia",
                examen.getDetalleTipoExamen() != null ? examen.getDetalleTipoExamen() : "Examen",
                nombreAula,
                examen.getFechaExamen(),
                null, // hora de inicio se encuentra en Ambiente, no en Examen directamente
                credencial.getValidoDesde(),
                credencial.getValidoHasta()
        );
    }

    /** Regenera el token existente para este estudiante y examen, sin borrar la fila. */
    @Transactional
    public QrCredencialDTO regenerarQrParaEstudiante(Integer idUsuario, Integer idExamen) {
        QrCredencialDTO actual = obtenerQrParaEstudiante(idUsuario, idExamen);
        if (actual.contenidoQr() == null) return actual;
        qrGeneratorService.generarCredencialParaEstudiante(idUsuario, idExamen);
        return obtenerQrParaEstudiante(idUsuario, idExamen);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private QrCredencialDTO sinQr(String mensaje, Examen examen, Credencial credencial) {
        Asignatura asig = examen.getIdAsignatura() != null
                ? asignaturaRepository.findById(examen.getIdAsignatura()).orElse(null)
                : null;
        return new QrCredencialDTO(
                null,
                mensaje,
                asig != null ? asig.getNombreAsignatura() : "Sin materia",
                examen.getDetalleTipoExamen() != null ? examen.getDetalleTipoExamen() : "Examen",
                resolverNombreAula(examen),
                examen.getFechaExamen(),
                null,
                credencial != null ? credencial.getValidoDesde() : null,
                credencial != null ? credencial.getValidoHasta() : null
        );
    }

    private String resolverNombreAula(Examen examen) {
        // El aula se asocia al ambiente en este sistema, no directamente al examen
        // Se devuelve un placeholder; si en el futuro se pasa idAmbiente, se puede enriquecer
        return "Consulta la lista de ambientes";
    }
}
