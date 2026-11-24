package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService.UsuarioActual;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
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
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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

    /**
     * Desfase de reloj tolerado entre el dispositivo y el servidor (HU21).
     * Los registros creados sin conexión se validan contra la marca de tiempo
     * del dispositivo, así que se admite un margen de 15 minutos.
     */
    public static final int TOLERANCIA_RELOJ_MINUTOS = 15;

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
     * Aulas de examen que el usuario tiene asignadas, con filtros opcionales.
     * Si pide explícitamente un examen o aula que no tiene asignado recibe 403
     * (y queda auditado); sin filtros, simplemente ve solo lo suyo.
     */
    public List<Ambiente> ambientesVisibles(UsuarioActual usuario, Integer idExamen, Integer idAmbiente,
                                            boolean permiteOperador, String accion, String ip) {
        // El rol se verifica antes que nada: si no, un operador que pide un
        // examen sin aulas recibiría una lista vacía en vez de un 403.
        contextoUsuarioService.verificarRol(usuario, permiteOperador, accion, ip);

        if (idAmbiente != null) {
            Ambiente ambiente = obtener(idAmbiente);
            contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, permiteOperador, accion, ip);
            return List.of(ambiente);
        }

        if (idExamen != null) {
            List<Ambiente> delExamen = ambienteRepository.findByIdExamen(idExamen);
            if (delExamen.isEmpty() || usuario.esAdmin()) {
                return delExamen;
            }
            if (usuario.esOperador()) {
                Set<Integer> asignadas = contextoUsuarioService.ambientesDelOperador(usuario.idUsuario());
                List<Ambiente> suyas = delExamen.stream().filter(a -> asignadas.contains(a.getIdAmbiente())).toList();
                if (suyas.isEmpty()) {
                    // Audita y lanza 403.
                    contextoUsuarioService.verificarAccesoAmbiente(usuario, delExamen.get(0), permiteOperador, accion, ip);
                }
                return suyas;
            }
            // Docente: si es responsable del examen, todas sus aulas.
            contextoUsuarioService.verificarAccesoAmbiente(usuario, delExamen.get(0), permiteOperador, accion, ip);
            return delExamen;
        }

        if (usuario.esAdmin()) {
            return ambienteRepository.findAll();
        }
        if (usuario.esOperador()) {
            return ambienteRepository.findAllById(contextoUsuarioService.ambientesDelOperador(usuario.idUsuario()));
        }
        // Solo queda el docente (verificarRol ya descartó los demás casos).
        Set<Integer> examenes = contextoUsuarioService.examenesDelDocente(usuario.idUsuario());
        return examenes.isEmpty() ? List.of() : ambienteRepository.findByIdExamenIn(new ArrayList<>(examenes));
    }

    /** Aulas de los exámenes de una fecha (por defecto hoy) que el usuario tiene asignadas. */
    @Transactional(readOnly = true)
    public List<AmbienteControlDto> listarDelDia(UsuarioActual usuario, LocalDate fecha, boolean permiteOperador, String ip) {
        LocalDate dia = fecha == null ? HoraOficial.hoy() : fecha;
        List<Ambiente> visibles = ambientesVisibles(usuario, null, null, permiteOperador, "Listar aulas del día", ip);

        return describir(visibles).values().stream()
                .filter(info -> dia.equals(info.fechaExamen()))
                .filter(this::examenNoCancelado)
                .sorted(Comparator.comparing((AmbienteInfo i) -> i.ambiente().getHoraInicio(),
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(AmbienteInfo::aula, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::aDto)
                .toList();
    }

    /**
     * Aulas de todos los exámenes asignados que ya se tomaron o se toman hoy.
     * Las incidencias se pueden registrar después del examen (recomendación
     * de la ingeniera), así que aquí no se limita a la fecha de hoy.
     * Orden: los exámenes más recientes primero.
     */
    @Transactional(readOnly = true)
    public List<AmbienteControlDto> listarAsignadas(UsuarioActual usuario, String ip) {
        LocalDate hoy = HoraOficial.hoy();
        List<Ambiente> visibles = ambientesVisibles(usuario, null, null, true, "Listar aulas asignadas", ip);

        return describir(visibles).values().stream()
                .filter(info -> info.fechaExamen() == null || !info.fechaExamen().isAfter(hoy))
                .filter(this::examenNoCancelado)
                .sorted(Comparator.comparing(AmbienteInfo::fechaExamen, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(i -> i.ambiente().getHoraInicio(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(AmbienteInfo::aula, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::aDto)
                .toList();
    }

    /** No se registran incidencias de un examen que todavía no se tomó. */
    public void verificarExamenYaIniciado(AmbienteInfo info) {
        if (info.fechaExamen() != null && info.fechaExamen().isAfter(HoraOficial.hoy())) {
            throw new ConflictoEstadoException("El examen es el " + info.fechaExamen().format(FORMATO_FECHA)
                    + "; todavía no se pueden registrar incidencias.");
        }
    }

    /**
     * Valida que el examen del ambiente no esté cancelado. Si lo está, se
     * impide registrar cualquier incidencia, ingreso excepcional o expulsión.
     */
    public void verificarExamenNoCancelado(AmbienteInfo info) {
        Ambiente ambiente = info.ambiente();
        Examen examen = examenRepository.findById(ambiente.getIdExamen())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el examen con ID " + ambiente.getIdExamen() + "."));
        if (Boolean.TRUE.equals(examen.getCancelado())) {
            throw new ConflictoEstadoException("Este examen fue cancelado.");
        }
    }

    /**
     * Valida la hora del evento tomada en el dispositivo (HU21).
     *
     * Un registro creado sin conexión se sincroniza días después, así que no se
     * puede comparar con la hora del servidor: se compara con la fecha y el
     * horario del examen. Se tolera un desfase de reloj de hasta
     * {@link #TOLERANCIA_RELOJ_MINUTOS} minutos.
     *
     * Es la validación estricta: el evento tiene que ser DEL DÍA del examen y
     * anterior a su cierre. La usan los registros que solo pueden hacerse
     * mientras el examen está en curso (ingreso excepcional).
     */
    public void verificarHoraEventoOffline(AmbienteInfo info, LocalDateTime horaEvento) {
        if (horaEvento == null) {
            return;
        }
        LocalDate fechaExamen = info.fechaExamen();
        if (fechaExamen != null && !fechaExamen.equals(horaEvento.toLocalDate())) {
            throw new ConflictoEstadoException(
                    "El registro offline no corresponde a la fecha de este examen (" + fechaExamen + ").");
        }
        LocalTime horaFin = info.ambiente().getHoraFin();
        if (horaFin != null && horaEvento.toLocalTime().isAfter(horaFin.plusMinutes(TOLERANCIA_RELOJ_MINUTOS))) {
            throw new ConflictoEstadoException(
                    "El registro offline es posterior al cierre del examen (fin: " + horaFin + ").");
        }
    }

    /**
     * Validación laxa de la hora del dispositivo (HU21) para los registros que
     * también se pueden hacer DESPUÉS del examen (una incidencia, por ejemplo:
     * el mismo criterio que en línea, "el examen ya se tomó").
     *
     * Solo descarta las marcas imposibles: una fecha anterior al examen o una
     * fecha futura (reloj del dispositivo desajustado).
     */
    public void verificarFechaEventoOffline(AmbienteInfo info, LocalDateTime horaEvento) {
        if (horaEvento == null) {
            return;
        }
        LocalDate fechaExamen = info.fechaExamen();
        if (fechaExamen != null && horaEvento.toLocalDate().isBefore(fechaExamen)) {
            throw new ConflictoEstadoException(
                    "El registro offline es anterior a la fecha de este examen (" + fechaExamen + ").");
        }
        if (horaEvento.isAfter(HoraOficial.ahora().plusMinutes(TOLERANCIA_RELOJ_MINUTOS))) {
            throw new ConflictoEstadoException(
                    "El registro offline tiene una fecha futura: revisa la hora y la fecha del dispositivo.");
        }
    }

    /**
     * true si el examen del ambiente no está cancelado (incluye nulo/desconocido
     * como "no cancelado" para no bloquear exámenes sin registro de cancelación).
     */
    private boolean examenNoCancelado(AmbienteInfo info) {
        Ambiente ambiente = info.ambiente();
        Examen examen = examenRepository.findById(ambiente.getIdExamen())
                .orElse(null);
        return examen == null || !Boolean.TRUE.equals(examen.getCancelado());
    }

    private AmbienteControlDto aDto(AmbienteInfo info) {
        EstadoIngresoAula estado = estadoIngreso(info);
        Ambiente a = info.ambiente();
        return new AmbienteControlDto(a.getIdAmbiente(), a.getIdAsignatura(), info.asignatura(),
                a.getIdExamen(), info.fechaExamen(), info.aula(), a.getHoraInicio(), a.getHoraFin(),
                aforo(a.getIdAmbiente()), estado.cerrado(), estado.motivo());
    }
}
