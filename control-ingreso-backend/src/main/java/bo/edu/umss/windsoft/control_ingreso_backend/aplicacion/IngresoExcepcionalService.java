package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService.AmbienteInfo;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService.EstadoIngresoAula;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService.UsuarioActual;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService.EstadoHabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService.EstudianteEncontrado;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService.HabilitacionExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EvidenciaService.EvidenciaSubida;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AforoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ConsultaEstudianteDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IngresoExcepcionalDto;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * HU06 · Ingreso excepcional: DOCENTE (de la materia), ADMINISTRADOR y, desde
 * el control de ingreso, OPERADOR cuando el motivo es facial
 * ({@code FALLO_FACIAL} o {@code SIN_ENROLAMIENTO_FACIAL}).
 * Quien registra el ingreso es quien lo autoriza (ingreso.idusuario).
 * Todo intento, aceptado o rechazado, queda en auditoría.
 */
@Service
public class IngresoExcepcionalService {

    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final int OBSERVACION_MIN = 20;
    private static final int OBSERVACION_MAX = 500;
    // Si el mismo usuario repite la misma autorización en este lapso (doble
    // clic, recarga), se devuelve el ingreso ya creado en vez de un error.
    private static final Duration VENTANA_REPETICION = Duration.ofMinutes(2);

    private final IngresoRepository ingresoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AmbienteExamenService ambienteExamenService;
    private final EstudianteExamenService estudianteExamenService;
    private final ContextoUsuarioService contextoUsuarioService;
    private final EvidenciaService evidenciaService;
    private final AuditoriaService auditoriaService;
    private final AuditoriaFacialService auditoriaFacialService;

    public IngresoExcepcionalService(IngresoRepository ingresoRepository, UsuarioRepository usuarioRepository,
                                     AmbienteExamenService ambienteExamenService,
                                     EstudianteExamenService estudianteExamenService,
                                     ContextoUsuarioService contextoUsuarioService,
                                     EvidenciaService evidenciaService, AuditoriaService auditoriaService,
                                     AuditoriaFacialService auditoriaFacialService) {
        this.ingresoRepository = ingresoRepository;
        this.usuarioRepository = usuarioRepository;
        this.ambienteExamenService = ambienteExamenService;
        this.estudianteExamenService = estudianteExamenService;
        this.contextoUsuarioService = contextoUsuarioService;
        this.evidenciaService = evidenciaService;
        this.auditoriaService = auditoriaService;
        this.auditoriaFacialService = auditoriaFacialService;
    }

    // -------------------------------------------------------------------------
    // CONSULTAR ESTUDIANTE (qué botones mostrar)
    // -------------------------------------------------------------------------

    /**
     * Consulta a un estudiante para un formulario.
     *
     * @param flujoIncidencia true cuando la consulta viene del formulario de
     *                        incidencias: el estado que se devuelve es el del
     *                        punto de control (NO_INSCRITO, SIN_INGRESO...).
     *                        false cuando viene del formulario de ingreso
     *                        excepcional (HABILITADO, INHABILITADO...).
     */
    @Transactional(readOnly = true)
    public ConsultaEstudianteDto consultar(Integer idAmbiente, String codSisOCi, boolean flujoIncidencia, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Ambiente ambiente = ambienteExamenService.obtener(idAmbiente);
        // El operador (ayudante) no gestiona incidencias: solo autoriza
        // ingresos excepcionales, y ese flujo se valida en otro lado.
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, false,
                "Consultar estudiante", ip);

        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        EstadoIngresoAula estadoAula = ambienteExamenService.estadoIngreso(info);
        AforoDto aforo = ambienteExamenService.aforo(idAmbiente);
        // Consulta desde el formulario de ingreso excepcional (no desde incidencias):
        // si no se puede autorizar, el intento queda en auditoría (criterios de QA).
        boolean flujoExcepcional = !flujoIncidencia;
        String bloqueoAula = estadoAula.cerrado()
                ? estadoAula.motivo()
                : aforo.capacidad() != null && aforo.ocupados() >= aforo.capacidad()
                ? "Aula llena (" + aforo.ocupados() + "/" + aforo.capacidad() + "). Solicite al Administrador reasignar el aula."
                : null;

        Optional<EstudianteEncontrado> encontrado = estudianteExamenService.buscar(codSisOCi);
        if (encontrado.isEmpty()) {
            return new ConsultaEstudianteDto("NO_ENCONTRADO",
                    "Estudiante no encontrado: no está registrado en el sistema, por eso no se puede autorizar su ingreso.",
                    null, null, null, null, null, false, true, false, aforo, estadoAula.cerrado());
        }

        EstudianteEncontrado est = encontrado.get();
        Integer codSis = est.estudiante().getCodsisestudiante();

        // En el flujo de incidencias solo se puede reportar a estudiantes de la materia del examen.
        // Esta validación debe ir antes de verificar el ingreso previo, para que un estudiante
        // que no pertenece a la materia no pueda ser reportado aunque tenga algún registro.
        if (flujoIncidencia && !estudianteExamenService.estaInscritoEnAsignatura(codSis, ambiente.getIdAsignatura())) {
            return new ConsultaEstudianteDto("NO_INSCRITO",
                    "El estudiante no está inscrito en la materia de este examen.",
                    codSis, est.usuario().getCiusuario(), est.nombreCompleto(), null, null,
                    false, false, false, aforo, estadoAula.cerrado());
        }

        Optional<Ingreso> ingresoPrevio = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                codSis, ambiente.getIdAsignatura(), ambiente.getIdExamen());

        if (ingresoPrevio.isPresent()) {
            Ingreso previo = ingresoPrevio.get();
            String aulaPrevia = nombreAula(previo.getIdAmbiente());
            boolean retirado = previo.estaRetirado();
            String mensaje = retirado
                    ? "El estudiante fue retirado de este examen y no puede volver a ingresar."
                    : mensajeDuplicado(previo, aulaPrevia);
            if (flujoExcepcional) {
                auditarIntentoRechazado(usuario, est, info, ambiente, mensaje, ip);
            }
            return new ConsultaEstudianteDto(retirado ? "RETIRADO" : "DUPLICADO", mensaje,
                    codSis, est.usuario().getCiusuario(), est.nombreCompleto(), previo.getHoraIngreso(),
                    aulaPrevia, false, true, !retirado, aforo, estadoAula.cerrado());
        }

        // En el flujo de incidencias, un estudiante que no ha ingresado al examen no puede
        // estar involucrado en una incidencia (no podría haber causado un incidente sin haber ingresado).
        if (flujoIncidencia) {
            return new ConsultaEstudianteDto("SIN_INGRESO",
                    "El estudiante no ha ingresado a este examen; no se puede registrar una incidencia para él.",
                    codSis, est.usuario().getCiusuario(), est.nombreCompleto(), null, null,
                    false, false, false, aforo, estadoAula.cerrado());
        }

        HabilitacionExamen habilitacion = estudianteExamenService.habilitacion(codSis, ambiente);
        if (habilitacion.estado() == EstadoHabilitacion.HABILITADO) {
            return new ConsultaEstudianteDto("HABILITADO",
                    "Está habilitado: debe registrar su ingreso por el control normal.",
                    codSis, est.usuario().getCiusuario(), est.nombreCompleto(), null, null,
                    false, true, false, aforo, estadoAula.cerrado());
        }

        String estado = habilitacion.estado() == EstadoHabilitacion.INHABILITADO ? "INHABILITADO" : "NO_EN_LISTA";
        String mensaje = habilitacion.estado() == EstadoHabilitacion.INHABILITADO
                ? "Inhabilitado para este examen" + (habilitacion.observacion() == null ? "." : ": " + habilitacion.observacion())
                : "No figura en la lista de habilitados de este examen.";
        boolean autorizable = !usuario.esOperador() && bloqueoAula == null;
        if (!usuario.esOperador() && bloqueoAula != null) {
            mensaje = mensaje + " No se puede autorizar el ingreso excepcional: " + bloqueoAula;
            if (flujoExcepcional) {
                auditarIntentoRechazado(usuario, est, info, ambiente, bloqueoAula, ip);
            }
        }
        return new ConsultaEstudianteDto(estado, mensaje, codSis, est.usuario().getCiusuario(), est.nombreCompleto(),
                null, null, autorizable, true, false, aforo, estadoAula.cerrado());
    }

    // -------------------------------------------------------------------------
    // AUTORIZAR
    // -------------------------------------------------------------------------

    /** Resultado de una autorización; {@code yaExistia} es true en reintentos offline. */
    public record AutorizacionExcepcional(IngresoExcepcionalDto ingreso, boolean yaExistia) {
    }

    @Transactional
    public IngresoExcepcionalDto autorizar(Integer idAmbiente, Integer codSis, String motivoTexto, String observacion,
                                           MultipartFile respaldo, String ip) {
        return autorizarConDetalle(idAmbiente, codSis, motivoTexto, observacion, respaldo, null, null, ip).ingreso();
    }

    /**
     * Variante usada por la sincronización offline (HU21). Cuando
     * {@code registradoEn} viene informado se conserva la hora real del evento
     * y no se exige que el ingreso siga abierto: el registro se hizo mientras
     * el examen estaba en curso y se está enviando después. Un reintento del
     * mismo registro (mismo {@code clientUuid}) devuelve
     * {@code yaExistia = true} en lugar de duplicar.
     */
    @Transactional
    public AutorizacionExcepcional autorizarConDetalle(Integer idAmbiente, Integer codSis, String motivoTexto,
                                                        String observacion, MultipartFile respaldo,
                                                        OffsetDateTime registradoEn, String clientUuid, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Ambiente ambiente = ambienteExamenService.obtener(idAmbiente);
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, true,
                "Autorizar ingreso excepcional", ip);
        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        boolean desdeSincronizacion = registradoEn != null;
        LocalDateTime horaEvento = desdeSincronizacion
                ? registradoEn.atZoneSameInstant(HoraOficial.ZONA).toLocalDateTime()
                : HoraOficial.ahora();

        // Idempotencia por clave de solicitud (HU21): si este registro offline ya
        // llegó al servidor, se devuelve el ingreso ya creado en vez de duplicarlo.
        if (clientUuid != null && !clientUuid.isBlank()) {
            Optional<Ingreso> yaSincronizado = ingresoRepository.findByClientUuid(clientUuid);
            if (yaSincronizado.isPresent()) {
                Ingreso existente = yaSincronizado.get();
                EstudianteEncontrado estExistente = estudianteExamenService.buscarPorCodSis(codSis).orElse(null);
                String nombre = estExistente == null ? null : estExistente.nombreCompleto();
                return new AutorizacionExcepcional(
                        aDto(existente, info, nombre, ambienteExamenService.aforo(idAmbiente)), true);
            }
        }

        MotivoExcepcion motivo = leerMotivo(motivoTexto);
        // El operador autoriza únicamente desde el flujo facial del control de
        // ingreso; el resto de motivos sigue siendo potestad del docente/admin.
        if (usuario.esOperador() && !motivo.esFacial()) {
            throw new SolicitudInvalidaException(
                    "El operador solo puede autorizar ingresos excepcionales por motivos faciales.");
        }
        String observacionLimpia = observacion == null ? "" : observacion.trim();
        if (observacionLimpia.length() < OBSERVACION_MIN || observacionLimpia.length() > OBSERVACION_MAX) {
            throw new SolicitudInvalidaException("La observación debe tener entre " + OBSERVACION_MIN + " y "
                    + OBSERVACION_MAX + " caracteres.");
        }
        evidenciaService.validar(respaldo);

        String contexto = info.asignatura() + " · examen " + ambiente.getIdExamen() + " · " + info.aula()
                + " · motivo=" + motivo.name();

        EstudianteEncontrado est = estudianteExamenService.buscarPorCodSis(codSis).orElseThrow(() ->
                rechazar(usuario, null, contexto + " · Código SIS " + codSis + " no encontrado", ip,
                        new RecursoNoEncontradoException("Estudiante no encontrado.")));
        String correoEstudiante = est.usuario().getCorreousuario();

        Optional<Ingreso> previo = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                codSis, ambiente.getIdAsignatura(), ambiente.getIdExamen());
        if (previo.isPresent()) {
            Ingreso existente = previo.get();
            String aulaPrevia = nombreAula(existente.getIdAmbiente());
            String mensaje = existente.estaRetirado()
                    ? "El estudiante fue retirado de este examen y no puede volver a ingresar."
                    : mensajeDuplicado(existente, aulaPrevia);
            if (desdeSincronizacion) {
                // Reintento de un lote offline: el ingreso excepcional ya llegó al
                // servidor (la idempotencia por clientUuid ya se comprobó arriba).
                if (existente.getTipoIngreso() == TipoIngreso.EXCEPCIONAL && !existente.estaRetirado()) {
                    return new AutorizacionExcepcional(
                            aDto(existente, info, est.nombreCompleto(), ambienteExamenService.aforo(idAmbiente)), true);
                }
                // El estudiante entró por el control normal: el registro offline no
                // aplica. Se rechaza (no se reintenta) para que el docente lo sepa.
                throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip,
                        new ConflictoEstadoException(mensaje));
            }
            if (esRepeticion(existente, usuario, idAmbiente)) {
                return new AutorizacionExcepcional(
                        aDto(existente, info, est.nombreCompleto(), ambienteExamenService.aforo(idAmbiente)), true);
            }
            throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip, new ConflictoEstadoException(mensaje));
        }

        if (!desdeSincronizacion) {
            // Un motivo facial se autoriza incluso si el estudiante está habilitado:
            // el facial es obligatorio cuando tiene enrolamiento, y si falló o no
            // pudo hacerse, el ingreso debe quedar como excepcional.
            if (!motivo.esFacial()
                    && estudianteExamenService.habilitacion(codSis, ambiente).estado() == EstadoHabilitacion.HABILITADO) {
                String mensaje = "El estudiante está habilitado: debe registrar su ingreso por el control normal.";
                throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip, new ConflictoEstadoException(mensaje));
            }

            EstadoIngresoAula estadoAula = ambienteExamenService.estadoIngreso(info);
            if (estadoAula.cerrado()) {
                throw rechazar(usuario, correoEstudiante, contexto + " · " + estadoAula.motivo(), ip,
                        new ConflictoEstadoException(estadoAula.motivo()));
            }
        } else {
            // El registro offline se hizo dentro del examen: se valida la fecha
            // del evento, no la hora actual en la que se sincroniza.
            ambienteExamenService.verificarHoraEventoOffline(info, horaEvento);
        }

        EvidenciaSubida evidencia = evidenciaService.subir(respaldo, "control-ingreso/ingresos-excepcionales");
        Ingreso ingreso;
        try {
            if (!desdeSincronizacion) {
                // Desde aquí hasta el final de la transacción nadie más puede
                // registrar ingresos excepcionales en esta aula: el aforo no se pasa.
                ingresoRepository.bloquearAmbiente(idAmbiente);
                AforoDto aforo = ambienteExamenService.aforo(idAmbiente);
                if (aforo.capacidad() != null && aforo.ocupados() >= aforo.capacidad()) {
                    String mensaje = "Aula llena (" + aforo.ocupados() + "/" + aforo.capacidad()
                            + "). Solicite al Administrador reasignar el aula.";
                    throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip, new ConflictoEstadoException(mensaje));
                }
            }

            ingreso = new Ingreso();
            ingreso.setIdUsuarioEstudiante(est.estudiante().getIdusuario());
            ingreso.setCodsisEstudiante(codSis);
            ingreso.setIdAsignatura(ambiente.getIdAsignatura());
            ingreso.setIdExamen(ambiente.getIdExamen());
            ingreso.setIdAmbiente(idAmbiente);
            ingreso.setIdUsuarioRegistra(usuario.idUsuario());
            ingreso.setHoraIngreso(horaEvento);
            ingreso.setFechaIngreso(horaEvento.toLocalDate());
            ingreso.setTipoIngreso(TipoIngreso.EXCEPCIONAL);
            // Lo registra a mano el docente/admin, no un escaneo (columna de la HU05).
            ingreso.setMetodoIngreso(MetodoIngreso.MANUAL);
            ingreso.setMotivoExcepcion(motivo);
            ingreso.setObservacionIngreso(observacionLimpia);
            ingreso.setEvidenciaUrl(evidencia == null ? null : evidencia.url());
            // Clave de solicitud del dispositivo: hace idempotente el reintento
            // de la sincronización offline (HU21).
            if (clientUuid != null && !clientUuid.isBlank()) {
                ingreso.setClientUuid(clientUuid);
            }
            ingreso = ingresoRepository.saveAndFlush(ingreso);
        } catch (DataIntegrityViolationException e) {
            // Otro usuario registró el ingreso de este estudiante en el mismo instante (UNIQUE de la BD).
            evidenciaService.eliminarSinFallar(evidencia);
            String mensaje = "El estudiante ya registró su ingreso a este examen.";
            throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip, new ConflictoEstadoException(mensaje));
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        try {
            auditoriaService.registrarEnTransaccion("INGRESO_EXCEPCIONAL", usuario.correo(), correoEstudiante,
                    contexto + " · ingreso #" + ingreso.getIdIngreso()
                            + (desdeSincronizacion ? " · registrado offline" : ""), ip);
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        if (motivo.esFacial()) {
            auditoriaFacialService.publicar("FACIAL_INGRESO_MANUAL_EXCEPCIONAL", usuario.correo(), correoEstudiante,
                    ip, desdeSincronizacion ? "sincronizacion_offline" : "control_presencial",
                    "sis=" + codSis + " | estudiante_correo=" + correoEstudiante + " | examen="
                            + ambiente.getIdExamen() + " | ambiente=" + idAmbiente + " | resultado=autorizado"
                            + " | motivo=" + motivo.name() + " | ingreso=" + ingreso.getIdIngreso());
        }

        return new AutorizacionExcepcional(
                aDto(ingreso, info, est.nombreCompleto(), ambienteExamenService.aforo(idAmbiente)), false);
    }

    // -------------------------------------------------------------------------
    // LISTAR (pestaña "Ingresos excepcionales")
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<IngresoExcepcionalDto> listar(Integer idExamen, Integer idAmbiente, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        List<Ambiente> ambientes = ambienteExamenService.ambientesVisibles(usuario, idExamen, idAmbiente, false,
                "Listar ingresos excepcionales", ip);
        if (ambientes.isEmpty()) {
            return List.of();
        }
        Map<Integer, AmbienteInfo> infos = ambienteExamenService.describir(ambientes);
        List<Ingreso> ingresos = ingresoRepository.findByTipoIngresoAndIdAmbienteInOrderByHoraIngresoDesc(
                TipoIngreso.EXCEPCIONAL, infos.keySet());

        Set<Integer> idsUsuarios = new HashSet<>();
        ingresos.forEach(i -> {
            idsUsuarios.add(i.getIdUsuarioEstudiante());
            idsUsuarios.add(i.getIdUsuarioRegistra());
        });
        Map<Integer, Usuario> usuarios = usuarioRepository.findAllById(idsUsuarios).stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, Function.identity()));

        return ingresos.stream()
                .map(i -> aDto(i, infos.get(i.getIdAmbiente()), nombre(usuarios.get(i.getIdUsuarioEstudiante())),
                        nombre(usuarios.get(i.getIdUsuarioRegistra())), null))
                .toList();
    }

    // -------------------------------------------------------------------------
    // Auxiliares
    // -------------------------------------------------------------------------

    /** Intento de ingreso excepcional que se rechaza ya al buscar al estudiante. */
    private void auditarIntentoRechazado(UsuarioActual usuario, EstudianteEncontrado est, AmbienteInfo info,
                                         Ambiente ambiente, String motivo, String ip) {
        auditoriaService.registrar("INGRESO_EXCEPCIONAL_RECHAZADO", usuario.correo(), est.usuario().getCorreousuario(),
                info.asignatura() + " · examen " + ambiente.getIdExamen() + " · " + info.aula() + " · " + motivo, ip);
    }

    /** Audita el rechazo y devuelve la excepción para lanzarla. */
    private RuntimeException rechazar(UsuarioActual usuario, String correoEstudiante, String detalles, String ip,
                                      RuntimeException excepcion) {
        auditoriaService.registrar("INGRESO_EXCEPCIONAL_RECHAZADO", usuario.correo(), correoEstudiante, detalles, ip);
        return excepcion;
    }

    private boolean esRepeticion(Ingreso existente, UsuarioActual usuario, Integer idAmbiente) {
        return existente.getTipoIngreso() == TipoIngreso.EXCEPCIONAL
                && !existente.estaRetirado()
                && usuario.idUsuario().equals(existente.getIdUsuarioRegistra())
                && idAmbiente.equals(existente.getIdAmbiente())
                && existente.getHoraIngreso() != null
                && Duration.between(existente.getHoraIngreso(), HoraOficial.ahora()).compareTo(VENTANA_REPETICION) <= 0;
    }

    /**
     * En la sincronización offline se conserva la hora del dispositivo, así que
     * el control de "examen en curso" se hace sobre esa marca y no sobre la
     * hora actual. Se toleran 15 minutos de desfase de reloj
     * ({@link AmbienteExamenService#TOLERANCIA_RELOJ_MINUTOS}).
     */
    private MotivoExcepcion leerMotivo(String motivoTexto) {
        if (motivoTexto == null || motivoTexto.isBlank()) {
            throw new SolicitudInvalidaException("El motivo es obligatorio.");
        }
        try {
            return MotivoExcepcion.valueOf(motivoTexto.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new SolicitudInvalidaException("Motivo no válido: " + motivoTexto + ".");
        }
    }

    private String mensajeDuplicado(Ingreso previo, String aula) {
        String hora = previo.getHoraIngreso() == null ? "" : " a las " + previo.getHoraIngreso().format(FORMATO_HORA);
        return "El estudiante ya registró su ingreso" + hora + (aula == null ? "" : " en " + aula) + ".";
    }

    private String nombreAula(Integer idAmbiente) {
        try {
            return ambienteExamenService.describir(ambienteExamenService.obtener(idAmbiente)).aula();
        } catch (RecursoNoEncontradoException e) {
            return null;
        }
    }

    private IngresoExcepcionalDto aDto(Ingreso i, AmbienteInfo info, String estudiante, AforoDto aforo) {
        String autorizadoPor = usuarioRepository.findById(i.getIdUsuarioRegistra()).map(this::nombre).orElse(null);
        return aDto(i, info, estudiante, autorizadoPor, aforo);
    }

    private IngresoExcepcionalDto aDto(Ingreso i, AmbienteInfo info, String estudiante, String autorizadoPor,
                                       AforoDto aforo) {
        MotivoExcepcion motivo = i.getMotivoExcepcion();
        return new IngresoExcepcionalDto(i.getIdIngreso(), i.getCodsisEstudiante(), estudiante,
                motivo == null ? null : motivo.name(), motivo == null ? null : motivo.getEtiqueta(),
                i.getObservacionIngreso(), i.getHoraIngreso(), i.getIdAmbiente(),
                info == null ? null : info.aula(), info == null ? null : info.asignatura(), i.getIdExamen(),
                autorizadoPor, i.getEvidenciaUrl(), aforo);
    }

    private String nombre(Usuario u) {
        return u == null ? null : (u.getNombreusuario() + " " + u.getApellidousuario()).trim();
    }
}
