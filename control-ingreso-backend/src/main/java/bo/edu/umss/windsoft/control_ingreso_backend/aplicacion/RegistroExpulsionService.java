package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService.AmbienteInfo;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EvidenciaService.EvidenciaSubida;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoExpulsion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Expulsion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.SeveridadIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExpulsionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteExpulsionDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExpulsionListaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroExpulsionRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroExpulsionResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * HU14 · Registro de Expulsados.
 * - Operador: registra (queda PENDIENTE). No autoriza.
 * - Docente: registra y autoriza (solo sus propios exámenes).
 * - Administrador: solo ve reportes globales (solo lectura).
 */
@Service
public class RegistroExpulsionService {

    private static final String ASIGNACION_ACTIVA = "ACTIVO";
    private static final int DESCRIPCION_MIN = 15;
    private static final int DESCRIPCION_MAX = 500;

    // HU14: cuando una expulsion queda autorizada tambien se registra en HU06
    // (Incidencias) como CERRADA y severidad ALTA. El tipo se deduce del motivo.
    private static final Map<String, TipoIncidencia> TIPO_INCIDENCIA_POR_MOTIVO = Map.of(
            "USO_CELULAR", TipoIncidencia.OBJETO_PROHIBIDO,
            "INTENTO_COPIA", TipoIncidencia.CONDUCTA_INAPROPIADA,
            "COMPORTAMIENTO_DISRUPTIVO", TipoIncidencia.CONDUCTA_INAPROPIADA,
            "DOCUMENTACION_FALSA", TipoIncidencia.SUPLANTACION,
            "AGRESION", TipoIncidencia.CONDUCTA_INAPROPIADA,
            "OTRO", TipoIncidencia.OTRO
    );

    private static final Map<String, String> ETIQUETA_MOTIVO = Map.of(
            "USO_CELULAR", "Uso de telefono celular",
            "INTENTO_COPIA", "Intento de copia",
            "COMPORTAMIENTO_DISRUPTIVO", "Comportamiento disruptivo",
            "DOCUMENTACION_FALSA", "Documentacion falsa",
            "AGRESION", "Agresion verbal o fisica",
            "OTRO", "Otro"
    );

    private final ExpulsionRepository expulsionRepository;
    private final IngresoRepository ingresoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final AyudanteExamenRepository ayudanteExamenRepository;
    private final AmbienteExamenService ambienteExamenService;
    private final EstudianteExamenService estudianteExamenService;
    private final ContextoUsuarioService contextoUsuarioService;
    private final EvidenciaService evidenciaService;
    private final AuditoriaService auditoriaService;
    private final IncidenciaService incidenciaService;

    public RegistroExpulsionService(ExpulsionRepository expulsionRepository,
                                    IngresoRepository ingresoRepository,
                                    UsuarioRepository usuarioRepository,
                                    ExamenRepository examenRepository,
                                    AmbienteRepository ambienteRepository,
                                    AyudanteExamenRepository ayudanteExamenRepository,
                                    AmbienteExamenService ambienteExamenService,
                                    EstudianteExamenService estudianteExamenService,
                                    ContextoUsuarioService contextoUsuarioService,
                                    EvidenciaService evidenciaService,
                                    AuditoriaService auditoriaService,
                                    IncidenciaService incidenciaService) {
        this.expulsionRepository = expulsionRepository;
        this.ingresoRepository = ingresoRepository;
        this.usuarioRepository = usuarioRepository;
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.ayudanteExamenRepository = ayudanteExamenRepository;
        this.ambienteExamenService = ambienteExamenService;
        this.estudianteExamenService = estudianteExamenService;
        this.contextoUsuarioService = contextoUsuarioService;
        this.evidenciaService = evidenciaService;
        this.auditoriaService = auditoriaService;
        this.incidenciaService = incidenciaService;
    }

    // =========================================================================
    // REGISTRAR (Operador, Docente, Administrador)
    // =========================================================================

    @Transactional
    public RegistroExpulsionResponse registrar(Integer idExamen, RegistroExpulsionRequest req,
                                               MultipartFile evidenciaArchivo, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        verificarAccesoExamen(usuario, idExamen, true, "Registrar expulsión", ip);

        // Validar que el ingreso existe y pertenece al examen.
        Ingreso ingreso = ingresoRepository.findById(req.idIngreso())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el ingreso con ID " + req.idIngreso() + "."));
        if (!idExamen.equals(ingreso.getIdExamen())) {
            throw new ConflictoEstadoException(
                    "El ingreso #" + req.idIngreso() + " no pertenece al examen #" + idExamen + ".");
        }

        // No puede haber ya una expulsión autorizada para este ingreso.
        Optional<Expulsion> yaAutorizada = expulsionRepository.findByIdIngresoAndEstado(
                req.idIngreso(), EstadoExpulsion.AUTORIZADA);
        if (yaAutorizada.isPresent()) {
            throw new ConflictoEstadoException(
                    "Ya existe una expulsión autorizada para este ingreso; no se puede registrar otra.");
        }

        String motivoLimpio = req.motivoExpulsion() == null ? "" : req.motivoExpulsion().trim();
        if (motivoLimpio.isEmpty()) {
            throw new SolicitudInvalidaException("El motivo de expulsión es obligatorio.");
        }

        // Descripción obligatoria (rescatada de HU06): mínimo 15, máximo 500.
        String observacionLimpia = req.observacion() == null ? "" : req.observacion().trim();
        if (observacionLimpia.length() < DESCRIPCION_MIN || observacionLimpia.length() > DESCRIPCION_MAX) {
            throw new SolicitudInvalidaException("La descripción debe tener entre " + DESCRIPCION_MIN + " y "
                    + DESCRIPCION_MAX + " caracteres.");
        }

        evidenciaService.validar(evidenciaArchivo);

        LocalDateTime ahora = HoraOficial.ahora();

        EvidenciaSubida evidencia = evidenciaService.subir(evidenciaArchivo, "control-ingreso/expulsiones");

        // El Docente registra y autoriza directamente (queda AUTORIZADA).
        // El Operador solo registra (queda PENDIENTE).
        boolean esDocente = usuario.esDocente();

        Expulsion expulsion = new Expulsion();
        try {
            expulsion.setIdIngreso(req.idIngreso());
            expulsion.setIdUsuario(usuario.idUsuario());
            expulsion.setMotivoExpulsion(motivoLimpio);
            expulsion.setObservacion(observacionLimpia);
            expulsion.setEvidencia(evidencia == null ? null : evidencia.url());
            expulsion.setFechaExpulsion(HoraOficial.hoy());
            expulsion.setHoraExpulsion(ahora);

            if (esDocente) {
                expulsion.setEstado(EstadoExpulsion.AUTORIZADA);
                expulsion.setFechaAutorizacion(ahora);
                expulsion.setIdUsuarioAutoriza(usuario.idUsuario());
            } else {
                expulsion.setEstado(EstadoExpulsion.PENDIENTE);
            }

            expulsion = expulsionRepository.save(expulsion);

            // Si el docente autoriza directamente, deja registrada la incidencia HU06
            // (CERRADA, severidad ALTA) y luego bloquea el reingreso del estudiante.
            // La incidencia se crea antes de marcar el ingreso como retirado porque
            // no se permite registrar incidencias para un estudiante ya expulsado.
            if (esDocente) {
                crearIncidenciaDeExpulsion(expulsion, ingreso, evidenciaArchivo, usuario, ip);
                ingreso.setIdExpulsion(expulsion.getIdExpulsion());
                ingresoRepository.saveAndFlush(ingreso);
            }
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        try {
            auditoriaService.registrarEnTransaccion(
                    "EXPULSION_REGISTRADA", usuario.correo(),
                    correoEstudiante(ingreso.getIdUsuarioEstudiante()),
                    "examen #" + idExamen + " · ingreso #" + req.idIngreso() + " · " + motivoLimpio, ip);
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        return armarRespuesta(expulsion);
    }

    // =========================================================================
    // BUSCAR ESTUDIANTE PARA EXPULSIÓN (Docente, Operador, Administrador)
    // =========================================================================

    @Transactional(readOnly = true)
    public EstudianteExpulsionDto buscarEstudianteParaExpulsion(Integer idExamen, String ci, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        verificarAccesoExamen(usuario, idExamen, true, "Buscar estudiante para expulsión", ip);

        // Buscar estudiante por CI o Código SIS
        EstudianteExamenService.EstudianteEncontrado encontrado = estudianteExamenService.buscar(ci)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Estudiante no encontrado con CI o Código SIS: " + ci));

        Integer codSis = encontrado.estudiante().getCodsisestudiante();

        // Obtener el examen para saber idAsignatura
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new RecursoNoEncontradoException("Examen no encontrado."));

        // Obtener ambientes del examen (cualquier ambiente activo)
        List<Ambiente> ambientes = ambienteRepository.findByIdExamen(idExamen);

        if (ambientes.isEmpty()) {
            throw new RecursoNoEncontradoException(
                    "No hay ambientes configurados para el examen #" + idExamen + ".");
        }

        Ambiente ambiente = ambientes.get(0);

        // Buscar ingreso del estudiante en este examen
        Optional<Ingreso> ingresoOpt = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                codSis, ambiente.getIdAsignatura(), idExamen);

        if (ingresoOpt.isEmpty()) {
            throw new RecursoNoEncontradoException(
                    "El estudiante no tiene ingreso registrado en este examen.");
        }

        Ingreso ingreso = ingresoOpt.get();

        if (ingreso.estaRetirado()) {
            throw new ConflictoEstadoException(
                    "El estudiante ya fue retirado de este examen (expulsión previa).");
        }

        // Obtener nombre del aula
        String nombreAula = "";
        try {
            var infos = ambienteExamenService.describir(ambientes);
            nombreAula = infos.get(ambiente.getIdAmbiente()).aula();
        } catch (Exception ignored) {
        }

        return new EstudianteExpulsionDto(
                ingreso.getIdIngreso(),
                codSis,
                encontrado.usuario().getCiusuario(),
                encontrado.nombreCompleto(),
                nombreAula,
                ingreso.getHoraIngreso(),
                false
        );
    }

    // =========================================================================
    // LISTAR POR EXAMEN (Docente, Operador, Administrador)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ExpulsionListaDto> listarPorExamen(Integer idExamen, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        verificarAccesoExamen(usuario, idExamen, true, "Listar expulsiones", ip);

        List<Expulsion> expulsiones = expulsionRepository.findByIdExamen(idExamen);
        return armarLista(expulsiones);
    }

    // =========================================================================
    // PENDIENTES (Docente, Operador, Administrador)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ExpulsionListaDto> listarPendientes(Integer idExamen, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        verificarAccesoExamen(usuario, idExamen, true, "Listar expulsiones pendientes", ip);

        List<Expulsion> pendientes = expulsionRepository.findByIdExamen(idExamen).stream()
                .filter(e -> e.getEstado() == EstadoExpulsion.PENDIENTE)
                .toList();
        return armarLista(pendientes);
    }

    @Transactional(readOnly = true)
    public long contarPendientes(Integer idExamen, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        verificarAccesoExamen(usuario, idExamen, true, "Contar expulsiones pendientes", ip);
        return expulsionRepository.contarPendientesPorExamen(idExamen);
    }

    /**
     * Pendientes de TODOS los exámenes del usuario (sin pedir idExamen).
     * Docente: sus exámenes. Operador: exámenes con aula asignada. Administrador: todos.
     */
    @Transactional(readOnly = true)
    public List<ExpulsionListaDto> listarPendientesDeMisExamenes(String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        contextoUsuarioService.verificarRol(usuario, true, "Listar expulsiones pendientes", ip);

        List<Expulsion> pendientes = expulsionRepository.findByEstado(EstadoExpulsion.PENDIENTE);
        if (usuario.esAdmin()) {
            return armarLista(pendientes);
        }

        Set<Integer> idsExamen;
        if (usuario.esDocente()) {
            idsExamen = examenRepository.findByIdUsuario(usuario.idUsuario()).stream()
                    .map(Examen::getIdExamen)
                    .collect(Collectors.toSet());
        } else if (usuario.esOperador()) {
            idsExamen = ayudanteExamenRepository
                    .findByIdIdayudanteAndEstadoAsignacion(usuario.idUsuario(), ASIGNACION_ACTIVA)
                    .stream()
                    .map(a -> a.getId().getIdexamen())
                    .collect(Collectors.toSet());
        } else {
            throw new AccesoDenegadoException("Su rol no tiene permiso para esta acción.");
        }

        return armarLista(filtrarPorExamenes(pendientes, idsExamen));
    }

    private List<Expulsion> filtrarPorExamenes(List<Expulsion> expulsiones, Set<Integer> idsExamen) {
        if (expulsiones.isEmpty() || idsExamen.isEmpty()) {
            return List.of();
        }
        Set<Integer> idsIngreso = expulsiones.stream()
                .map(Expulsion::getIdIngreso)
                .collect(Collectors.toSet());
        Map<Integer, Ingreso> ingresosPorId = ingresoRepository.findAllById(idsIngreso).stream()
                .collect(Collectors.toMap(Ingreso::getIdIngreso, i -> i));

        return expulsiones.stream()
                .filter(e -> {
                    Ingreso ingreso = ingresosPorId.get(e.getIdIngreso());
                    return ingreso != null && idsExamen.contains(ingreso.getIdExamen());
                })
                .toList();
    }

    // =========================================================================
    // AUTORIZAR (Docente, Administrador)
    // =========================================================================

    @Transactional
    public RegistroExpulsionResponse autorizar(Integer idExamen, Integer idExpulsion, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        verificarAccesoExamen(usuario, idExamen, false, "Autorizar expulsión", ip);

        Expulsion expulsion = expulsionRepository.findById(idExpulsion)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe la expulsión con ID " + idExpulsion + "."));

        // La expulsión debe pertenecer al examen consultado.
        Ingreso ingreso = ingresoRepository.findById(expulsion.getIdIngreso())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró el ingreso asociado a la expulsión."));
        if (!idExamen.equals(ingreso.getIdExamen())) {
            throw new ConflictoEstadoException(
                    "La expulsión #" + idExpulsion + " no pertenece al examen #" + idExamen + ".");
        }

        if (expulsion.getEstado() != EstadoExpulsion.PENDIENTE) {
            throw new ConflictoEstadoException("La expulsión ya fue "
                    + (expulsion.getEstado() == EstadoExpulsion.AUTORIZADA ? "autorizada" : "denegada") + ".");
        }

        LocalDateTime ahora = HoraOficial.ahora();
        expulsion.setEstado(EstadoExpulsion.AUTORIZADA);
        expulsion.setFechaAutorizacion(ahora);
        expulsion.setIdUsuarioAutoriza(usuario.idUsuario());
        expulsionRepository.save(expulsion);

        // HU14: una expulsión autorizada también queda registrada en Incidencias
        // (HU06) como CERRADA con severidad ALTA. Se crea antes de bloquear el
        // reingreso, porque no se permiten incidencias para un ingreso retirado.
        crearIncidenciaDeExpulsion(expulsion, ingreso, null, usuario, ip);

        // Bloquear reingreso: setear idExpulsion en el ingreso.
        ingreso.setIdExpulsion(expulsion.getIdExpulsion());
        ingresoRepository.saveAndFlush(ingreso);

        try {
            auditoriaService.registrarEnTransaccion(
                    "EXPULSION_AUTORIZADA", usuario.correo(),
                    correoEstudiante(ingreso.getIdUsuarioEstudiante()),
                    "examen #" + idExamen + " · ingreso #" + ingreso.getIdIngreso()
                    + " · expulsión #" + idExpulsion + " bloqueada", ip);
        } catch (RuntimeException e) {
            throw e;
        }

        return armarRespuesta(expulsion);
    }

    // =========================================================================
    // DENEGAR (Docente, Administrador)
    // =========================================================================

    /**
     * Deja sin efecto una expulsión pendiente: NO bloquea el reingreso del
     * estudiante. Una vez denegada ya no se puede autorizar.
     */
    @Transactional
    public RegistroExpulsionResponse denegar(Integer idExamen, Integer idExpulsion, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        verificarAccesoExamen(usuario, idExamen, false, "Denegar expulsión", ip);

        Expulsion expulsion = expulsionRepository.findById(idExpulsion)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe la expulsión con ID " + idExpulsion + "."));

        Ingreso ingreso = ingresoRepository.findById(expulsion.getIdIngreso())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró el ingreso asociado a la expulsión."));
        if (!idExamen.equals(ingreso.getIdExamen())) {
            throw new ConflictoEstadoException(
                    "La expulsión #" + idExpulsion + " no pertenece al examen #" + idExamen + ".");
        }

        if (expulsion.getEstado() != EstadoExpulsion.PENDIENTE) {
            throw new ConflictoEstadoException("La expulsión ya fue "
                    + (expulsion.getEstado() == EstadoExpulsion.AUTORIZADA ? "autorizada" : "denegada") + ".");
        }

        expulsion.setEstado(EstadoExpulsion.DENEGADA);
        expulsion.setFechaAutorizacion(HoraOficial.ahora());
        expulsion.setIdUsuarioAutoriza(usuario.idUsuario());
        expulsionRepository.save(expulsion);

        try {
            auditoriaService.registrarEnTransaccion(
                    "EXPULSION_DENEGADA", usuario.correo(),
                    correoEstudiante(ingreso.getIdUsuarioEstudiante()),
                    "examen #" + idExamen + " · ingreso #" + ingreso.getIdIngreso()
                    + " · expulsión #" + idExpulsion + " denegada", ip);
        } catch (RuntimeException e) {
            throw e;
        }

        return armarRespuesta(expulsion);
    }

    // =========================================================================
    // REVOCAR (solo Docente): revierte una expulsión autorizada.
    // =========================================================================
    @Transactional
    public RegistroExpulsionResponse revocar(Integer idExamen, Integer idExpulsion, String motivo, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esDocente()) {
            throw new AccesoDenegadoException("Solo el docente puede revocar una expulsión.");
        }
        verificarAccesoExamen(usuario, idExamen, false, "Revocar expulsión", ip);

        String motivoLimpio = motivo == null ? "" : motivo.trim();
        if (motivoLimpio.length() < DESCRIPCION_MIN) {
            throw new SolicitudInvalidaException("El motivo de revocación es obligatorio (mínimo " + DESCRIPCION_MIN + " caracteres).");
        }

        Expulsion expulsion = expulsionRepository.findById(idExpulsion)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe la expulsión con ID " + idExpulsion + "."));

        Ingreso ingreso = ingresoRepository.findById(expulsion.getIdIngreso())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró el ingreso asociado a la expulsión."));
        if (!idExamen.equals(ingreso.getIdExamen())) {
            throw new ConflictoEstadoException(
                    "La expulsión #" + idExpulsion + " no pertenece al examen #" + idExamen + ".");
        }

        if (expulsion.getEstado() != EstadoExpulsion.AUTORIZADA) {
            throw new ConflictoEstadoException("Solo se puede revocar una expulsión autorizada (estado actual: "
                    + expulsion.getEstado() + ").");
        }

        expulsion.setEstado(EstadoExpulsion.REVOCADA);
        // No se pisan fechaAutorizacion ni idUsuarioAutoriza: son datos históricos
        // de quién autorizó la expulsión y cuándo. La revocación queda en la
        // observación y en la auditoría.
        String obsActual = expulsion.getObservacion();
        expulsion.setObservacion(obsActual == null || obsActual.isBlank()
                ? ("Revocada: " + motivoLimpio)
                : (obsActual + " | Revocada: " + motivoLimpio));
        expulsionRepository.save(expulsion);

        // Restaurar el ingreso: el estudiante puede volver a ingresar.
        ingreso.setIdExpulsion(null);
        ingresoRepository.saveAndFlush(ingreso);

        auditoriaService.registrarEnTransaccion(
                "EXPULSION_REVOCADA", usuario.correo(),
                correoEstudiante(ingreso.getIdUsuarioEstudiante()),
                "examen #" + idExamen + " · ingreso #" + ingreso.getIdIngreso()
                + " · expulsión #" + idExpulsion + " revocada · motivo: " + motivoLimpio, ip);

        return armarRespuesta(expulsion);
    }

    // =========================================================================
    // HISTORIAL DEL USUARIO (Docente, Operador, Administrador)
    // =========================================================================

    /**
     * Historial de expulsiones de los exámenes del usuario autenticado.
     * Docente: sus exámenes. Operador: exámenes con aula asignada. Administrador: todos.
     * Filtros opcionales: asignatura (contiene) y estado (PENDIENTE / AUTORIZADA / DENEGADA).
     */
    @Transactional(readOnly = true)
    public List<ExpulsionListaDto> listarHistorialDeMisExamenes(String ip,
                                                                String asignaturaFiltro,
                                                                String estadoFiltro) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        contextoUsuarioService.verificarRol(usuario, true, "Listar historial de expulsiones", ip);

        List<Expulsion> todas = expulsionRepository.findAll().stream()
                .sorted((a, b) -> {
                    LocalDateTime ha = a.getHoraExpulsion() == null
                            ? LocalDateTime.MIN : a.getHoraExpulsion();
                    LocalDateTime hb = b.getHoraExpulsion() == null
                            ? LocalDateTime.MIN : b.getHoraExpulsion();
                    return hb.compareTo(ha);
                })
                .toList();

        if (usuario.esAdmin()) {
            return filtrarHistorial(armarLista(todas), asignaturaFiltro, estadoFiltro);
        }

        Set<Integer> idsExamen;
        if (usuario.esDocente()) {
            idsExamen = examenRepository.findByIdUsuario(usuario.idUsuario()).stream()
                    .map(Examen::getIdExamen)
                    .collect(Collectors.toSet());
        } else if (usuario.esOperador()) {
            idsExamen = ayudanteExamenRepository
                    .findByIdIdayudanteAndEstadoAsignacion(usuario.idUsuario(), ASIGNACION_ACTIVA)
                    .stream()
                    .map(a -> a.getId().getIdexamen())
                    .collect(Collectors.toSet());
        } else {
            throw new AccesoDenegadoException("Su rol no tiene permiso para esta acción.");
        }

        List<Expulsion> delUsuario = filtrarPorExamenes(todas, idsExamen);
        return filtrarHistorial(armarLista(delUsuario), asignaturaFiltro, estadoFiltro);
    }

    private List<ExpulsionListaDto> filtrarHistorial(List<ExpulsionListaDto> lista,
                                                     String asignaturaFiltro,
                                                     String estadoFiltro) {
        return lista.stream()
                .filter(e -> asignaturaFiltro == null || asignaturaFiltro.isBlank()
                        || (e.nombreAsignatura() != null
                                && e.nombreAsignatura().toLowerCase()
                                .contains(asignaturaFiltro.trim().toLowerCase())))
                .filter(e -> estadoFiltro == null || estadoFiltro.isBlank()
                        || e.estado().name().equalsIgnoreCase(estadoFiltro.trim()))
                .toList();
    }

    // =========================================================================
    // GLOBAL (Administrador, solo lectura)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ExpulsionListaDto> listarTodas(String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esAdmin()) {
            throw new AccesoDenegadoException("Solo el administrador puede ver el reporte global de expulsiones.");
        }
        List<Expulsion> todas = expulsionRepository.findAll().stream()
                .sorted((a, b) -> {
                    LocalDateTime ha = a.getHoraExpulsion() == null
                            ? LocalDateTime.MIN : a.getHoraExpulsion();
                    LocalDateTime hb = b.getHoraExpulsion() == null
                            ? LocalDateTime.MIN : b.getHoraExpulsion();
                    return hb.compareTo(ha);
                })
                .toList();
        return armarLista(todas);
    }

    // =========================================================================
    // Auxiliares
    // =========================================================================

    private void verificarAccesoExamen(ContextoUsuarioService.UsuarioActual usuario, Integer idExamen,
                                       boolean permiteOperador, String accion, String ip) {
        contextoUsuarioService.verificarRol(usuario, permiteOperador, accion, ip);
        if (usuario.esAdmin()) {
            return;
        }

        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new RecursoNoEncontradoException("Examen no encontrado."));

        if (usuario.esDocente()) {
            if (!usuario.idUsuario().equals(examen.getIdUsuario())) {
                String detalles = accion + " · examen " + idExamen + " · no es docente de este examen";
                auditoriaService.registrar("ACCESO_DENEGADO", usuario.correo(), usuario.correo(),
                        "Rol " + usuario.rol() + " · " + detalles, ip);
                throw new AccesoDenegadoException("No es docente de este examen.");
            }
            return;
        }

        if (usuario.esOperador() && permiteOperador) {
            boolean asignado = ayudanteExamenRepository
                    .findByIdIdayudanteAndEstadoAsignacion(usuario.idUsuario(), ASIGNACION_ACTIVA)
                    .stream()
                    .anyMatch(a -> idExamen.equals(a.getId().getIdexamen()));
            if (!asignado) {
                String detalles = accion + " · examen " + idExamen + " · sin aula asignada";
                auditoriaService.registrar("ACCESO_DENEGADO", usuario.correo(), usuario.correo(),
                        "Rol " + usuario.rol() + " · " + detalles, ip);
                throw new AccesoDenegadoException("No tiene asignada ninguna aula de este examen.");
            }
            return;
        }

        String detalles = accion + " · examen " + idExamen + " · rol sin permiso";
        auditoriaService.registrar("ACCESO_DENEGADO", usuario.correo(), usuario.correo(),
                "Rol " + usuario.rol() + " · " + detalles, ip);
        throw new AccesoDenegadoException("Su rol no tiene permiso para esta acción.");
    }

    private List<ExpulsionListaDto> armarLista(List<Expulsion> expulsiones) {
        if (expulsiones.isEmpty()) {
            return List.of();
        }

        Set<Integer> idsIngreso = expulsiones.stream()
                .map(Expulsion::getIdIngreso)
                .collect(Collectors.toSet());
        List<Ingreso> ingresos = ingresoRepository.findAllById(idsIngreso);
        Map<Integer, Ingreso> ingresosPorId = ingresos.stream()
                .collect(Collectors.toMap(Ingreso::getIdIngreso, i -> i));

        Set<Integer> idsUsuarios = new java.util.HashSet<>();
        ingresos.forEach(i -> {
            idsUsuarios.add(i.getIdUsuarioRegistra());
            if (i.getIdUsuarioEstudiante() != null) {
                idsUsuarios.add(i.getIdUsuarioEstudiante());
            }
        });
        expulsiones.forEach(e -> {
            idsUsuarios.add(e.getIdUsuario());
            if (e.getIdUsuarioAutoriza() != null) {
                idsUsuarios.add(e.getIdUsuarioAutoriza());
            }
        });
        List<Usuario> usuarios = usuarioRepository.findAllById(idsUsuarios);
        Map<Integer, Usuario> usuariosPorId = usuarios.stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, u -> u));

        // Materia / aula / fecha del examen: se obtienen del ambiente del ingreso.
        Set<Integer> idsAmbiente = ingresos.stream()
                .map(Ingreso::getIdAmbiente)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Integer, AmbienteInfo> infoPorAmbiente = idsAmbiente.isEmpty()
                ? Map.of()
                : ambienteExamenService.describir(ambienteRepository.findAllById(idsAmbiente));

        return expulsiones.stream().map(e -> {
            Ingreso ingreso = ingresosPorId.get(e.getIdIngreso());
            Integer idExamen = ingreso != null ? ingreso.getIdExamen() : null;
            AmbienteInfo info = ingreso != null ? infoPorAmbiente.get(ingreso.getIdAmbiente()) : null;
            Usuario estudiante = ingreso != null && ingreso.getIdUsuarioEstudiante() != null
                    ? usuariosPorId.get(ingreso.getIdUsuarioEstudiante()) : null;
            Usuario registra = usuariosPorId.get(e.getIdUsuario());
            Usuario autoriza = e.getIdUsuarioAutoriza() != null
                    ? usuariosPorId.get(e.getIdUsuarioAutoriza()) : null;

            return new ExpulsionListaDto(
                    e.getIdExpulsion(),
                    e.getIdIngreso(),
                    idExamen,
                    nombre(estudiante),
                    estudiante != null ? estudiante.getCiusuario() : null,
                    ingreso != null ? ingreso.getCodsisEstudiante() : null,
                    info != null ? info.asignatura() : null,
                    info != null ? info.aula() : null,
                    info != null ? info.fechaExamen() : null,
                    e.getMotivoExpulsion(),
                    e.getObservacion(),
                    e.getEvidencia(),
                    e.getFechaExpulsion(),
                    e.getHoraExpulsion(),
                    e.getEstado(),
                    e.getFechaAutorizacion(),
                    nombre(registra),
                    nombre(autoriza),
                    e.getIdIncidencia()
            );
        }).toList();
    }

    private RegistroExpulsionResponse armarRespuesta(Expulsion e) {
        return new RegistroExpulsionResponse(
                e.getIdExpulsion(),
                e.getIdIngreso(),
                e.getIdUsuario(),
                e.getMotivoExpulsion(),
                e.getFechaExpulsion(),
                e.getHoraExpulsion(),
                e.getObservacion(),
                e.getEvidencia(),
                e.getEstado(),
                e.getFechaAutorizacion(),
                e.getIdUsuarioAutoriza(),
                e.getIdIncidencia()
        );
    }

    // =========================================================================
    // INTEGRACIÓN CON HU06 (INCIDENCIAS)
    // =========================================================================

    /**
     * Registra en HU06 la incidencia correspondiente a una expulsión autorizada.
     * Reutiliza IncidenciaService.registrar(...) y luego cerrar(...), sin tocar
     * el código de HU06. La incidencia queda CERRADA y con severidad ALTA.
     * Es idempotente: si la expulsión ya tiene idIncidencia, no hace nada.
     */
    private void crearIncidenciaDeExpulsion(Expulsion expulsion, Ingreso ingreso,
                                            MultipartFile evidenciaArchivo,
                                            ContextoUsuarioService.UsuarioActual usuario,
                                            String ip) {
        if (expulsion.getIdIncidencia() != null) {
            return;
        }

        String motivo = expulsion.getMotivoExpulsion() == null ? "" : expulsion.getMotivoExpulsion().trim();
        String observacion = expulsion.getObservacion() == null ? "" : expulsion.getObservacion().trim();
        String etiqueta = etiquetaMotivo(motivo);
        TipoIncidencia tipo = tipoIncidenciaPorMotivo(motivo);

        String descripcion = recortar("Expulsión: " + etiqueta + ". " + observacion, DESCRIPCION_MAX);
        if (descripcion.length() < DESCRIPCION_MIN) {
            descripcion = recortar("Expulsión registrada en el examen. " + etiqueta + ". " + observacion,
                    DESCRIPCION_MAX);
        }
        String resolucion = recortar("Expulsión autorizada: " + etiqueta + ". " + observacion, 255);

        IncidenciaDetalleDto incidencia = incidenciaService.registrar(
                UUID.randomUUID().toString(),
                ingreso.getIdAmbiente(),
                tipo.name(),
                SeveridadIncidencia.ALTA.name(),
                descripcion,
                ingreso.getCodsisEstudiante(),
                false,
                evidenciaArchivo,
                ip);

        incidenciaService.cerrar(incidencia.idIncidencia(), resolucion, ip);

        expulsion.setIdIncidencia(incidencia.idIncidencia());
        expulsionRepository.save(expulsion);
    }

    private TipoIncidencia tipoIncidenciaPorMotivo(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            return TipoIncidencia.OTRO;
        }
        return TIPO_INCIDENCIA_POR_MOTIVO.getOrDefault(motivo.trim().toUpperCase(), TipoIncidencia.OTRO);
    }

    private String etiquetaMotivo(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            return "Otro";
        }
        return ETIQUETA_MOTIVO.getOrDefault(motivo.trim().toUpperCase(), motivo.trim());
    }

    private String recortar(String texto, int maximo) {
        if (texto == null) {
            return "";
        }
        String limpio = texto.trim();
        return limpio.length() <= maximo ? limpio : limpio.substring(0, maximo);
    }

    private String correoEstudiante(Integer idUsuarioEstudiante) {
        if (idUsuarioEstudiante == null) return null;
        return usuarioRepository.findById(idUsuarioEstudiante)
                .map(Usuario::getCorreousuario)
                .orElse(null);
    }

    private String nombre(Usuario u) {
        return u == null ? null : (u.getNombreusuario() + " " + u.getApellidousuario()).trim();
    }
}
