package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AsignacionNoActivaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.GrupoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CarreraEstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoNoAutorizadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.TipoExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.DelegadoExamenDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FilaDelegadoExamenDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteResumenDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.JornadaActivaDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.PrimerIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ResultadoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.OtroExamenDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UltimoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.text.Normalizer;
import java.util.Locale;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ControlIngresoAyudanteService {

    private static final Logger log = LoggerFactory.getLogger(ControlIngresoAyudanteService.class);
    private static final ZoneId ZONA_HORARIA = ZoneId.of("America/La_Paz");
    private static final long MINUTOS_ANTES_CONTROL_INGRESO = 15L;

    private final AyudanteExamenRepository ayudanteExamenRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final AulaRepository aulaRepository;
    private final TipoExamenRepository tipoExamenRepository;
    private final HabilitacionRepository habilitacionRepository;
    private final IngresoRepository ingresoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final GrupoRepository grupoRepository;
    private final CredencialRepository credencialRepository;
    private final CarreraEstudianteRepository carreraEstudianteRepository;
    // HU10: aula asignada (reparto por apellido) e intentos bloqueados para el
    // dashboard
    private final AsignacionAulaService asignacionAulaService;
    private final IntentoIngresoService intentoIngresoService;
    private final IntentoNoAutorizadoRepository intentosRepository;
    private final AuditoriaService auditoriaService;
    private final IntentoExamenIncorrectoService intentoExamenIncorrectoService;

    // Prefijo de seguridad para identificar escaneos QR del sistema
    private static final String PREFIJO_QR = "SCIEMPASS:1:";

    public ControlIngresoAyudanteService(AyudanteExamenRepository ayudanteExamenRepository,
            AsignaturaRepository asignaturaRepository,
            ExamenRepository examenRepository,
            AmbienteRepository ambienteRepository,
            AulaRepository aulaRepository,
            TipoExamenRepository tipoExamenRepository,
            HabilitacionRepository habilitacionRepository,
            IngresoRepository ingresoRepository,
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            GrupoRepository grupoRepository,
            CredencialRepository credencialRepository,
            CarreraEstudianteRepository carreraEstudianteRepository,
            AsignacionAulaService asignacionAulaService,
            IntentoIngresoService intentoIngresoService,
            IntentoNoAutorizadoRepository intentosRepository,
            AuditoriaService auditoriaService,
            IntentoExamenIncorrectoService intentoExamenIncorrectoService) {
        this.asignacionAulaService = asignacionAulaService;
        this.intentoIngresoService = intentoIngresoService;
        this.intentosRepository = intentosRepository;
        this.auditoriaService = auditoriaService;
        this.intentoExamenIncorrectoService = intentoExamenIncorrectoService;
        this.ayudanteExamenRepository = ayudanteExamenRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.aulaRepository = aulaRepository;
        this.tipoExamenRepository = tipoExamenRepository;
        this.habilitacionRepository = habilitacionRepository;
        this.ingresoRepository = ingresoRepository;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.grupoRepository = grupoRepository;
        this.credencialRepository = credencialRepository;
        this.carreraEstudianteRepository = carreraEstudianteRepository;
    }

    public List<DelegadoExamenDTO> obtenerDelegadosActivos(Integer idUsuario) {
        List<AyudanteExamen> activas = ayudanteExamenRepository.findByIdIdayudanteAndEstadoAsignacion(idUsuario,
                "ACTIVO");
        validarSolapamientoAsignaciones(activas);

        return activas.stream()
                .map(this::mapearADelegadoDTO)
                .sorted(Comparator
                        .comparing(DelegadoExamenDTO::fechaExamen, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(DelegadoExamenDTO::horaInicio, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    public JornadaActivaDTO obtenerJornadaActiva(Integer idUsuario) {
        List<AyudanteExamen> activas = ayudanteExamenRepository.findByIdIdayudanteAndEstadoAsignacion(idUsuario,
                "ACTIVO");
        if (activas.isEmpty()) {
            throw new AsignacionNoActivaException("No tiene asignaciones ACTIVAS para control de ingreso.");
        }

        AyudanteExamen seleccionada;
        if (activas.size() == 1) {
            seleccionada = activas.get(0);
        } else {
            LocalDateTime ahora = LocalDateTime.now(ZONA_HORARIA);
            LocalDate hoy = ahora.toLocalDate();
            LocalTime horaActual = ahora.toLocalTime();

            // 1. En curso
            List<AyudanteExamen> enCurso = activas.stream()
                    .filter(ae -> {
                        Examen ex = obtenerExamen(ae);
                        Ambiente amb = obtenerAmbiente(ae);
                        if (ex == null || amb == null || ex.getFechaExamen() == null)
                            return false;
                        return ex.getFechaExamen().equals(hoy)
                                && !horaActual.isBefore(amb.getHoraInicio())
                                && !horaActual.isAfter(amb.getHoraFin());
                    })
                    .sorted(Comparator.comparing(ae -> obtenerAmbiente(ae).getHoraInicio()))
                    .toList();

            if (!enCurso.isEmpty()) {
                seleccionada = enCurso.get(0);
            } else {
                // 2. Más próxima a iniciar
                Optional<AyudanteExamen> masProxima = activas.stream()
                        .filter(ae -> {
                            Examen ex = obtenerExamen(ae);
                            Ambiente amb = obtenerAmbiente(ae);
                            if (ex == null || amb == null || ex.getFechaExamen() == null)
                                return false;
                            LocalDateTime inicioExamen = LocalDateTime.of(ex.getFechaExamen(), amb.getHoraInicio());
                            return inicioExamen.isAfter(ahora);
                        })
                        .min(Comparator.comparing(ae -> {
                            Examen ex = obtenerExamen(ae);
                            Ambiente amb = obtenerAmbiente(ae);
                            LocalDateTime inicioExamen = LocalDateTime.of(ex.getFechaExamen(), amb.getHoraInicio());
                            return Duration.between(ahora, inicioExamen).abs();
                        }));

                if (masProxima.isPresent()) {
                    seleccionada = masProxima.get();
                } else {
                    seleccionada = activas.stream()
                            .min(Comparator.comparing((AyudanteExamen ae) -> {
                                Examen ex = obtenerExamen(ae);
                                return ex != null ? ex.getFechaExamen() : LocalDate.MAX;
                            }).thenComparing(ae -> {
                                Ambiente amb = obtenerAmbiente(ae);
                                return amb != null ? amb.getHoraInicio() : LocalTime.MAX;
                            }))
                            .orElse(activas.get(0));
                }
            }
        }

        return mapearAJornadaActivaDTO(seleccionada);
    }

    public JornadaActivaDTO obtenerExamenSeleccionado(Integer idUsuario, Integer idAsignatura, Integer idExamen,
            Integer idAmbiente) {
        bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId id = new bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId(
                idUsuario, idAsignatura, idExamen, idAmbiente);
        // Pendiente: permitir al docente consultar sus propias aulas sin exigir
        // una fila en ayudante_examen. Se conserva temporalmente la validación
        // original hasta definir el contrato completo para esta pantalla.
        AyudanteExamen asignacion = ayudanteExamenRepository.findById(id)
                .orElse(null);

        if (asignacion == null) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            boolean puedeConsultarSinAsignacion = auth != null && auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_DOCENTE".equals(a.getAuthority())
                            || "ROLE_ADMINISTRADOR".equals(a.getAuthority()));
            if (!puedeConsultarSinAsignacion) {
                throw new AsignacionNoActivaException("No tiene asignado el examen/aula seleccionada.");
            }
            // Docente/admin pueden consultar el resumen de un aula aunque no
            // exista una fila de ayudante_examen para ellos.
            asignacion = new AyudanteExamen(id, "ACTIVO");
        }

        return mapearAJornadaActivaDTO(asignacion);
    }

    public List<UltimoIngresoDTO> obtenerUltimosIngresos(Integer idAsignatura, Integer idExamen, Integer idAmbiente,
            int limite, Integer idActual, boolean soloMios) {
        validarAsignacionDeControl(new VerificarIngresoRequestDTO("", idAsignatura, idExamen, idAmbiente, null), idActual);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean soloOperador = auth.getAuthorities().stream().anyMatch(a -> "ROLE_OPERADOR".equals(a.getAuthority()));
        boolean soloPropios = soloMios || soloOperador;
        List<Ingreso> lista = soloPropios
                ? ingresoRepository.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteAndIdUsuarioRegistraOrderByHoraIngresoDesc(
                        idAsignatura, idExamen, idAmbiente, idActual)
                : ingresoRepository.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByHoraIngresoDesc(
                        idAsignatura, idExamen, idAmbiente);

        var resultado = new java.util.ArrayList<>(lista.stream()
                .map(ing -> {
                    Usuario user = usuarioRepository.findById(ing.getIdUsuarioEstudiante()).orElse(null);
                    Estudiante est = estudianteRepository.findByCodsisestudiante(ing.getCodsisEstudiante())
                            .orElse(null);

                    String ci = user != null ? user.getCiusuario() : "";
                    String nombreCompleto = user != null
                            ? (user.getNombreusuario() + " " + user.getApellidousuario()).trim()
                            : "Estudiante registrado";
                    Integer codsis = est != null ? est.getCodsisestudiante() : ing.getCodsisEstudiante();

                    EstudianteResumenDTO estDto = new EstudianteResumenDTO(
                            ing.getIdUsuarioEstudiante(),
                            codsis,
                            ci,
                            nombreCompleto,
                            carreraDelEstudiante(ing.getIdUsuarioEstudiante(), codsis),
                            null);

                    String metodo = ing.getMetodoIngreso() != null ? ing.getMetodoIngreso().name() : "MANUAL";

                    Usuario operador = ing.getIdUsuarioRegistra() != null
                            ? usuarioRepository.findById(ing.getIdUsuarioRegistra()).orElse(null)
                            : null;
                    String registradoPor = operador != null
                            ? (operador.getNombreusuario() + " " + operador.getApellidousuario()).trim()
                            : null;

                    return new UltimoIngresoDTO(
                            ing.getIdIngreso(),
                            ing.getHoraIngreso(),
                            metodo,
                            estDto,
                            registradoPor,
                            ing.getIdAsignatura(),
                            ing.getIdExamen(),
                            ing.getIdAmbiente(),
                            ing.getScoreFacial() != null,
                            ing.getScoreFacial());
                })
                .toList());
        var intentos = soloPropios
                ? intentosRepository.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteAndIdUsuarioRegistraOrderByHoraIntentoDesc(
                        idAsignatura, idExamen, idAmbiente, idActual)
                : intentosRepository.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByHoraIntentoDesc(
                        idAsignatura, idExamen, idAmbiente);
        intentos.stream()
                .forEach(i -> {
                    Usuario estudiante = usuarioRepository.findById(i.getIdUsuarioEstudiante()).orElse(null);
                    Usuario operador = usuarioRepository.findById(i.getIdUsuarioRegistra()).orElse(null);
                    String nombre = estudiante == null ? "Estudiante registrado"
                            : (estudiante.getNombreusuario() + " " + estudiante.getApellidousuario()).trim();
                    var resumen = new EstudianteResumenDTO(i.getIdUsuarioEstudiante(), i.getCodsisEstudiante(),
                            estudiante == null ? null : estudiante.getCiusuario(), nombre,
                            carreraDelEstudiante(i.getIdUsuarioEstudiante(), i.getCodsisEstudiante()), null);
                    String registrador = operador == null ? null
                            : (operador.getNombreusuario() + " " + operador.getApellidousuario()).trim();
                    resultado.add(new UltimoIngresoDTO(i.getIdIntento(), i.getHoraIntento(), i.getMetodoVerificacion(), resumen,
                            registrador, i.getIdAsignatura(), i.getIdExamen(), i.getIdAmbiente(), i.getMotivo().name()));
                });
        return resultado.stream().sorted(Comparator.comparing(UltimoIngresoDTO::horaIngreso,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limite > 0 ? Math.min(limite, 10) : 5).toList();
    }

    public List<UltimoIngresoDTO> obtenerMisRegistros(Integer idUsuario, int limite) {
        return ingresoRepository.findByIdUsuarioRegistraOrderByHoraIngresoDesc(idUsuario).stream()
                .limit(limite > 0 ? limite : 100)
                .map(ing -> convertirUltimoIngreso(ing))
                .toList();
    }

    private String carreraDelEstudiante(Integer idUsuario, Integer codSis) {
        List<String> carreras = carreraEstudianteRepository.nombres(idUsuario, codSis);
        return carreras.isEmpty() ? null : String.join(", ", carreras);
    }

    private UltimoIngresoDTO convertirUltimoIngreso(Ingreso ing) {
        Usuario user = usuarioRepository.findById(ing.getIdUsuarioEstudiante()).orElse(null);
        Estudiante est = estudianteRepository.findByCodsisestudiante(ing.getCodsisEstudiante()).orElse(null);
        EstudianteResumenDTO resumen = new EstudianteResumenDTO(ing.getIdUsuarioEstudiante(),
                est != null ? est.getCodsisestudiante() : ing.getCodsisEstudiante(),
                user != null ? user.getCiusuario() : "",
                user != null ? (user.getNombreusuario() + " " + user.getApellidousuario()).trim() : "Estudiante registrado",
                carreraDelEstudiante(ing.getIdUsuarioEstudiante(), ing.getCodsisEstudiante()), null);
        String metodo = ing.getMetodoIngreso() != null ? ing.getMetodoIngreso().name() : "MANUAL";
        return new UltimoIngresoDTO(ing.getIdIngreso(), ing.getHoraIngreso(), metodo, resumen,
                "Registro propio", ing.getIdAsignatura(), ing.getIdExamen(), ing.getIdAmbiente(),
                ing.getScoreFacial() != null, ing.getScoreFacial());
    }

    @Transactional
    public ResponseEntity<ResultadoIngresoDTO> registrarIngreso(VerificarIngresoRequestDTO dto, Integer idOperador, String ip) {
        return registrarIngreso(dto, idOperador, null, null, ip);
    }

    /** Variante HU7: conserva la hora declarada por el dispositivo offline. */
    @Transactional
    public ResponseEntity<ResultadoIngresoDTO> registrarIngreso(VerificarIngresoRequestDTO dto, Integer idOperador,
            LocalDateTime horaMarcacion, String clientUuid, String ip) {
        validarAsignacionDeControl(dto, idOperador);

        // El horario se valida únicamente para registros online. Las marcas
        // con clientUuid provienen del modo offline y deben sincronizarse sin
        // ser rechazadas por la hora en que recuperan conexión.
        if (clientUuid == null) {
            ResponseEntity<ResultadoIngresoDTO> fueraDeHorario = validarHorarioOnline(dto);
            if (fueraDeHorario != null) {
                return fueraDeHorario;
            }
        }
        String query = dto.identificador() != null ? dto.identificador().trim() : "";

        // Cuando la lectura proviene de la cámara, cualquier contenido que no
        // sea una credencial SCIEM-PASS debe rechazarse como QR inválido. No
        // debe caer al flujo de búsqueda manual por CI/SIS.
        // Excepción: sincronización offline (clientUuid presente). El frontend
        // puede haber marcado una lectura de código SIS numérico como "QR" sin
        // tener un token QR real; en ese caso se trata como lectura manual.
        if (dto.metodoIngreso() == MetodoIngreso.ESCANEO && !query.startsWith(PREFIJO_QR)) {
            if (clientUuid == null || !query.matches("^\\d+$")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ResultadoIngresoDTO(
                        "QR_INVALIDO",
                        "QR INVÁLIDO - El código leído no corresponde a una credencial SCIEM-PASS.",
                        null, null, null, null));
            }
            // clientUuid + código numérico: continuar al flujo manual por SIS abajo.
        }

        // 1. Detección de Ingreso por QR (formato: SCIEMPASS:1:TOKEN)
        Estudiante estudiante = null;
        Usuario usuario = null;
        boolean qrDeOtroExamen = false;

        if (query.startsWith(PREFIJO_QR)) {
            // --- Flujo QR ---
            String token = query.substring(PREFIJO_QR.length()).trim();
            var credOpt = credencialRepository.findByTokenAndEstado(token, "ACTIVO");

            if (credOpt.isEmpty()) {
                // Token no existe, está anulado o ya expiró
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ResultadoIngresoDTO(
                        "QR_INVALIDO",
                        "QR INVÁLIDO - El código QR no es válido, está anulado o ha expirado.",
                        null, null, null, null));
            }

            var credencial = credOpt.get();

            // Verificar ventana de tiempo
            java.time.LocalDateTime ahora = horaMarcacion != null ? horaMarcacion
                    : java.time.LocalDateTime.now(ZONA_HORARIA);
            if (ahora.isBefore(credencial.getValidoDesde()) || ahora.isAfter(credencial.getValidoHasta())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ResultadoIngresoDTO(
                        "QR_INVALIDO",
                        "QR EXPIRADO - El código QR está fuera de su ventana de validez.",
                        null, null, null, null));
            }

            // Verificar que el QR corresponde al examen que se está controlando
            if (credencial.getIdExamen() != null && !credencial.getIdExamen().equals(dto.idexamen())) {
                qrDeOtroExamen = true;
            }

            // Token válido: resolver el estudiante por idUsuario de la credencial
            usuario = usuarioRepository.findById(credencial.getIdUsuario()).orElse(null);
            if (usuario != null) {
                estudiante = estudianteRepository.findByIdusuario(usuario.getIdusuario()).orElse(null);
            }

        } else if (query.matches("^\\d+$")) {
            // --- Flujo Manual por Código SIS ---
            try {
                Integer codsis = Integer.parseInt(query);
                Optional<Estudiante> estOpt = estudianteRepository.findByCodsisestudiante(codsis);
                if (estOpt.isPresent()) {
                    estudiante = estOpt.get();
                    usuario = usuarioRepository.findById(estudiante.getIdusuario()).orElse(null);
                }
            } catch (NumberFormatException ignored) {
            }
        }

        if (usuario == null) {
            Optional<Usuario> userOpt = usuarioRepository.findByCiusuario(query);
            if (userOpt.isPresent()) {
                usuario = userOpt.get();
                estudiante = estudianteRepository.findByIdusuario(usuario.getIdusuario()).orElse(null);
            }
        }

        if (usuario == null || estudiante == null) {
            ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                    "NO_ENCONTRADO",
                    "ESTUDIANTE NO ENCONTRADO - EL DATO NO EXISTE EN EL SISTEMA. El dato «" + query
                            + "» no corresponde a ningún estudiante registrado.",
                    null,
                    null,
                    null,
                    null);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resultado);
        }

        List<String> carreras = carreraEstudianteRepository.nombres(usuario.getIdusuario(), estudiante.getCodsisestudiante());
        EstudianteResumenDTO estudianteResumen = new EstudianteResumenDTO(
                usuario.getIdusuario(),
                estudiante.getCodsisestudiante(),
                usuario.getCiusuario(),
                usuario.getNombreusuario() + " " + usuario.getApellidousuario(),
                carreras.isEmpty() ? null : String.join(", ", carreras),
                null);

        // En línea todos los operadores asignados al aula pueden registrar
        // cualquier estudiante habilitado. La subdivisión por apellidos se
        // valida únicamente en el motor offline del frontend.

        if (qrDeOtroExamen) {
            if (clientUuid != null) return examenIncorrectoOfflineNoConfirmado(estudianteResumen);
            return registrarExamenIncorrecto(dto, idOperador, ip, query, usuario, estudiante, estudianteResumen);
        }

        // 2. Verificación de Ingreso Previo (Duplicado).
        // Debe ejecutarse antes de la habilitación: un ingreso excepcional
        // también cuenta como ingreso previo aunque el estudiante esté
        // actualmente marcado como inhabilitado.
        Optional<Ingreso> ingresoPrevio = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                estudiante.getCodsisestudiante(), dto.idasignatura(), dto.idexamen());

        if (ingresoPrevio.isPresent()) {
            Ingreso prev = ingresoPrevio.get();
            Ambiente ambPrev = ambienteRepository.findById(prev.getIdAmbiente()).orElse(null);
            Aula aulaPrev = ambPrev != null ? aulaRepository.findById(ambPrev.getIdAula()).orElse(null) : null;

            String nombreAula = aulaPrev != null ? aulaPrev.getNombreAula()
                    : (ambPrev != null ? "Ambiente #" + ambPrev.getIdAmbiente() : "Aula asignada");
            String ubicacionAula = aulaPrev != null ? aulaPrev.getUbicacionAula() : "";

            PrimerIngresoDTO primerIngreso = new PrimerIngresoDTO(
                    prev.getHoraIngreso(),
                    nombreAula,
                    ubicacionAula);

            // HU10: cuenta para el indicador "Duplicados Bloqueados"
            // (el motivo propio "RETIRADO" necesita la migración del CHECK
            // ck_intento_motivo; hasta que se aplique se audita como duplicado
            // para no romper el registro).
            intentoIngresoService.registrar(MotivoIntento.DUPLICADO, dto.idasignatura(), dto.idexamen(),
                    dto.idambiente(), prev.getIdAmbiente(), usuario.getIdusuario(), estudiante.getCodsisestudiante(), idOperador);

            // El estudiante ingresó pero fue expulsado del examen: no es un
            // duplicado, está retirado y no puede volver a ingresar. Se
            // distingue para que el operador no lo deje pasar creyendo que
            // simplemente ya había ingresado antes.
            boolean retirado = prev.estaRetirado();

            ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                    retirado ? "RETIRADO" : "DUPLICADO",
                    retirado
                                    ? "INGRESO DENEGADO - EL ESTUDIANTE FUE EXPULSADO DE ESTE EXAMEN"
                                    : "INGRESO DENEGADO - DUPLICADO DETECTADO",
                    estudianteResumen,
                    null,
                    primerIngreso,
                    retirado
                                    ? "El estudiante fue expulsado de este examen y no puede volver a ingresar."
                                    : null);
            return ResponseEntity.status(retirado ? HttpStatus.FORBIDDEN : HttpStatus.CONFLICT).body(resultado);
        }

        // 3. Verificación de Habilitación Académica
        Optional<Habilitacion> habOpt = habilitacionRepository
                .findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(dto.idasignatura(), dto.idexamen(),
                        estudiante.getCodsisestudiante());

        if (habOpt.isEmpty()) {
            habOpt = habilitacionRepository.findByIdAsignaturaAndIdExamenAndIdUsuario(dto.idasignatura(),
                    dto.idexamen(), usuario.getIdusuario());
        }

        // Si no está inscrito en el examen actual, orientar al estudiante hacia
        // otro examen donde sí figura como habilitado. No se crea ingreso ni
        // intento de inhabilitación para este caso.
        if (habOpt.isEmpty()) {
            if (clientUuid != null) return examenIncorrectoOfflineNoConfirmado(estudianteResumen);
            return registrarExamenIncorrecto(dto, idOperador, ip, query, usuario, estudiante, estudianteResumen);
        }

        if (habOpt.isEmpty() || !Boolean.TRUE.equals(habOpt.get().getEstadohabilitacion())) {
            String motivo = habOpt.map(Habilitacion::getObservacionhabilitacion)
                    .orElse("Estudiante no figura como HABILITADO para este examen.");
            // HU10: el intento bloqueado queda registrado
            intentoIngresoService.registrar(MotivoIntento.INHABILITADO, dto.idasignatura(), dto.idexamen(),
                    dto.idambiente(), null, usuario.getIdusuario(), estudiante.getCodsisestudiante(), idOperador);
            ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                    "INHABILITADO",
                    "INGRESO DENEGADO - ESTUDIANTE INHABILITADO",
                    estudianteResumen,
                    null,
                    null,
                    motivo);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(resultado);
        }

        // 4.1 (HU10) Aula asignada: si se presenta en otra aula del examen, no se
        // registra; el docente puede "Reubicar y Autorizar" desde el dashboard.
        // primerIngreso lleva el aula ASIGNADA (no hay ingreso previo): así no se
        // cambia el formato de ResultadoIngresoDTO.
        Optional<AsignacionAulaService.AulaExamen> aulaAsignada = asignacionAulaService.aulaAsignada(
                dto.idasignatura(), dto.idexamen(), estudiante.getCodsisestudiante());
        if (aulaAsignada.isPresent() && dto.idambiente() != null
                && !aulaAsignada.get().idAmbiente().equals(dto.idambiente())) {
            AsignacionAulaService.AulaExamen asignada = aulaAsignada.get();
            intentoIngresoService.registrar(MotivoIntento.AMBIENTE_DIFERENTE, dto.idasignatura(), dto.idexamen(),
                    dto.idambiente(), asignada.idAmbiente(), usuario.getIdusuario(),
                    estudiante.getCodsisestudiante(), idOperador);
            String ubicacion = asignada.ubicacion() == null || asignada.ubicacion().isBlank()
                    ? ""
                    : " (" + asignada.ubicacion() + ")";
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ResultadoIngresoDTO(
                    "AMBIENTE_DIFERENTE",
                    "INGRESO A UN AMBIENTE DIFERENTE - El estudiante debe dirigirse al " + asignada.nombre() + ubicacion
                            + ".",
                    estudianteResumen,
                    null,
                    new PrimerIngresoDTO(null, asignada.nombre(), asignada.ubicacion()),
                    null));
        }

        // 4.2 Identificación sin registro (primera fase del control).
        // Se validó QR, horario, habilitación, duplicado y aula, pero el ingreso
        // todavía no se crea: primero el operador/docente verifica el rostro.
        if (Boolean.TRUE.equals(dto.soloVerificar())) {
            return ResponseEntity.ok(new ResultadoIngresoDTO(
                    "IDENTIFICADO",
                    "IDENTIFICADO - Continúe con la verificación facial para registrar el ingreso.",
                    estudianteResumen,
                    null,
                    null,
                    null));
        }

        // 4.3 Verificación facial: si llegan scores deben ser consistentes.
        validarScoresFaciales(dto);

        // 5. Registro Exitoso del Ingreso
        Ingreso nuevoIngreso = new Ingreso();
        nuevoIngreso.setIdUsuarioEstudiante(usuario.getIdusuario());
        nuevoIngreso.setCodsisEstudiante(estudiante.getCodsisestudiante());
        nuevoIngreso.setIdAsignatura(dto.idasignatura());
        nuevoIngreso.setIdExamen(dto.idexamen());
        nuevoIngreso.setIdAmbiente(dto.idambiente());
        nuevoIngreso.setIdUsuarioRegistra(idOperador);
        nuevoIngreso.setFechaIngreso(LocalDate.now(ZONA_HORARIA));
        nuevoIngreso.setHoraIngreso(horaMarcacion != null ? horaMarcacion : LocalDateTime.now(ZONA_HORARIA));
        nuevoIngreso.setClientUuid(clientUuid);
        nuevoIngreso.setTipoIngreso(TipoIngreso.NORMAL);
        nuevoIngreso.setMetodoIngreso(dto.metodoIngreso() != null ? dto.metodoIngreso() : MetodoIngreso.MANUAL);
        nuevoIngreso.setScoreFacial(dto.scoreFacial());
        nuevoIngreso.setLivenessScore(dto.livenessScore());
        nuevoIngreso.setModelVersion(dto.modelVersion());
        nuevoIngreso.setDeviceId(dto.deviceId());

        try {
            ingresoRepository.saveAndFlush(nuevoIngreso);
        } catch (DataIntegrityViolationException ex) {
            // Condición de carrera: otro operador registró primero. La restricción
            // única protege la BD y devolvemos el resultado informativo de duplicado.
            Optional<Ingreso> concurrente = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                    estudiante.getCodsisestudiante(), dto.idasignatura(), dto.idexamen());
            if (concurrente.isPresent()) {
                Ingreso prev = concurrente.get();
                ResultadoIngresoDTO duplicado = new ResultadoIngresoDTO(
                        "DUPLICADO",
                        "YA REGISTRADO - El estudiante ya registró su ingreso.",
                        estudianteResumen, null,
                        new PrimerIngresoDTO(prev.getHoraIngreso(), "Aula registrada", ""), null);
                return ResponseEntity.status(HttpStatus.CONFLICT).body(duplicado);
            }
            throw ex;
        }

        String ejecutor = idOperador == null ? null : usuarioRepository.findById(idOperador)
                .map(Usuario::getCorreousuario).orElse(null);
        auditoriaService.registrarEnTransaccion("REGISTRO_INGRESO", ejecutor, usuario.getCorreousuario(),
                "estudiante=" + usuario.getIdusuario() + ", examen=" + dto.idexamen()
                        + ", ambiente=" + dto.idambiente() + ", operador=" + idOperador
                        + ", hora_ingreso=" + nuevoIngreso.getHoraIngreso(), ip);

        ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                "PERMITIDO",
                "INGRESO PERMITIDO",
                estudianteResumen,
                nuevoIngreso.getHoraIngreso(),
                null,
                null);

        return ResponseEntity.status(HttpStatus.CREATED).body(resultado);
    }

    /**
     * Los scores faciales son opcionales. Si vienen, la similitud y el liveness
     * deben estar presentes y en rango, con la versión del modelo y el
     * dispositivo que los produjo (trazabilidad).
     */
    private void validarScoresFaciales(VerificarIngresoRequestDTO dto) {
        Double score = dto.scoreFacial();
        Double liveness = dto.livenessScore();
        if (score == null && liveness == null) {
            return;
        }
        if (score == null || liveness == null) {
            throw new SolicitudInvalidaException(
                    "La verificación facial requiere similitud y prueba de vida (liveness).");
        }
        if (score < 0d || score > 1d) {
            throw new SolicitudInvalidaException("La similitud facial debe estar entre 0 y 1.");
        }
        if (liveness < 0d || liveness > 1d) {
            throw new SolicitudInvalidaException("La prueba de vida debe estar entre 0 y 1.");
        }
        if (dto.modelVersion() == null || dto.modelVersion().isBlank()) {
            throw new SolicitudInvalidaException("La versión del modelo facial es obligatoria.");
        }
        if (dto.deviceId() == null || dto.deviceId().isBlank()) {
            throw new SolicitudInvalidaException(
                    "El identificador del dispositivo es obligatorio para la verificación facial.");
        }
    }

    private ResponseEntity<ResultadoIngresoDTO> validarHorarioOnline(VerificarIngresoRequestDTO dto) {
        Examen examen = examenRepository.findById(dto.idexamen()).orElse(null);
        Ambiente ambiente = ambienteRepository.findById(dto.idambiente()).orElse(null);
        if (examen == null || ambiente == null || examen.getFechaExamen() == null
                || ambiente.getHoraInicio() == null || ambiente.getHoraFin() == null) {
            return null;
        }

        LocalDateTime apertura = LocalDateTime.of(examen.getFechaExamen(), ambiente.getHoraInicio())
                .minusMinutes(MINUTOS_ANTES_CONTROL_INGRESO);
        LocalDateTime cierre = LocalDateTime.of(examen.getFechaExamen(), ambiente.getHoraFin());
        LocalDateTime ahora = LocalDateTime.now(ZONA_HORARIA);

        if (!ahora.isBefore(apertura) && !ahora.isAfter(cierre)) {
            return null;
        }

        String mensaje = String.format(
                "El registro de ingreso se habilita a las %s y finaliza a las %s.",
                ambiente.getHoraInicio().minusMinutes(MINUTOS_ANTES_CONTROL_INGRESO),
                ambiente.getHoraFin());
        ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                "FUERA_DE_HORARIO", mensaje, null, null, null, null);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(resultado);
    }

    public void validarAsignacionDeControl(VerificarIngresoRequestDTO dto, Integer idUsuario) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || idUsuario == null) {
            throw new org.springframework.security.access.AccessDeniedException("Debe iniciar sesion para controlar el examen.");
        }
        Examen examen = examenRepository.findById(dto.idexamen()).orElseThrow(() ->
                new org.springframework.security.access.AccessDeniedException("Examen o aula no autorizado."));
        Ambiente ambiente = ambienteRepository.findById(dto.idambiente()).orElseThrow(() ->
                new org.springframework.security.access.AccessDeniedException("Examen o aula no autorizado."));
        if (!Objects.equals(examen.getIdAsignatura(), dto.idasignatura())
                || !Objects.equals(ambiente.getIdAsignatura(), dto.idasignatura())
                || !Objects.equals(ambiente.getIdExamen(), dto.idexamen())) {
            throw new org.springframework.security.access.AccessDeniedException("El aula no pertenece al examen indicado.");
        }
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMINISTRADOR".equals(a.getAuthority()));
        boolean docente = auth.getAuthorities().stream().anyMatch(a -> "ROLE_DOCENTE".equals(a.getAuthority()));
        if (admin || (docente && Objects.equals(examen.getIdUsuario(), idUsuario))) return;
        if (docente) throw new org.springframework.security.access.AccessDeniedException("No es el docente responsable de este examen.");

        boolean operador = auth.getAuthorities().stream().anyMatch(a -> "ROLE_OPERADOR".equals(a.getAuthority()));
        if (!operador) throw new org.springframework.security.access.AccessDeniedException("No tiene permiso para controlar el examen.");
        boolean asignado = ayudanteExamenRepository
                .existsByIdIdayudanteAndIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(
                        idUsuario, dto.idasignatura(), dto.idexamen(), dto.idambiente(), "ACTIVO");
        if (!asignado) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN, "El operador no tiene asignada esta aula para el examen.");
        }
    }

    /** En subdivisión, un operador solo puede registrar su rango de apellidos. */
    private ResponseEntity<ResultadoIngresoDTO> validarRangoAsignacion(
            VerificarIngresoRequestDTO dto, Integer idOperador, String apellidoEstudiante,
            EstudianteResumenDTO estudianteResumen) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean autorizadoGlobal = auth != null && auth.getAuthorities().stream()
                .anyMatch(
                        a -> "ROLE_ADMINISTRADOR".equals(a.getAuthority()) || "ROLE_DOCENTE".equals(a.getAuthority()));
        if (autorizadoGlobal || idOperador == null || dto.idambiente() == null)
            return null;

        AyudanteExamenId id = new AyudanteExamenId(
                idOperador, dto.idasignatura(), dto.idexamen(), dto.idambiente());
        AyudanteExamen asignacion = ayudanteExamenRepository.findById(id).orElse(null);
        if (asignacion == null || !"SUBDIVISION".equalsIgnoreCase(asignacion.getModoAsignacion()))
            return null;

        String letra = Normalizer
                .normalize(String.valueOf(apellidoEstudiante == null ? "" : apellidoEstudiante), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").trim().toUpperCase(Locale.ROOT);
        letra = letra.isEmpty() ? "#" : letra.substring(0, 1);
        String desde = asignacion.getApellidoDesde();
        String hasta = asignacion.getApellidoHasta();
        boolean dentro = (desde == null || letra.compareTo(desde) >= 0)
                && (hasta == null || letra.compareTo(hasta) <= 0);
        if (!dentro) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ResultadoIngresoDTO(
                    "FUERA_DE_RANGO",
                    "INGRESO DENEGADO - El estudiante está fuera del rango de apellidos asignado a este operador.",
                    estudianteResumen, null, null, null));
        }
        return null;
    }

    private ResponseEntity<ResultadoIngresoDTO> examenIncorrectoOfflineNoConfirmado(EstudianteResumenDTO resumen) {
        // La marca offline no acredita que el intento HU09 se haya guardado ni
        // aporta necesariamente el contexto de orientacion del momento original.
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ResultadoIngresoDTO(
                "NO_INSCRITO", "No se pudo confirmar el examen de la marca sin conexion; requiere revision.",
                resumen, null, null, null));
    }

    private ResponseEntity<ResultadoIngresoDTO> registrarExamenIncorrecto(VerificarIngresoRequestDTO dto,
            Integer operadorId, String ip, String identificador, Usuario usuario, Estudiante estudiante,
            EstudianteResumenDTO resumen) {
        if (dto.solicitud() == null) {
            throw new IllegalArgumentException("Actualice la aplicacion: falta el identificador de la verificacion.");
        }
        List<OtroExamenDTO> destinos = examenesCorrespondientes(estudiante.getCodsisestudiante(), dto.idexamen(),
                LocalDateTime.now(ZONA_HORARIA));
        OtroExamenDTO destino = destinos.size() == 1 ? destinos.get(0) : null;
        String metodo = dto.metodoIngreso() == MetodoIngreso.ESCANEO ? "QR"
                : identificador.equals(String.valueOf(estudiante.getCodsisestudiante())) ? "SIS" : "CI";
        var datos = new bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository.Datos(
                dto.solicitud(), dto.idasignatura(), dto.idexamen(), dto.idambiente(), operadorId,
                usuario.getIdusuario(), estudiante.getCodsisestudiante(), metodo,
                destino == null ? null : destino.idAsignatura(), destino == null ? null : destino.idExamen(),
                destino == null ? null : destino.idAmbiente());
        String correoOperador = usuarioRepository.findById(operadorId).map(Usuario::getCorreousuario).orElse(null);
        var guardado = intentoExamenIncorrectoService.registrar(datos, correoOperador, usuario.getCorreousuario(), ip);
        // En un reintento se conserva el destino original, no uno recalculado mas tarde.
        boolean cambioDestino = !Objects.equals(guardado.datos().examenDestino(), datos.examenDestino())
                || !Objects.equals(guardado.datos().ambienteDestino(), datos.ambienteDestino());
        if (cambioDestino) {
            destino = null;
        }
        String detalle = cambioDestino
                ? "La orientacion puede haber cambiado desde la primera verificacion; consulte al docente."
                : destinos.size() > 1
                ? "Hay varios examenes posibles en este horario; consulte al docente para confirmar."
                : destino == null ? "No se encontro un examen correspondiente para este horario."
                : "Dirija al estudiante al examen indicado.";
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ResultadoIngresoDTO(
                "EXAMEN_INCORRECTO", "INGRESO DENEGADO — EXAMEN INCORRECTO. " + detalle,
                resumen, null, null, null, destino, true));
    }

    List<OtroExamenDTO> examenesCorrespondientes(Integer codSis, Integer examenActual, LocalDateTime ahora) {
        return habilitacionRepository.findByEstudianteCodsisestudiante(codSis).stream()
                .filter(h -> h.getIdExamen() != null && !h.getIdExamen().equals(examenActual))
                .map(h -> examenRepository.findById(h.getIdExamen()).orElse(null))
                .filter(Objects::nonNull)
                .filter(ex -> ahora.toLocalDate().equals(ex.getFechaExamen()))
                .map(ex -> orientacionEnHorario(ex, codSis, ahora))
                .flatMap(Optional::stream)
                .distinct().toList();
    }

    private Optional<OtroExamenDTO> orientacionEnHorario(Examen examen, Integer codSis, LocalDateTime ahora) {
        List<Ambiente> ambientes = ambienteRepository.findByIdExamen(examen.getIdExamen()).stream()
                .filter(a -> a.getHoraInicio() != null && a.getHoraFin() != null)
                .filter(a -> !ahora.isBefore(LocalDateTime.of(examen.getFechaExamen(), a.getHoraInicio()).minusMinutes(MINUTOS_ANTES_CONTROL_INGRESO))
                        && !ahora.isAfter(LocalDateTime.of(examen.getFechaExamen(), a.getHoraFin())))
                .toList();
        if (ambientes.isEmpty()) return Optional.empty();
        var aulaAsignada = asignacionAulaService.aulaAsignada(examen.getIdAsignatura(), examen.getIdExamen(), codSis);
        if (aulaAsignada.isPresent() && ambientes.stream().noneMatch(a ->
                Objects.equals(a.getIdAmbiente(), aulaAsignada.get().idAmbiente()))) return Optional.empty();
        Ambiente horario = aulaAsignada.map(AsignacionAulaService.AulaExamen::ambiente)
                .orElse(ambientes.get(0));
        String nombreAula = aulaAsignada.map(AsignacionAulaService.AulaExamen::nombre).orElse(null);
        String edificio = aulaAsignada.map(AsignacionAulaService.AulaExamen::ubicacion).orElse(null);
        Integer ambienteId = aulaAsignada.map(AsignacionAulaService.AulaExamen::idAmbiente).orElse(null);
        String grupo = examen.getIdGrupo() == null ? null : grupoRepository.findById(examen.getIdGrupo())
                .map(bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo::getNombreGrupo).orElse(null);
        String asignatura = asignaturaRepository.findById(examen.getIdAsignatura())
                .map(Asignatura::getNombreAsignatura).orElse(null);
        boolean horarioUnico = aulaAsignada.isPresent() || ambientes.stream().allMatch(a ->
                Objects.equals(a.getHoraInicio(), horario.getHoraInicio()) && Objects.equals(a.getHoraFin(), horario.getHoraFin()));
        return Optional.of(new OtroExamenDTO(asignatura, resolverNombreExamen(examen), nombreAula,
                horarioUnico ? horario.getHoraInicio() + " - " + horario.getHoraFin() : null, grupo, edificio,
                examen.getIdAsignatura(), examen.getIdExamen(), ambienteId));
    }

    private DelegadoExamenDTO mapearADelegadoDTO(AyudanteExamen ae) {
        Asignatura asig = obtenerAsignatura(ae);
        Examen ex = obtenerExamen(ae);
        Ambiente amb = obtenerAmbiente(ae);
        Aula aula = amb != null ? obtenerAula(amb.getIdAula()) : null;

        String nombreAsig = asig != null ? asig.getNombreAsignatura() : "Sin Asignatura";
        String siglaAsig = asig != null ? asig.getSiglaAsignatura() : "";
        String nombreEx = resolverNombreExamen(ex);
        String nombreAmb = aula != null ? aula.getNombreAula()
                : (amb != null ? "Ambiente #" + amb.getIdAmbiente() : "Sin Aula");
        String ubicacionAmb = aula != null ? aula.getUbicacionAula() : "";
        LocalDate fechaEx = ex != null ? ex.getFechaExamen() : null;
        LocalTime horaIni = amb != null ? amb.getHoraInicio() : null;
        LocalTime horaFin = amb != null ? amb.getHoraFin() : null;

        String estadoMateria = calcularEstadoMateria(fechaEx, horaIni, horaFin);

        Integer idAsig = ae.getId().getIdasignatura();
        Integer idEx = ae.getId().getIdexamen();
        Integer idAmb = ae.getId().getIdambiente();

        int totalHab = (int) habilitacionRepository.countByIdAsignaturaAndIdExamenAndEstadohabilitacionTrue(idAsig,
                idEx);
        int inhabilitados = (int) habilitacionRepository
                .countByIdAsignaturaAndIdExamenAndEstadohabilitacionFalse(idAsig, idEx);
        int ingresaron = (int) ingresoRepository.countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(idAsig,
                idEx, idAmb);
        // Los expulsados sí entraron, pero no están "ausentes": se informan
        // aparte para que las cifras del aula cuadren con la lista oficial.
        int expulsados = (int) ingresoRepository
                        .countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNotNull(idAsig, idEx, idAmb);
        int faltantes = Math.max(0, totalHab - ingresaron - expulsados);

        String grupo;
        if (ex != null && ex.getIdGrupo() != null) {
            grupo = grupoRepository.findById(ex.getIdGrupo())
                    .map(bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo::getNombreGrupo)
                    .orElse(null);
        } else {
            // Compatibilidad con exámenes históricos que todavía no tienen grupo.
            grupo = grupoRepository.findByIdAsignatura(idAsig).stream()
                    .map(bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo::getNombreGrupo)
                    .collect(java.util.stream.Collectors.joining(", "));
        }

        return new DelegadoExamenDTO(
                ae.getId().getIdayudante(),
                idAsig,
                nombreAsig,
                siglaAsig,
                idEx,
                nombreEx,
                idAmb,
                nombreAmb,
                ubicacionAmb,
                fechaEx,
                horaIni,
                horaFin,
                grupo.isEmpty() ? null : grupo,
                ae.getEstadoAsignacion(),
                estadoMateria,
                ingresaron,
                faltantes,
                expulsados,
                inhabilitados,
                totalHab,
                ae.getApellidoDesde(),
                ae.getApellidoHasta(),
                usuarioRepository.findById(ae.getId().getIdayudante())
                        .map(u -> (u.getNombreusuario() + " " + u.getApellidousuario()).trim())
                        .orElse("Ayudante"),
                true,
                obtenerFilasDelExamen(idAsig, idEx, idAmb, idOperadorActual(ae)));
    }

    private Integer idOperadorActual(AyudanteExamen ae) {
        return ae.getId().getIdayudante();
    }

    private List<FilaDelegadoExamenDTO> obtenerFilasDelExamen(Integer idAsignatura, Integer idExamen,
            Integer idAmbiente, Integer idAyudanteActual) {
        return ayudanteExamenRepository
                .findByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(
                        idAsignatura, idExamen, idAmbiente, "ACTIVO")
                .stream()
                .filter(a -> "SUBDIVISION".equalsIgnoreCase(a.getModoAsignacion()))
                .map(a -> new FilaDelegadoExamenDTO(
                        a.getApellidoDesde(),
                        a.getApellidoHasta(),
                        usuarioRepository.findById(a.getId().getIdayudante())
                                .map(u -> (u.getNombreusuario() + " " + u.getApellidousuario()).trim())
                                .orElse("Ayudante"),
                        0,
                        0,
                        a.getId().getIdayudante().equals(idAyudanteActual)))
                .toList();
    }

    private JornadaActivaDTO mapearAJornadaActivaDTO(AyudanteExamen ae) {
        Asignatura asig = obtenerAsignatura(ae);
        Examen ex = obtenerExamen(ae);
        Ambiente amb = obtenerAmbiente(ae);
        Aula aula = amb != null ? obtenerAula(amb.getIdAula()) : null;

        String nombreAsig = asig != null ? asig.getNombreAsignatura() : "Sin Asignatura";
        String siglaAsig = asig != null ? asig.getSiglaAsignatura() : "";
        String nombreEx = resolverNombreExamen(ex);
        String nombreAmb = aula != null ? aula.getNombreAula()
                : (amb != null ? "Ambiente #" + amb.getIdAmbiente() : "Sin Aula");
        String ubicacionAmb = aula != null ? aula.getUbicacionAula() : "";
        LocalDate fechaEx = ex != null ? ex.getFechaExamen() : null;
        LocalTime horaIni = amb != null ? amb.getHoraInicio() : null;
        LocalTime horaFin = amb != null ? amb.getHoraFin() : null;

        String estadoMateria = calcularEstadoMateria(fechaEx, horaIni, horaFin);

        Integer idAsig = ae.getId().getIdasignatura();
        Integer idEx = ae.getId().getIdexamen();
        Integer idAmb = ae.getId().getIdambiente();

        int cantidadOperadores = ayudanteExamenRepository
                .countByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(idAsig, idEx, idAmb, "ACTIVO");

        int totalHab = (int) habilitacionRepository.countByIdAsignaturaAndIdExamenAndEstadohabilitacionTrue(idAsig,
                idEx);
        int inhabilitados = (int) habilitacionRepository
                .countByIdAsignaturaAndIdExamenAndEstadohabilitacionFalse(idAsig, idEx);
        int ingresaron = (int) ingresoRepository.countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(idAsig,
                idEx, idAmb);
        // Los expulsados sí entraron, pero no están "ausentes": se informan
        // aparte para que las cifras del aula cuadren con la lista oficial.
        int expulsados = (int) ingresoRepository
                        .countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNotNull(idAsig, idEx, idAmb);
        int faltantes = Math.max(0, totalHab - ingresaron - expulsados);

        String grupo = grupoRepository.findByIdAsignatura(idAsig).stream()
                .map(bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo::getNombreGrupo)
                .collect(java.util.stream.Collectors.joining(", "));

        return new JornadaActivaDTO(
                idAsig,
                nombreAsig,
                siglaAsig,
                idEx,
                nombreEx,
                idAmb,
                nombreAmb,
                ubicacionAmb,
                fechaEx,
                horaIni,
                horaFin,
                grupo.isEmpty() ? null : grupo,
                estadoMateria,
                cantidadOperadores,
                ingresaron,
                faltantes,
                expulsados,
                inhabilitados,
                totalHab);
    }

    private String calcularEstadoMateria(LocalDate fechaExamen, LocalTime horaInicio, LocalTime horaFin) {
        if (fechaExamen == null || horaInicio == null || horaFin == null) {
            return "PROXIMO";
        }
        LocalDateTime ahora = LocalDateTime.now(ZONA_HORARIA);
        LocalDate hoy = ahora.toLocalDate();
        LocalTime horaActual = ahora.toLocalTime();

        if (fechaExamen.isBefore(hoy) || (fechaExamen.equals(hoy) && horaActual.isAfter(horaFin))) {
            return "FINALIZADO";
        }
        if (fechaExamen.equals(hoy) && !horaActual.isBefore(horaInicio) && !horaActual.isAfter(horaFin)) {
            return "EN_CURSO";
        }
        return "PROXIMO";
    }

    private String resolverNombreExamen(Examen ex) {
        if (ex == null)
            return "Sin Examen";
        if (ex.getDetalleTipoExamen() != null && !ex.getDetalleTipoExamen().isBlank()) {
            return ex.getDetalleTipoExamen();
        }
        if (ex.getIdTipoExamen() != null) {
            Optional<TipoExamen> te = tipoExamenRepository.findById(ex.getIdTipoExamen());
            if (te.isPresent())
                return te.get().getNombreTipoExamen();
        }
        return "Examen #" + ex.getIdExamen();
    }

    private Asignatura obtenerAsignatura(AyudanteExamen ae) {
        if (ae.getAsignatura() != null)
            return ae.getAsignatura();
        return asignaturaRepository.findById(ae.getId().getIdasignatura()).orElse(null);
    }

    private Examen obtenerExamen(AyudanteExamen ae) {
        if (ae.getExamen() != null)
            return ae.getExamen();
        return examenRepository.findById(ae.getId().getIdexamen()).orElse(null);
    }

    private Ambiente obtenerAmbiente(AyudanteExamen ae) {
        if (ae.getAmbiente() != null)
            return ae.getAmbiente();
        return ambienteRepository.findById(ae.getId().getIdambiente()).orElse(null);
    }

    private Aula obtenerAula(Integer idAula) {
        if (idAula == null)
            return null;
        return aulaRepository.findById(idAula).orElse(null);
    }

    private void validarSolapamientoAsignaciones(List<AyudanteExamen> activas) {
        for (int i = 0; i < activas.size(); i++) {
            for (int j = i + 1; j < activas.size(); j++) {
                AyudanteExamen ae1 = activas.get(i);
                AyudanteExamen ae2 = activas.get(j);

                Examen ex1 = obtenerExamen(ae1);
                Examen ex2 = obtenerExamen(ae2);
                Ambiente amb1 = obtenerAmbiente(ae1);
                Ambiente amb2 = obtenerAmbiente(ae2);

                if (ex1 != null && ex2 != null && amb1 != null && amb2 != null
                        && Objects.equals(ex1.getFechaExamen(), ex2.getFechaExamen())
                        && ex1.getFechaExamen() != null) {

                    if (seSuperponen(amb1.getHoraInicio(), amb1.getHoraFin(), amb2.getHoraInicio(),
                            amb2.getHoraFin())) {
                        log.warn("ADVERTENCIA: Solapamiento detectado para el operador ID {} en la fecha {}: " +
                                "Asignación 1 (Ambiente {}) [{} - {}] vs Asignación 2 (Ambiente {}) [{} - {}]",
                                ae1.getId().getIdayudante(), ex1.getFechaExamen(),
                                amb1.getIdAmbiente(), amb1.getHoraInicio(), amb1.getHoraFin(),
                                amb2.getIdAmbiente(), amb2.getHoraInicio(), amb2.getHoraFin());
                    }
                }
            }
        }
    }

    private boolean seSuperponen(LocalTime ini1, LocalTime fin1, LocalTime ini2, LocalTime fin2) {
        if (ini1 == null || fin1 == null || ini2 == null || fin2 == null)
            return false;
        return !ini1.isAfter(fin2) && !ini2.isAfter(fin1);
    }
}
