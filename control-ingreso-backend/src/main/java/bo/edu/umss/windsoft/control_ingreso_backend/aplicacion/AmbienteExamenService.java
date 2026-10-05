package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService.UsuarioActual;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AforoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AmbienteControlDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Datos de las aulas de un examen ("ambiente") que comparten la HU06 y la HU10:
 * nombres, aforo, si el ingreso está cerrado y qué aulas puede ver cada rol.
 */
@Service
public class AmbienteExamenService {

    public record AmbienteInfo(Ambiente ambiente, String aula, String asignatura, LocalDate fechaExamen) {
    }

    public record EstadoIngresoAula(boolean cerrado, String motivo) {
    }

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final AmbienteRepository ambienteRepository;
    private final AulaRepository aulaRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final ExamenRepository examenRepository;
    private final IngresoRepository ingresoRepository;
    private final ContextoUsuarioService contextoUsuarioService;

    public AmbienteExamenService(AmbienteRepository ambienteRepository, AulaRepository aulaRepository,
                                 AsignaturaRepository asignaturaRepository, ExamenRepository examenRepository,
                                 IngresoRepository ingresoRepository, ContextoUsuarioService contextoUsuarioService) {
        this.ambienteRepository = ambienteRepository;
        this.aulaRepository = aulaRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.examenRepository = examenRepository;
        this.ingresoRepository = ingresoRepository;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    public Ambiente obtener(Integer idAmbiente) {
        if (idAmbiente == null) {
            throw new RecursoNoEncontradoException("Debe indicar el aula del examen.");
        }
        return ambienteRepository.findById(idAmbiente)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el aula de examen con ID " + idAmbiente + "."));
    }

    public AmbienteInfo describir(Ambiente ambiente) {
        return describir(List.of(ambiente)).get(ambiente.getIdAmbiente());
    }

    /** Nombres de aula/asignatura y fecha del examen, en pocas consultas. */
    public Map<Integer, AmbienteInfo> describir(Collection<Ambiente> ambientes) {
        Set<Integer> idsAula = ambientes.stream().map(Ambiente::getIdAula).collect(Collectors.toSet());
        Set<Integer> idsAsignatura = ambientes.stream().map(Ambiente::getIdAsignatura).collect(Collectors.toSet());
        Set<Integer> idsExamen = ambientes.stream().map(Ambiente::getIdExamen).collect(Collectors.toSet());

        Map<Integer, String> aulas = aulaRepository.findAllById(idsAula).stream()
                .collect(Collectors.toMap(Aula::getIdAula, Aula::getNombreAula));
        Map<Integer, String> asignaturas = asignaturaRepository.findAllById(idsAsignatura).stream()
                .collect(Collectors.toMap(Asignatura::getIdAsignatura, Asignatura::getNombreAsignatura));
        Map<Integer, Examen> examenes = examenRepository.findAllById(idsExamen).stream()
                .collect(Collectors.toMap(Examen::getIdExamen, Function.identity()));

        return ambientes.stream().collect(Collectors.toMap(Ambiente::getIdAmbiente, a -> {
            Examen examen = examenes.get(a.getIdExamen());
            return new AmbienteInfo(a, aulas.get(a.getIdAula()), asignaturas.get(a.getIdAsignatura()),
                    examen == null ? null : examen.getFechaExamen());
        }, (x, y) -> x));
    }

    public AforoDto aforo(Integer idAmbiente) {
        long ocupados = ingresoRepository.countByIdAmbienteAndIdExpulsionIsNull(idAmbiente);
        Integer capacidad = ingresoRepository.obtenerCapacidadAmbiente(idAmbiente);
        Integer disponibles = capacidad == null ? null : (int) Math.max(0, capacidad - ocupados);
        return new AforoDto(ocupados, capacidad, disponibles);
    }

    /**
     * El ingreso solo está abierto el día del examen y hasta la hora de fin del
     * aula. (El cierre manual de un aula llega con la HU10.)
     */
    public EstadoIngresoAula estadoIngreso(AmbienteInfo info) {
        LocalDate fecha = info.fechaExamen();
        if (fecha == null) {
            return new EstadoIngresoAula(false, null);
        }
        LocalDateTime ahora = HoraOficial.ahora();
        LocalDate hoy = ahora.toLocalDate();
        if (hoy.isBefore(fecha)) {
            return new EstadoIngresoAula(true,
                    "El examen es el " + fecha.format(FORMATO_FECHA) + "; el ingreso todavía no está habilitado.");
        }
        boolean pasoLaHora = info.ambiente().getHoraFin() != null
                && ahora.toLocalTime().isAfter(info.ambiente().getHoraFin());
        if (hoy.isAfter(fecha) || pasoLaHora) {
            String fin = info.ambiente().getHoraFin() == null ? "" : " (fin: " + info.ambiente().getHoraFin().format(FORMATO_HORA) + ")";
            return new EstadoIngresoAula(true, "El ingreso a este examen ya cerró" + fin + ".");
        }
        return new EstadoIngresoAula(false, null);
    }

    /**
     * Aulas que el usuario puede ver, con filtros opcionales. Un docente que
     * pide explícitamente un examen o aula de otra materia recibe 403 (y queda
     * auditado); sin filtros, simplemente ve solo las suyas.
     */
    public List<Ambiente> ambientesVisibles(UsuarioActual usuario, Integer idExamen, Integer idAmbiente,
                                            boolean permiteOperador, String accion, String ip) {
        // El rol se verifica antes que nada: si no, un operador que pide un
        // examen sin aulas recibiría una lista vacía en vez de un 403.
        contextoUsuarioService.verificarRol(usuario, permiteOperador, accion, ip);

        if (idAmbiente != null) {
            Ambiente ambiente = obtener(idAmbiente);
            contextoUsuarioService.verificarAccesoMateria(usuario, ambiente.getIdAsignatura(), permiteOperador, accion, ip);
            return List.of(ambiente);
        }

        if (idExamen != null) {
            List<Ambiente> delExamen = ambienteRepository.findByIdExamen(idExamen);
            if (!delExamen.isEmpty()) {
                contextoUsuarioService.verificarAccesoMateria(usuario, delExamen.get(0).getIdAsignatura(),
                        permiteOperador, accion, ip);
            }
            return delExamen;
        }

        if (usuario.esAdmin() || (usuario.esOperador() && permiteOperador)) {
            return ambienteRepository.findAll();
        }
        // Solo queda el docente (verificarRol ya descartó los demás casos).
        return contextoUsuarioService.asignaturasDelDocente(usuario.idUsuario()).stream()
                .flatMap(idAsignatura -> ambienteRepository.findByIdAsignatura(idAsignatura).stream())
                .toList();
    }

    /** Aulas de los exámenes de una fecha (por defecto hoy) que el usuario puede operar. */
    @Transactional(readOnly = true)
    public List<AmbienteControlDto> listarDelDia(UsuarioActual usuario, LocalDate fecha, boolean permiteOperador, String ip) {
        LocalDate dia = fecha == null ? HoraOficial.hoy() : fecha;
        List<Ambiente> visibles = ambientesVisibles(usuario, null, null, permiteOperador, "Listar aulas del día", ip);

        return describir(visibles).values().stream()
                .filter(info -> dia.equals(info.fechaExamen()))
                .sorted(Comparator.comparing((AmbienteInfo i) -> i.ambiente().getHoraInicio(),
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(AmbienteInfo::aula, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(info -> {
                    EstadoIngresoAula estado = estadoIngreso(info);
                    Ambiente a = info.ambiente();
                    return new AmbienteControlDto(a.getIdAmbiente(), a.getIdAsignatura(), info.asignatura(),
                            a.getIdExamen(), info.fechaExamen(), info.aula(), a.getHoraInicio(), a.getHoraFin(),
                            aforo(a.getIdAmbiente()), estado.cerrado(), estado.motivo());
                })
                .toList();
    }
}
