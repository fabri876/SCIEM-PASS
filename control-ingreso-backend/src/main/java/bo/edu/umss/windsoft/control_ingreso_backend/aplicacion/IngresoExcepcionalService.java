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
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * HU06 · Ingreso excepcional: solo DOCENTE (de la materia) y ADMINISTRADOR.
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

    public IngresoExcepcionalService(IngresoRepository ingresoRepository, UsuarioRepository usuarioRepository,
                                     AmbienteExamenService ambienteExamenService,
                                     EstudianteExamenService estudianteExamenService,
                                     ContextoUsuarioService contextoUsuarioService,
                                     EvidenciaService evidenciaService, AuditoriaService auditoriaService) {
        this.ingresoRepository = ingresoRepository;
        this.usuarioRepository = usuarioRepository;
        this.ambienteExamenService = ambienteExamenService;
        this.estudianteExamenService = estudianteExamenService;
        this.contextoUsuarioService = contextoUsuarioService;
        this.evidenciaService = evidenciaService;
        this.auditoriaService = auditoriaService;
    }

    // -------------------------------------------------------------------------
    // CONSULTAR ESTUDIANTE (qué botones mostrar)
    // -------------------------------------------------------------------------

    /**
     * @param permiteOperador true cuando lo consulta el formulario de incidencias
     *                        (el operador puede registrar incidencias, pero nunca
     *                        autorizar ingresos excepcionales).
     */
    @Transactional(readOnly = true)
    public ConsultaEstudianteDto consultar(Integer idAmbiente, String codSisOCi, boolean permiteOperador, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Ambiente ambiente = ambienteExamenService.obtener(idAmbiente);
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, permiteOperador,
                "Consultar estudiante", ip);

        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        EstadoIngresoAula estadoAula = ambienteExamenService.estadoIngreso(info);
        AforoDto aforo = ambienteExamenService.aforo(idAmbiente);
        boolean hayCupo = aforo.capacidad() == null || aforo.ocupados() < aforo.capacidad();
        boolean puedeAutorizar = !usuario.esOperador() && !estadoAula.cerrado() && hayCupo;

        Optional<EstudianteEncontrado> encontrado = estudianteExamenService.buscar(codSisOCi);
        if (encontrado.isEmpty()) {
            return new ConsultaEstudianteDto("NO_ENCONTRADO", "Estudiante no encontrado.", null, null, null,
                    null, null, false, true, false, aforo, estadoAula.cerrado());
        }

        EstudianteEncontrado est = encontrado.get();
        Integer codSis = est.estudiante().getCodsisestudiante();
        Optional<Ingreso> ingresoPrevio = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                codSis, ambiente.getIdAsignatura(), ambiente.getIdExamen());

        if (ingresoPrevio.isPresent()) {
            Ingreso previo = ingresoPrevio.get();
            String aulaPrevia = nombreAula(previo.getIdAmbiente());
            if (previo.estaRetirado()) {
                return new ConsultaEstudianteDto("RETIRADO", "El estudiante fue retirado de este examen.",
                        codSis, est.usuario().getCiusuario(), est.nombreCompleto(), previo.getHoraIngreso(),
                        aulaPrevia, false, true, false, aforo, estadoAula.cerrado());
            }
            return new ConsultaEstudianteDto("DUPLICADO", mensajeDuplicado(previo, aulaPrevia),
                    codSis, est.usuario().getCiusuario(), est.nombreCompleto(), previo.getHoraIngreso(),
                    aulaPrevia, false, true, true, aforo, estadoAula.cerrado());
        }

        HabilitacionExamen habilitacion = estudianteExamenService.habilitacion(codSis, ambiente);
        String estado;
        String mensaje;
        boolean autorizable = puedeAutorizar;
        switch (habilitacion.estado()) {
            case HABILITADO -> {
                estado = "HABILITADO";
                mensaje = "Está habilitado: debe registrar su ingreso por el control normal.";
                autorizable = false;
            }
            case INHABILITADO -> {
                estado = "INHABILITADO";
                mensaje = "Inhabilitado para este examen"
                        + (habilitacion.observacion() == null ? "." : ": " + habilitacion.observacion());
            }
            default -> {
                estado = "NO_EN_LISTA";
                mensaje = "No figura en la lista de habilitados de este examen.";
            }
        }
        if (autorizable && estadoAula.cerrado()) {
            mensaje = mensaje + " " + estadoAula.motivo();
        }
        return new ConsultaEstudianteDto(estado, mensaje, codSis, est.usuario().getCiusuario(), est.nombreCompleto(),
                null, null, autorizable, true, false, aforo, estadoAula.cerrado());
    }

    // -------------------------------------------------------------------------
    // AUTORIZAR
    // -------------------------------------------------------------------------

    @Transactional
    public IngresoExcepcionalDto autorizar(Integer idAmbiente, Integer codSis, String motivoTexto, String observacion,
                                           MultipartFile respaldo, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Ambiente ambiente = ambienteExamenService.obtener(idAmbiente);
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, false,
                "Autorizar ingreso excepcional", ip);
        AmbienteInfo info = ambienteExamenService.describir(ambiente);

        MotivoExcepcion motivo = leerMotivo(motivoTexto);
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
            if (esRepeticion(existente, usuario, idAmbiente)) {
                return aDto(existente, info, est.nombreCompleto(), ambienteExamenService.aforo(idAmbiente));
            }
            String aulaPrevia = nombreAula(existente.getIdAmbiente());
            String mensaje = existente.estaRetirado()
                    ? "El estudiante fue retirado de este examen y no puede volver a ingresar."
                    : mensajeDuplicado(existente, aulaPrevia);
            throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip, new ConflictoEstadoException(mensaje));
        }

        if (estudianteExamenService.habilitacion(codSis, ambiente).estado() == EstadoHabilitacion.HABILITADO) {
            String mensaje = "El estudiante está habilitado: debe registrar su ingreso por el control normal.";
            throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip, new ConflictoEstadoException(mensaje));
        }

        EstadoIngresoAula estadoAula = ambienteExamenService.estadoIngreso(info);
        if (estadoAula.cerrado()) {
            throw rechazar(usuario, correoEstudiante, contexto + " · " + estadoAula.motivo(), ip,
                    new ConflictoEstadoException(estadoAula.motivo()));
        }

        EvidenciaSubida evidencia = evidenciaService.subir(respaldo, "control-ingreso/ingresos-excepcionales");
        Ingreso ingreso;
        try {
            // Desde aquí hasta el final de la transacción nadie más puede
            // registrar ingresos excepcionales en esta aula: el aforo no se pasa.
            ingresoRepository.bloquearAmbiente(idAmbiente);
            AforoDto aforo = ambienteExamenService.aforo(idAmbiente);
            if (aforo.capacidad() != null && aforo.ocupados() >= aforo.capacidad()) {
                String mensaje = "Aula llena (" + aforo.ocupados() + "/" + aforo.capacidad()
                        + "). Solicite al Administrador reasignar el aula.";
                throw rechazar(usuario, correoEstudiante, contexto + " · " + mensaje, ip, new ConflictoEstadoException(mensaje));
            }

            ingreso = new Ingreso();
            ingreso.setIdUsuarioEstudiante(est.estudiante().getIdusuario());
            ingreso.setCodsisEstudiante(codSis);
            ingreso.setIdAsignatura(ambiente.getIdAsignatura());
            ingreso.setIdExamen(ambiente.getIdExamen());
            ingreso.setIdAmbiente(idAmbiente);
            ingreso.setIdUsuarioRegistra(usuario.idUsuario());
            ingreso.setHoraIngreso(HoraOficial.ahora());
            ingreso.setFechaIngreso(HoraOficial.hoy());
            ingreso.setTipoIngreso(TipoIngreso.EXCEPCIONAL);
            // Lo registra a mano el docente/admin, no un escaneo (columna de la HU05).
            ingreso.setMetodoIngreso(MetodoIngreso.MANUAL);
            ingreso.setMotivoExcepcion(motivo);
            ingreso.setObservacionIngreso(observacionLimpia);
            ingreso.setEvidenciaUrl(evidencia == null ? null : evidencia.url());
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

        auditoriaService.registrar("INGRESO_EXCEPCIONAL", usuario.correo(), correoEstudiante,
                contexto + " · ingreso #" + ingreso.getIdIngreso(), ip);

        return aDto(ingreso, info, est.nombreCompleto(), ambienteExamenService.aforo(idAmbiente));
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
