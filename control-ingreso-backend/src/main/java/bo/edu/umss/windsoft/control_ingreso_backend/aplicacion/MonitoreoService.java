package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService.AmbienteInfo;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService.EstadoIngresoAula;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionAulaService.AulaExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionAulaService.EstudianteHabilitado;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionAulaService.Reparto;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService.UsuarioActual;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.CambioAmbiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CambioAmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoNoAutorizadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AlertaDesubicadoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsistenteAulaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsistentesAulaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AulaMonitoreoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenMonitoreoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.LlegadaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MetricasMonitoreoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReubicacionDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.TableroMonitoreoDto;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * HU10 · Dashboard de monitoreo de asistencia y control de aulas.
 *
 * - Ver el dashboard: DOCENTE (exámenes de los que es responsable) y ADMINISTRADOR (todos).
 * - "Reubicar y Autorizar": EXCLUSIVO del DOCENTE responsable del examen.
 * - El dashboard solo lee; se consulta cada 15 s desde el frontend (polling),
 *   por eso solo se audita la apertura y las reubicaciones, no cada consulta.
 */
@Service
public class MonitoreoService {

    private static final double UMBRAL_OCUPACION_ALTA = 70.0;
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final AsignacionAulaService asignacionAulaService;
    private final AmbienteExamenService ambienteExamenService;
    private final ContextoUsuarioService contextoUsuarioService;
    private final IngresoRepository ingresoRepository;
    private final IntentoNoAutorizadoRepository intentoRepository;
    private final CambioAmbienteRepository cambioAmbienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final ExamenRepository examenRepository;
    private final AuditoriaService auditoriaService;
    private final TransactionTemplate transaccion;

    public MonitoreoService(AsignacionAulaService asignacionAulaService, AmbienteExamenService ambienteExamenService,
                            ContextoUsuarioService contextoUsuarioService, IngresoRepository ingresoRepository,
                            IntentoNoAutorizadoRepository intentoRepository,
                            CambioAmbienteRepository cambioAmbienteRepository, UsuarioRepository usuarioRepository,
                            ExamenRepository examenRepository,
                            AuditoriaService auditoriaService, PlatformTransactionManager transactionManager) {
        this.asignacionAulaService = asignacionAulaService;
        this.ambienteExamenService = ambienteExamenService;
        this.contextoUsuarioService = contextoUsuarioService;
        this.ingresoRepository = ingresoRepository;
        this.intentoRepository = intentoRepository;
        this.cambioAmbienteRepository = cambioAmbienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.examenRepository = examenRepository;
        this.auditoriaService = auditoriaService;
        this.transaccion = new TransactionTemplate(transactionManager);
    }

    // -------------------------------------------------------------------------
    // EXÁMENES DEL SELECTOR
    // -------------------------------------------------------------------------

    /** Exámenes que el usuario puede monitorear: hoy primero, luego los próximos y al final los pasados. */
    @Transactional(readOnly = true)
    public List<ExamenMonitoreoDto> listarExamenes(String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        List<Ambiente> ambientes = ambienteExamenService.ambientesVisibles(usuario, null, null, false,
                "Abrir monitoreo", ip);
        Map<Integer, AmbienteInfo> infos = ambienteExamenService.describir(ambientes);

        Map<Integer, List<AmbienteInfo>> porExamen = infos.values().stream()
                .collect(Collectors.groupingBy(i -> i.ambiente().getIdExamen()));
        LocalDate hoy = HoraOficial.hoy();
        LocalTime ahora = HoraOficial.ahora().toLocalTime();

        List<ExamenMonitoreoDto> examenes = porExamen.values().stream().map(aulas -> {
            AmbienteInfo primera = aulas.get(0);
            LocalTime inicio = aulas.stream().map(a -> a.ambiente().getHoraInicio()).filter(Objects::nonNull)
                    .min(Comparator.naturalOrder()).orElse(null);
            LocalTime fin = aulas.stream().map(a -> a.ambiente().getHoraFin()).filter(Objects::nonNull)
                    .max(Comparator.naturalOrder()).orElse(null);
            boolean enCurso = hoy.equals(primera.fechaExamen()) && inicio != null && fin != null
                    && !ahora.isBefore(inicio) && !ahora.isAfter(fin);
            return new ExamenMonitoreoDto(primera.ambiente().getIdExamen(), primera.ambiente().getIdAsignatura(),
                    primera.asignatura(), primera.fechaExamen(), inicio, fin, aulas.size(), enCurso);
        }).sorted(ordenExamenes(hoy)).toList();

        auditoriaService.registrar("MONITOREO_ACCESO", usuario.correo(), usuario.correo(),
                "Abrió el dashboard de monitoreo · " + examenes.size() + " examen(es) visibles", ip);
        return examenes;
    }

    private Comparator<ExamenMonitoreoDto> ordenExamenes(LocalDate hoy) {
        // 0 = hoy, 1 = próximos (más cercano primero), 2 = pasados (más reciente primero)
        return Comparator
                .comparingInt((ExamenMonitoreoDto e) -> e.fechaExamen() == null ? 3
                        : e.fechaExamen().equals(hoy) ? 0 : e.fechaExamen().isAfter(hoy) ? 1 : 2)
                .thenComparing(e -> e.fechaExamen() != null && e.fechaExamen().isBefore(hoy)
                        ? -e.fechaExamen().toEpochDay() : (e.fechaExamen() == null ? 0 : e.fechaExamen().toEpochDay()))
                .thenComparing(ExamenMonitoreoDto::horaInicio, Comparator.nullsLast(Comparator.naturalOrder()));
    }

    // -------------------------------------------------------------------------
    // TABLERO (se consulta cada 15 s)
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public TableroMonitoreoDto tablero(Integer idExamen, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        List<Ambiente> ambientes = ambienteExamenService.ambientesVisibles(usuario, idExamen, null, false,
                "Ver dashboard del examen " + idExamen, ip);
        if (ambientes.isEmpty()) {
            throw new RecursoNoEncontradoException("El examen " + idExamen + " no tiene aulas asignadas.");
        }
        AmbienteInfo info = ambienteExamenService.describir(ambientes.get(0));
        Integer idAsignatura = info.ambiente().getIdAsignatura();

        Reparto reparto = asignacionAulaService.repartir(idAsignatura, idExamen);
        List<Ingreso> ingresos = ingresoRepository.findByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(idAsignatura, idExamen);
        Set<Integer> codSisIngresados = ingresos.stream().map(Ingreso::getCodsisEstudiante).collect(Collectors.toSet());
        Map<Integer, Long> ingresadosPorAula = ingresos.stream()
                .collect(Collectors.groupingBy(Ingreso::getIdAmbiente, Collectors.counting()));

        // Aulas
        List<AulaMonitoreoDto> aulas = new ArrayList<>();
        for (AulaExamen aula : reparto.aulas()) {
            int asignados = (int) reparto.asignacion().values().stream().filter(aula.idAmbiente()::equals).count();
            int pendientesAula = (int) reparto.asignacion().entrySet().stream()
                    .filter(e -> aula.idAmbiente().equals(e.getValue()) && !codSisIngresados.contains(e.getKey()))
                    .count();
            aulas.add(armarAula(aula, asignados, ingresadosPorAula.getOrDefault(aula.idAmbiente(), 0L).intValue(),
                    pendientesAula));
        }
        // Más ocupadas primero; las que no tienen capacidad, al final
        aulas.sort(Comparator.comparing(AulaMonitoreoDto::porcentajeOcupacion,
                Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(AulaMonitoreoDto::aula));

        // Alertas de estudiantes desubicados (todavía sin ingresar)
        Map<Integer, AulaMonitoreoDto> aulaPorId = aulas.stream()
                .collect(Collectors.toMap(AulaMonitoreoDto::idAmbiente, a -> a));
        boolean esDocenteResponsable = usuario.esDocente();
        List<AlertaDesubicadoDto> alertas = alertasDesubicados(idAsignatura, idExamen, reparto, codSisIngresados,
                aulaPorId, esDocenteResponsable);

        // Métricas generales
        int habilitados = reparto.habilitados().size();
        int ingresadosHabilitados = (int) reparto.habilitados().keySet().stream().filter(codSisIngresados::contains).count();
        double avance = habilitados == 0 ? 0.0 : redondear(ingresadosHabilitados * 100.0 / habilitados);
        int modoRapido = (int) ingresos.stream().filter(i -> i.getMotivoExcepcion() == MotivoExcepcion.MODO_RAPIDO).count();
        int excepcionales = (int) ingresos.stream().filter(i -> i.getTipoIngreso() == TipoIngreso.EXCEPCIONAL
                && i.getMotivoExcepcion() != MotivoExcepcion.MODO_RAPIDO).count();
        long duplicados = intentoRepository.countByIdAsignaturaAndIdExamenAndMotivo(idAsignatura, idExamen,
                MotivoIntento.DUPLICADO);
        int fueraDeLimite = (int) aulas.stream().filter(AulaMonitoreoDto::fueraDeLimite).count();

        MetricasMonitoreoDto metricas = new MetricasMonitoreoDto(habilitados, ingresos.size(),
                habilitados - ingresadosHabilitados, avance, excepcionales, modoRapido, duplicados, fueraDeLimite, alertas.size());

        return new TableroMonitoreoDto(idExamen, idAsignatura, info.asignatura(), info.fechaExamen(),
                HoraOficial.ahora(), metricas, aulas, alertas);
    }

    private AulaMonitoreoDto armarAula(AulaExamen aula, int asignados, int ingresados, int pendientes) {
        Integer capacidad = aula.capacidad() != null && aula.capacidad() > 0 ? aula.capacidad() : null;
        Integer disponibles = capacidad == null ? null : Math.max(0, capacidad - ingresados);
        Double porcentaje = capacidad == null ? null : redondear(ingresados * 100.0 / capacidad);
        // "Aula Fuera de Límite": alcanzó o superó su capacidad (criterio de QA)
        boolean fuera = capacidad != null && ingresados >= capacidad;
        String nivel = fuera ? "FUERA_DE_LIMITE"
                : porcentaje != null && porcentaje >= UMBRAL_OCUPACION_ALTA ? "ALTA" : "DISPONIBLE";
        return new AulaMonitoreoDto(aula.idAmbiente(), aula.nombre(), aula.ubicacion(), capacidad, asignados,
                ingresados, pendientes, disponibles, porcentaje, fuera, nivel);
    }

    private List<AlertaDesubicadoDto> alertasDesubicados(Integer idAsignatura, Integer idExamen, Reparto reparto,
                                                         Set<Integer> codSisIngresados,
                                                         Map<Integer, AulaMonitoreoDto> aulaPorId,
                                                         boolean esDocente) {
        // Intentos "aula diferente", más reciente primero: una alerta por estudiante
        Map<Integer, IntentoNoAutorizado> ultimoPorEstudiante = new LinkedHashMap<>();
        for (IntentoNoAutorizado intento : intentoRepository.findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(
                idAsignatura, idExamen, MotivoIntento.AMBIENTE_DIFERENTE)) {
            ultimoPorEstudiante.putIfAbsent(intento.getCodsisEstudiante(), intento);
        }

        List<AlertaDesubicadoDto> alertas = new ArrayList<>();
        for (IntentoNoAutorizado intento : ultimoPorEstudiante.values()) {
            Integer codSis = intento.getCodsisEstudiante();
            Optional<AulaExamen> asignada = reparto.aulaDe(codSis);
            // Se resuelve sola si ya ingresó o si ya se lo reubicó al aula donde está
            if (codSisIngresados.contains(codSis) || asignada.isEmpty()
                    || asignada.get().idAmbiente().equals(intento.getIdAmbiente())) {
                continue;
            }
            AulaMonitoreoDto actual = aulaPorId.get(intento.getIdAmbiente());
            if (actual == null) {
                continue;
            }
            Integer cupos = actual.disponibles();
            boolean hayCupo = cupos == null || cupos > 0;
            String motivoNo = !esDocente ? "La reubicación express es una acción exclusiva del docente."
                    : !hayCupo ? "El " + actual.aula() + " no tiene pupitres libres."
                    : null;
            EstudianteHabilitado est = reparto.habilitados().get(codSis);
            alertas.add(new AlertaDesubicadoDto(intento.getIdIntento(), codSis,
                    est != null ? est.nombreCompleto() : "SIS " + codSis, est != null ? est.ci() : null,
                    intento.getHoraIntento(), actual.idAmbiente(), actual.aula(), asignada.get().idAmbiente(),
                    asignada.get().nombre(), asignada.get().ubicacion(), cupos, motivoNo == null, motivoNo));
        }
        return alertas;
    }

    // -------------------------------------------------------------------------
    // LISTA DE UN AULA (detalle del aula)
    // -------------------------------------------------------------------------

    /**
     * Estudiantes asignados al aula (reparto por apellido + reubicaciones) y
     * los que ingresaron en ella sin estar asignados (excepcionales, por ejemplo).
     * Así el docente ve el aula asignada de cada uno y la nueva aula de un reubicado.
     */
    @Transactional(readOnly = true)
    public AsistentesAulaDto asistentes(Integer idAmbiente, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Ambiente ambiente = ambienteExamenService.ambientesVisibles(usuario, null, idAmbiente, false,
                "Ver lista del aula " + idAmbiente, ip).get(0);
        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        Integer idAsignatura = ambiente.getIdAsignatura();
        Integer idExamen = ambiente.getIdExamen();

        Reparto reparto = asignacionAulaService.repartir(idAsignatura, idExamen);
        Map<Integer, String> nombreAulaPorId = reparto.aulas().stream()
                .collect(Collectors.toMap(AulaExamen::idAmbiente, AulaExamen::nombre));
        Map<Integer, Ingreso> ingresoPorEstudiante = new LinkedHashMap<>();
        for (Ingreso ingreso : ingresoRepository.findByIdAsignaturaAndIdExamen(idAsignatura, idExamen)) {
            ingresoPorEstudiante.putIfAbsent(ingreso.getCodsisEstudiante(), ingreso);
        }
        // Reubicación más reciente de cada estudiante (para "Reubicado desde ...")
        Map<Integer, CambioAmbiente> reubicaciones = new LinkedHashMap<>();
        cambioAmbienteRepository.findByIdAmbienteInOrderByFechaHoraCambioAscIdCambioAsc(nombreAulaPorId.keySet())
                .forEach(c -> reubicaciones.put(c.getCodsisEstudiante(), c));

        List<AsistenteAulaDto> asistentes = new ArrayList<>();
        Set<Integer> incluidos = new HashSet<>();

        // 1. Asignados a esta aula, en orden de apellido
        for (EstudianteHabilitado est : reparto.habilitados().values()) {
            if (!idAmbiente.equals(reparto.asignacion().get(est.codSis()))) {
                continue;
            }
            incluidos.add(est.codSis());
            Ingreso ingreso = ingresoPorEstudiante.get(est.codSis());
            List<String> notas = new ArrayList<>();
            CambioAmbiente cambio = reubicaciones.get(est.codSis());
            if (cambio != null && idAmbiente.equals(cambio.getIdAmbiente()) && cambio.getIdAmbienteOrigen() != null) {
                notas.add("Reubicado desde " + nombreAulaPorId.getOrDefault(cambio.getIdAmbienteOrigen(), "otra aula"));
            }
            if (ingreso != null && !idAmbiente.equals(ingreso.getIdAmbiente())) {
                notas.add("Ingresó en " + nombreAulaPorId.getOrDefault(ingreso.getIdAmbiente(), "otra aula"));
            }
            asistentes.add(armarAsistente(est.codSis(), est.nombreCompleto(), est.ci(), ingreso, notas));
        }

        // 2. Ingresaron en esta aula sin estar asignados a ella (excepcionales u otros)
        List<Ingreso> sinAsignar = ingresoPorEstudiante.values().stream()
                .filter(i -> idAmbiente.equals(i.getIdAmbiente()) && !incluidos.contains(i.getCodsisEstudiante()))
                .sorted(Comparator.comparing(Ingreso::getHoraIngreso, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        Map<Integer, Usuario> usuarios = usuarioRepository.findAllById(sinAsignar.stream()
                        .map(Ingreso::getIdUsuarioEstudiante).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Usuario::getIdusuario, u -> u));
        for (Ingreso ingreso : sinAsignar) {
            Usuario u = usuarios.get(ingreso.getIdUsuarioEstudiante());
            EstudianteHabilitado habilitado = reparto.habilitados().get(ingreso.getCodsisEstudiante());
            List<String> notas = new ArrayList<>();
            if (habilitado != null) {
                reparto.aulaDe(ingreso.getCodsisEstudiante())
                        .ifPresent(a -> notas.add("Asignado al " + a.nombre()));
            } else if (ingreso.getTipoIngreso() != TipoIngreso.EXCEPCIONAL) {
                notas.add("No figura en la lista de habilitados");
            }
            asistentes.add(armarAsistente(ingreso.getCodsisEstudiante(),
                    u != null ? (u.getNombreusuario() + " " + u.getApellidousuario()).trim() : "SIS " + ingreso.getCodsisEstudiante(),
                    u != null ? u.getCiusuario() : null, ingreso, notas));
        }

        String docente = examenRepository.findById(idExamen)
                .map(Examen::getIdUsuario).flatMap(usuarioRepository::findById)
                .map(u -> (u.getNombreusuario() + " " + u.getApellidousuario()).trim())
                .orElse(null);
        Integer capacidad = reparto.aula(idAmbiente).map(AulaExamen::capacidad).orElse(null);
        return new AsistentesAulaDto(idAmbiente, idExamen, info.aula(),
                reparto.aula(idAmbiente).map(AulaExamen::ubicacion).orElse(null), docente, capacidad, asistentes);
    }

    private AsistenteAulaDto armarAsistente(Integer codSis, String nombre, String ci, Ingreso ingreso, List<String> notas) {
        if (ingreso == null) {
            return new AsistenteAulaDto(codSis, nombre, ci, "AUSENTE", null, null, unir(notas));
        }
        String estado = ingreso.estaRetirado() ? "RETIRADO"
                : ingreso.getTipoIngreso() == TipoIngreso.EXCEPCIONAL ? "EXCEPCIONAL" : "PRESENTE";
        List<String> todas = new ArrayList<>(notas);
        if (ingreso.getTipoIngreso() == TipoIngreso.EXCEPCIONAL && ingreso.getMotivoExcepcion() != null) {
            todas.add(0, ingreso.getMotivoExcepcion().getEtiqueta());
        }
        String metodo = ingreso.getMetodoIngreso() == MetodoIngreso.ESCANEO ? "QR" : "Manual";
        return new AsistenteAulaDto(codSis, nombre, ci, estado, ingreso.getHoraIngreso(), metodo, unir(todas));
    }

    private static String unir(List<String> notas) {
        return notas.isEmpty() ? null : String.join(" · ", notas);
    }

    /** CSV de la lista del aula (abre bien en Excel). Queda en auditoría. */
    @Transactional(readOnly = true)
    public byte[] asistentesCsv(Integer idAmbiente, String ip) {
        AsistentesAulaDto lista = asistentes(idAmbiente, ip);
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("Código SIS;Estudiante;CI;Estado;Hora;Método;Observación\r\n");
        for (AsistenteAulaDto a : lista.asistentes()) {
            csv.append(celda(a.codSis())).append(';')
                    .append(celda(a.nombre())).append(';')
                    .append(celda(a.ci())).append(';')
                    .append(celda(a.estado())).append(';')
                    .append(celda(a.hora() == null ? null : a.hora().format(FORMATO_HORA))).append(';')
                    .append(celda(a.metodo())).append(';')
                    .append(celda(a.observacion())).append("\r\n");
        }
        UsuarioActual usuario = contextoUsuarioService.actual();
        auditoriaService.registrar("EXPORTACION_ASISTENCIA", usuario.correo(), usuario.correo(),
                "Exportó la lista del " + lista.aula() + " · examen " + lista.idExamen() + " · "
                        + lista.asistentes().size() + " estudiante(s)", ip);
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String celda(Object valor) {
        String texto = valor == null ? "" : valor.toString();
        return "\"" + texto.replace("\"", "\"\"") + "\"";
    }

    // -------------------------------------------------------------------------
    // CURVA DE LLEGADA
    // -------------------------------------------------------------------------

    /** Ingresos vigentes del examen agrupados cada "intervalo" minutos, sin huecos. */
    @Transactional(readOnly = true)
    public List<LlegadaDto> llegadas(Integer idExamen, int intervalo, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        List<Ambiente> ambientes = ambienteExamenService.ambientesVisibles(usuario, idExamen, null, false,
                "Ver curva de llegada del examen " + idExamen, ip);
        if (ambientes.isEmpty()) {
            return List.of();
        }
        int minutos = Math.max(1, Math.min(60, intervalo));
        Map<Integer, Long> porTramo = ingresoRepository
                .findByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(ambientes.get(0).getIdAsignatura(), idExamen).stream()
                .map(Ingreso::getHoraIngreso)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(h -> (h.getHour() * 60 + h.getMinute()) / minutos, Collectors.counting()));
        if (porTramo.isEmpty()) {
            return List.of();
        }
        int desde = porTramo.keySet().stream().min(Integer::compare).orElse(0);
        int hasta = porTramo.keySet().stream().max(Integer::compare).orElse(0);
        List<LlegadaDto> curva = new ArrayList<>();
        for (int tramo = desde; tramo <= hasta; tramo++) {
            int minutoDelDia = tramo * minutos;
            curva.add(new LlegadaDto(String.format("%02d:%02d", minutoDelDia / 60, minutoDelDia % 60),
                    porTramo.getOrDefault(tramo, 0L)));
        }
        return curva;
    }

    // -------------------------------------------------------------------------
    // REUBICAR Y AUTORIZAR (solo DOCENTE)
    // -------------------------------------------------------------------------

    /**
     * Reubica al estudiante de la alerta al aula donde se presentó y registra
     * su ingreso, todo en una transacción: si algo falla, no cambia la
     * asignación ni se descuenta el cupo.
     *
     * Este método NO es @Transactional a propósito (BUG-038): la transacción se abre
     * con TransactionTemplate dentro de {@link #ejecutarReubicacion}. El rechazo se
     * audita después del rollback para preservar el 409; el éxito se audita dentro
     * de la transacción para no confirmar un ingreso sin su evento de auditoría.
     */
    public ReubicacionDto reubicarYAutorizar(Integer idIntento, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esDocente()) {
            String mensaje = "La reubicación express es una acción exclusiva del docente.";
            contextoUsuarioService.registrarAccesoDenegado(usuario, "Reubicar y Autorizar · " + mensaje, ip);
            throw new AccesoDenegadoException(mensaje);
        }

        ResultadoReubicacion resultado;
        try {
            resultado = transaccion.execute(estado -> ejecutarReubicacion(usuario, idIntento, ip));
        } catch (ReubicacionRechazada rechazo) {
            // La transacción ya hizo rollback: se audita el rechazo y se responde 409
            auditoriaService.registrar("REUBICACION_RECHAZADA", usuario.correo(), rechazo.correoEstudiante,
                    rechazo.contexto + " · " + rechazo.getMessage(), ip);
            throw rechazo;
        }

        return resultado.dto();
    }

    /** Cuerpo transaccional de la reubicación y su auditoría de éxito. */
    private ResultadoReubicacion ejecutarReubicacion(UsuarioActual usuario, Integer idIntento, String ip) {
        IntentoNoAutorizado intento = intentoRepository.findById(idIntento)
                .filter(i -> i.getMotivo() == MotivoIntento.AMBIENTE_DIFERENTE)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la alerta de aula diferente " + idIntento + "."));
        Ambiente destino = ambienteExamenService.obtener(intento.getIdAmbiente());
        contextoUsuarioService.verificarAccesoAmbiente(usuario, destino, false, "Reubicar y Autorizar", ip);

        AmbienteInfo infoDestino = ambienteExamenService.describir(destino);
        Integer codSis = intento.getCodsisEstudiante();
        Integer idAsignatura = destino.getIdAsignatura();
        Integer idExamen = destino.getIdExamen();
        Reparto reparto = asignacionAulaService.repartir(idAsignatura, idExamen);
        String aulaOrigen = reparto.aulaDe(codSis).map(AulaExamen::nombre).orElse("sin aula asignada");
        Integer idAmbienteOrigen = reparto.aulaDe(codSis).map(AulaExamen::idAmbiente).orElse(null);
        String nombreEstudiante = Optional.ofNullable(reparto.habilitados().get(codSis))
                .map(EstudianteHabilitado::nombreCompleto).orElse("SIS " + codSis);
        String correoEstudiante = usuarioRepository.findById(intento.getIdUsuarioEstudiante())
                .map(Usuario::getCorreousuario).orElse(usuario.correo());
        String contexto = infoDestino.asignatura() + " · examen " + idExamen + " · SIS " + codSis
                + " · " + aulaOrigen + " → " + infoDestino.aula();

        Optional<Ingreso> previo = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(codSis, idAsignatura, idExamen);
        if (previo.isPresent()) {
            String hora = previo.get().getHoraIngreso() == null ? "" : " a las " + previo.get().getHoraIngreso().format(FORMATO_HORA);
            throw new ReubicacionRechazada(correoEstudiante, contexto, "El estudiante ya registró su ingreso" + hora + ".");
        }
        if (!reparto.habilitados().containsKey(codSis)) {
            throw new ReubicacionRechazada(correoEstudiante, contexto, "El estudiante no está habilitado para este examen.");
        }
        EstadoIngresoAula estadoAula = ambienteExamenService.estadoIngreso(infoDestino);
        if (estadoAula.cerrado()) {
            throw new ReubicacionRechazada(correoEstudiante, contexto, estadoAula.motivo());
        }

        // Nadie más puede ocupar este cupo hasta que termine la transacción
        ingresoRepository.bloquearAmbiente(destino.getIdAmbiente());
        long ocupados = ingresoRepository.countByIdAmbienteAndIdExpulsionIsNull(destino.getIdAmbiente());
        Integer capacidad = ingresoRepository.obtenerCapacidadAmbiente(destino.getIdAmbiente());
        if (capacidad != null && capacidad > 0 && ocupados >= capacidad) {
            throw new ReubicacionRechazada(correoEstudiante, contexto, "El " + infoDestino.aula()
                    + " no tiene pupitres libres (" + ocupados + "/" + capacidad + "): se mantiene su asignación en el "
                    + aulaOrigen + ".");
        }

        LocalDateTime ahora = HoraOficial.ahora();
        Ingreso ingreso;
        try {
            CambioAmbiente cambio = new CambioAmbiente();
            cambio.setIdAmbiente(destino.getIdAmbiente());
            cambio.setIdAmbienteOrigen(idAmbienteOrigen);
            cambio.setIdUsuarioEstudiante(intento.getIdUsuarioEstudiante());
            cambio.setCodsisEstudiante(codSis);
            cambio.setMotivoCambio("Reubicación express: se presentó en " + infoDestino.aula()
                    + " (asignado a " + aulaOrigen + ")");
            cambio.setFechaCambio(ahora.toLocalDate());
            cambio.setFechaHoraCambio(ahora);
            cambio.setIdUsuarioAutoriza(usuario.idUsuario());
            cambio.setIdIntentoOrigen(idIntento);
            cambioAmbienteRepository.save(cambio);

            ingreso = new Ingreso();
            ingreso.setIdUsuarioEstudiante(intento.getIdUsuarioEstudiante());
            ingreso.setCodsisEstudiante(codSis);
            ingreso.setIdAsignatura(idAsignatura);
            ingreso.setIdExamen(idExamen);
            ingreso.setIdAmbiente(destino.getIdAmbiente());
            ingreso.setIdUsuarioRegistra(usuario.idUsuario());
            ingreso.setFechaIngreso(ahora.toLocalDate());
            ingreso.setHoraIngreso(ahora);
            ingreso.setTipoIngreso(TipoIngreso.NORMAL);
            ingreso.setMetodoIngreso(MetodoIngreso.MANUAL);
            ingreso = ingresoRepository.saveAndFlush(ingreso);
        } catch (DataIntegrityViolationException e) {
            // Otro punto de control registró su ingreso en el mismo instante: se deshace todo
            throw new ReubicacionRechazada(correoEstudiante, contexto, "El estudiante ya registró su ingreso.");
        }

        ReubicacionDto dto = new ReubicacionDto(codSis, nombreEstudiante, aulaOrigen, infoDestino.aula(),
                ingreso.getHoraIngreso(),
                nombreEstudiante + " quedó reubicado en el " + infoDestino.aula() + " y su ingreso fue registrado.");
        auditoriaService.registrarEnTransaccion("REUBICACION_EXPRESS", usuario.correo(), correoEstudiante,
                contexto + " · ingreso #" + ingreso.getIdIngreso(), ip);
        return new ResultadoReubicacion(dto, correoEstudiante, contexto, ingreso.getIdIngreso());
    }

    /** Resultado de la transacción de reubicación, con lo necesario para auditar tras el commit. */
    private record ResultadoReubicacion(ReubicacionDto dto, String correoEstudiante, String contexto,
                                        Integer idIngreso) {
    }

    /**
     * Rechazo de negocio (HTTP 409). Se lanza dentro de la transacción para que haga
     * rollback; el método público lo captura, audita y lo vuelve a lanzar.
     */
    private static final class ReubicacionRechazada extends ConflictoEstadoException {
        private static final long serialVersionUID = 1L;

        private final String correoEstudiante;
        private final String contexto;

        ReubicacionRechazada(String correoEstudiante, String contexto, String mensaje) {
            super(mensaje);
            this.correoEstudiante = correoEstudiante;
            this.contexto = contexto;
        }
    }

    private static double redondear(double valor) {
        return Math.round(valor * 10.0) / 10.0;
    }
}
