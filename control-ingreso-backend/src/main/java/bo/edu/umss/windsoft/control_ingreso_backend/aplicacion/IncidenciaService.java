package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService.AmbienteInfo;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService.UsuarioActual;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService.EstudianteEncontrado;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EvidenciaService.EvidenciaSubida;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Expulsion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Incidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.SeveridadIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExpulsionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IncidenciaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CatalogosIncidenciaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EventoIncidenciaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaListaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaResumenDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.OpcionCatalogoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.TotalesIncidenciasDto;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * HU06 · Incidencias.
 * - Registrar: DOCENTE (de la materia), ADMINISTRADOR y OPERADOR.
 * - Ver, pasar a revisión y cerrar: solo DOCENTE (de la materia) y ADMINISTRADOR.
 * Una incidencia no se edita ni se borra; cada cambio queda en auditoría.
 */
@Service
public class IncidenciaService {

    private static final int DESCRIPCION_MIN = 15;
    private static final int DESCRIPCION_MAX = 500;

    private final IncidenciaRepository incidenciaRepository;
    private final IngresoRepository ingresoRepository;
    private final ExpulsionRepository expulsionRepository;
    private final UsuarioRepository usuarioRepository;
    private final AmbienteExamenService ambienteExamenService;
    private final EstudianteExamenService estudianteExamenService;
    private final ContextoUsuarioService contextoUsuarioService;
    private final EvidenciaService evidenciaService;
    private final AuditoriaService auditoriaService;

    public IncidenciaService(IncidenciaRepository incidenciaRepository, IngresoRepository ingresoRepository,
                             ExpulsionRepository expulsionRepository, UsuarioRepository usuarioRepository,
                             AmbienteExamenService ambienteExamenService,
                             EstudianteExamenService estudianteExamenService,
                             ContextoUsuarioService contextoUsuarioService, EvidenciaService evidenciaService,
                             AuditoriaService auditoriaService) {
        this.incidenciaRepository = incidenciaRepository;
        this.ingresoRepository = ingresoRepository;
        this.expulsionRepository = expulsionRepository;
        this.usuarioRepository = usuarioRepository;
        this.ambienteExamenService = ambienteExamenService;
        this.estudianteExamenService = estudianteExamenService;
        this.contextoUsuarioService = contextoUsuarioService;
        this.evidenciaService = evidenciaService;
        this.auditoriaService = auditoriaService;
    }

    public CatalogosIncidenciaDto catalogos() {
        return new CatalogosIncidenciaDto(
                Arrays.stream(TipoIncidencia.values()).map(t -> new OpcionCatalogoDto(t.name(), t.getEtiqueta())).toList(),
                Arrays.stream(SeveridadIncidencia.values()).map(s -> new OpcionCatalogoDto(s.name(), s.getEtiqueta())).toList(),
                Arrays.stream(EstadoIncidencia.values()).map(e -> new OpcionCatalogoDto(e.name(), e.getEtiqueta())).toList(),
                Arrays.stream(MotivoExcepcion.values()).map(m -> new OpcionCatalogoDto(m.name(), m.getEtiqueta())).toList());
    }

    // -------------------------------------------------------------------------
    // REGISTRAR
    // -------------------------------------------------------------------------

    @Transactional
    public IncidenciaDetalleDto registrar(String claveSolicitudTexto, Integer idAmbiente, String tipoTexto,
                                          String severidadTexto, String descripcion, Integer codSisEstudiante,
                                          boolean retirarEstudiante, MultipartFile evidenciaArchivo, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        UUID claveSolicitud = leerClave(claveSolicitudTexto);

        // Doble clic / reintento: la misma clave devuelve la incidencia ya creada.
        Optional<Incidencia> yaRegistrada = incidenciaRepository.findByClaveSolicitud(claveSolicitud);
        if (yaRegistrada.isPresent()) {
            if (!usuario.idUsuario().equals(yaRegistrada.get().getIdUsuarioReporta())) {
                throw new ConflictoEstadoException("La clave de la solicitud ya fue usada. Vuelva a abrir el formulario.");
            }
            return armarDetalle(yaRegistrada.get(), ambienteExamenService.obtener(yaRegistrada.get().getIdAmbiente()));
        }

        Ambiente ambiente = ambienteExamenService.obtener(idAmbiente);
        contextoUsuarioService.verificarAccesoMateria(usuario, ambiente.getIdAsignatura(), true,
                "Registrar incidencia", ip);

        TipoIncidencia tipo = leerEnum(TipoIncidencia.class, tipoTexto, "El tipo de incidencia");
        SeveridadIncidencia severidad = leerEnum(SeveridadIncidencia.class, severidadTexto, "La severidad");
        String descripcionLimpia = descripcion == null ? "" : descripcion.trim();
        if (descripcionLimpia.length() < DESCRIPCION_MIN || descripcionLimpia.length() > DESCRIPCION_MAX) {
            throw new SolicitudInvalidaException("La descripción debe tener entre " + DESCRIPCION_MIN + " y "
                    + DESCRIPCION_MAX + " caracteres.");
        }
        evidenciaService.validar(evidenciaArchivo);

        EstudianteEncontrado estudiante = null;
        if (codSisEstudiante != null) {
            estudiante = estudianteExamenService.buscarPorCodSis(codSisEstudiante)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Estudiante no encontrado."));
        }

        Ingreso ingresoARetirar = null;
        if (retirarEstudiante) {
            if (estudiante == null) {
                throw new SolicitudInvalidaException("Para retirar a un estudiante debe indicar quién es.");
            }
            ingresoARetirar = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                            codSisEstudiante, ambiente.getIdAsignatura(), ambiente.getIdExamen())
                    .orElseThrow(() -> new ConflictoEstadoException(
                            "El estudiante no ingresó a este examen; no se puede retirar."));
            if (ingresoARetirar.estaRetirado()) {
                throw new ConflictoEstadoException("El estudiante ya fue retirado de este examen.");
            }
        }

        EvidenciaSubida evidencia = evidenciaService.subir(evidenciaArchivo, "control-ingreso/incidencias");
        Incidencia incidencia = new Incidencia();
        Expulsion expulsion = null;
        try {
            incidencia.setClaveSolicitud(claveSolicitud);
            incidencia.setIdAmbiente(idAmbiente);
            incidencia.setIdUsuarioReporta(usuario.idUsuario());
            if (estudiante != null) {
                incidencia.setIdUsuarioEstudiante(estudiante.estudiante().getIdusuario());
                incidencia.setCodsisEstudiante(estudiante.estudiante().getCodsisestudiante());
            }
            incidencia.setTipo(tipo);
            incidencia.setSeveridad(severidad);
            incidencia.setDescripcion(descripcionLimpia);
            incidencia.setEvidenciaUrl(evidencia == null ? null : evidencia.url());
            incidencia.setEstado(EstadoIncidencia.ABIERTA);
            incidencia.setFechaHora(HoraOficial.ahora());
            incidencia = incidenciaRepository.saveAndFlush(incidencia);

            if (ingresoARetirar != null) {
                expulsion = new Expulsion();
                expulsion.setIdIngreso(ingresoARetirar.getIdIngreso());
                expulsion.setIdUsuario(usuario.idUsuario());
                expulsion.setMotivoExpulsion(tipo.getEtiqueta() + ": " + descripcionLimpia);
                expulsion.setFechaExpulsion(HoraOficial.hoy());
                expulsion.setHoraExpulsion(HoraOficial.ahora());
                expulsion.setIdIncidencia(incidencia.getIdIncidencia());
                expulsion = expulsionRepository.save(expulsion);

                ingresoARetirar.setIdExpulsion(expulsion.getIdExpulsion());
                ingresoRepository.saveAndFlush(ingresoARetirar);
            }
        } catch (DataIntegrityViolationException e) {
            // La misma clave llegó dos veces al mismo tiempo (UNIQUE de la BD).
            evidenciaService.eliminarSinFallar(evidencia);
            throw new ConflictoEstadoException("Esta incidencia ya fue registrada.");
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        String afectado = estudiante != null ? estudiante.usuario().getCorreousuario() : usuario.correo();
        String contexto = info.asignatura() + " · examen " + ambiente.getIdExamen() + " · " + info.aula();
        auditoriaService.registrar("INCIDENCIA_REGISTRADA", usuario.correo(), afectado,
                incidencia.getCodigo() + " · " + tipo.name() + " · " + severidad.name() + " · " + contexto, ip);
        if (expulsion != null) {
            auditoriaService.registrar("EXPULSION_REGISTRADA", usuario.correo(), afectado,
                    incidencia.getCodigo() + " · ingreso #" + ingresoARetirar.getIdIngreso() + " retirado · " + contexto, ip);
        }

        return armarDetalle(incidencia, ambiente);
    }

    // -------------------------------------------------------------------------
    // LISTAR / DETALLE / CONTADOR
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public IncidenciaListaDto listar(Integer idExamen, Integer idAmbiente, String tipoTexto, String estadoTexto,
                                     String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        TipoIncidencia tipo = tipoTexto == null || tipoTexto.isBlank()
                ? null : leerEnum(TipoIncidencia.class, tipoTexto, "El tipo de incidencia");
        EstadoIncidencia estado = estadoTexto == null || estadoTexto.isBlank()
                ? null : leerEnum(EstadoIncidencia.class, estadoTexto, "El estado");

        List<Ambiente> ambientes = ambienteExamenService.ambientesVisibles(usuario, idExamen, idAmbiente, false,
                "Listar incidencias", ip);
        if (ambientes.isEmpty()) {
            return new IncidenciaListaDto(new TotalesIncidenciasDto(0, 0, 0), List.of());
        }
        Map<Integer, AmbienteInfo> infos = ambienteExamenService.describir(ambientes);

        List<Incidencia> delFiltro = incidenciaRepository.findByIdAmbienteInOrderByFechaHoraDesc(infos.keySet()).stream()
                .filter(i -> tipo == null || i.getTipo() == tipo)
                .toList();

        TotalesIncidenciasDto totales = new TotalesIncidenciasDto(
                delFiltro.stream().filter(i -> i.getEstado() == EstadoIncidencia.ABIERTA).count(),
                delFiltro.stream().filter(i -> i.getEstado() == EstadoIncidencia.EN_REVISION).count(),
                delFiltro.stream().filter(i -> i.getEstado() == EstadoIncidencia.CERRADA).count());

        List<Incidencia> visibles = delFiltro.stream()
                .filter(i -> estado == null || i.getEstado() == estado)
                .toList();

        Set<Integer> idsUsuarios = new HashSet<>();
        visibles.forEach(i -> {
            idsUsuarios.add(i.getIdUsuarioReporta());
            if (i.getIdUsuarioEstudiante() != null) {
                idsUsuarios.add(i.getIdUsuarioEstudiante());
            }
        });
        Map<Integer, Usuario> usuarios = usuariosPorId(idsUsuarios);

        List<IncidenciaResumenDto> filas = visibles.stream().map(i -> {
            AmbienteInfo info = infos.get(i.getIdAmbiente());
            return new IncidenciaResumenDto(i.getIdIncidencia(), i.getCodigo(), i.getFechaHora(), i.getIdAmbiente(),
                    info.aula(), info.asignatura(), info.ambiente().getIdExamen(),
                    i.getTipo().name(), i.getTipo().getEtiqueta(),
                    i.getSeveridad().name(), i.getSeveridad().getEtiqueta(),
                    i.getEstado().name(), i.getEstado().getEtiqueta(),
                    nombre(usuarios.get(i.getIdUsuarioReporta())),
                    nombre(usuarios.get(i.getIdUsuarioEstudiante())));
        }).toList();

        return new IncidenciaListaDto(totales, filas);
    }

    @Transactional(readOnly = true)
    public IncidenciaDetalleDto detalle(Integer idIncidencia, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Incidencia incidencia = obtener(idIncidencia);
        Ambiente ambiente = ambienteExamenService.obtener(incidencia.getIdAmbiente());
        contextoUsuarioService.verificarAccesoMateria(usuario, ambiente.getIdAsignatura(), false,
                "Ver incidencia " + incidencia.getCodigo(), ip);
        return armarDetalle(incidencia, ambiente);
    }

    /** Para el número junto a "Incidencias" en el menú lateral. */
    @Transactional(readOnly = true)
    public long contarAbiertas(String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        List<Ambiente> ambientes = ambienteExamenService.ambientesVisibles(usuario, null, null, false,
                "Contar incidencias abiertas", ip);
        if (ambientes.isEmpty()) {
            return 0;
        }
        Set<Integer> ids = ambientes.stream().map(Ambiente::getIdAmbiente).collect(Collectors.toSet());
        return incidenciaRepository.findByIdAmbienteInOrderByFechaHoraDesc(ids).stream()
                .filter(i -> i.getEstado() == EstadoIncidencia.ABIERTA)
                .count();
    }

    // -------------------------------------------------------------------------
    // CAMBIOS DE ESTADO
    // -------------------------------------------------------------------------

    @Transactional
    public IncidenciaDetalleDto marcarEnRevision(Integer idIncidencia, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Incidencia incidencia = obtener(idIncidencia);
        Ambiente ambiente = ambienteExamenService.obtener(incidencia.getIdAmbiente());
        contextoUsuarioService.verificarAccesoMateria(usuario, ambiente.getIdAsignatura(), false,
                "Marcar en revisión " + incidencia.getCodigo(), ip);

        if (incidencia.getEstado() == EstadoIncidencia.CERRADA) {
            throw new ConflictoEstadoException("La incidencia está cerrada y ya no se puede modificar.");
        }
        if (incidencia.getEstado() != EstadoIncidencia.ABIERTA) {
            throw new ConflictoEstadoException("La incidencia ya está en revisión.");
        }

        incidencia.setEstado(EstadoIncidencia.EN_REVISION);
        incidencia.setFechaRevision(HoraOficial.ahora());
        incidencia.setIdUsuarioRevisa(usuario.idUsuario());
        incidencia = incidenciaRepository.save(incidencia);

        auditoriaService.registrar("INCIDENCIA_EN_REVISION", usuario.correo(), correoAfectado(incidencia, usuario),
                incidencia.getCodigo() + " · ABIERTA → EN_REVISION", ip);
        return armarDetalle(incidencia, ambiente);
    }

    @Transactional
    public IncidenciaDetalleDto cerrar(Integer idIncidencia, String resolucion, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Incidencia incidencia = obtener(idIncidencia);
        Ambiente ambiente = ambienteExamenService.obtener(incidencia.getIdAmbiente());
        contextoUsuarioService.verificarAccesoMateria(usuario, ambiente.getIdAsignatura(), false,
                "Cerrar " + incidencia.getCodigo(), ip);

        if (incidencia.getEstado() == EstadoIncidencia.CERRADA) {
            throw new ConflictoEstadoException("La incidencia ya está cerrada y no se puede modificar.");
        }
        String resolucionLimpia = resolucion == null ? "" : resolucion.trim();
        if (resolucionLimpia.isEmpty()) {
            throw new SolicitudInvalidaException("La resolución es obligatoria para cerrar la incidencia.");
        }

        EstadoIncidencia anterior = incidencia.getEstado();
        incidencia.setEstado(EstadoIncidencia.CERRADA);
        incidencia.setResolucion(resolucionLimpia);
        incidencia.setFechaResolucion(HoraOficial.ahora());
        incidencia.setIdUsuarioResuelve(usuario.idUsuario());
        incidencia = incidenciaRepository.save(incidencia);

        auditoriaService.registrar("INCIDENCIA_CERRADA", usuario.correo(), correoAfectado(incidencia, usuario),
                incidencia.getCodigo() + " · " + anterior.name() + " → CERRADA · resolución: " + resolucionLimpia, ip);
        return armarDetalle(incidencia, ambiente);
    }

    // -------------------------------------------------------------------------
    // Auxiliares
    // -------------------------------------------------------------------------

    private Incidencia obtener(Integer idIncidencia) {
        return incidenciaRepository.findById(idIncidencia)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la incidencia con ID " + idIncidencia + "."));
    }

    private IncidenciaDetalleDto armarDetalle(Incidencia i, Ambiente ambiente) {
        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        Optional<Expulsion> expulsion = expulsionRepository.findFirstByIdIncidencia(i.getIdIncidencia());

        Set<Integer> ids = new HashSet<>();
        ids.add(i.getIdUsuarioReporta());
        if (i.getIdUsuarioEstudiante() != null) ids.add(i.getIdUsuarioEstudiante());
        if (i.getIdUsuarioRevisa() != null) ids.add(i.getIdUsuarioRevisa());
        if (i.getIdUsuarioResuelve() != null) ids.add(i.getIdUsuarioResuelve());
        expulsion.ifPresent(e -> ids.add(e.getIdUsuario()));
        Map<Integer, Usuario> usuarios = usuariosPorId(ids);

        List<EventoIncidenciaDto> lineaTiempo = new ArrayList<>();
        lineaTiempo.add(new EventoIncidenciaDto(i.getFechaHora(), "Registrada",
                nombre(usuarios.get(i.getIdUsuarioReporta())),
                i.getTipo().getEtiqueta() + " · severidad " + i.getSeveridad().getEtiqueta()));
        expulsion.ifPresent(e -> lineaTiempo.add(new EventoIncidenciaDto(e.getHoraExpulsion(),
                "Estudiante retirado del examen", nombre(usuarios.get(e.getIdUsuario())), null)));
        if (i.getFechaRevision() != null) {
            lineaTiempo.add(new EventoIncidenciaDto(i.getFechaRevision(), "Marcada en revisión",
                    nombre(usuarios.get(i.getIdUsuarioRevisa())), null));
        }
        if (i.getFechaResolucion() != null) {
            lineaTiempo.add(new EventoIncidenciaDto(i.getFechaResolucion(), "Cerrada",
                    nombre(usuarios.get(i.getIdUsuarioResuelve())), i.getResolucion()));
        }
        lineaTiempo.sort(Comparator.comparing(EventoIncidenciaDto::fechaHora,
                Comparator.nullsLast(Comparator.naturalOrder())));

        return new IncidenciaDetalleDto(i.getIdIncidencia(), i.getCodigo(), i.getFechaHora(), i.getIdAmbiente(),
                info.aula(), info.asignatura(), ambiente.getIdExamen(),
                i.getTipo().name(), i.getTipo().getEtiqueta(),
                i.getSeveridad().name(), i.getSeveridad().getEtiqueta(),
                i.getEstado().name(), i.getEstado().getEtiqueta(),
                nombre(usuarios.get(i.getIdUsuarioReporta())),
                i.getCodsisEstudiante(), nombre(usuarios.get(i.getIdUsuarioEstudiante())),
                expulsion.isPresent(), i.getDescripcion(), i.getEvidenciaUrl(), i.getResolucion(), lineaTiempo);
    }

    private String correoAfectado(Incidencia incidencia, UsuarioActual usuario) {
        if (incidencia.getIdUsuarioEstudiante() == null) {
            return usuario.correo();
        }
        return usuarioRepository.findById(incidencia.getIdUsuarioEstudiante())
                .map(Usuario::getCorreousuario)
                .orElse(usuario.correo());
    }

    private Map<Integer, Usuario> usuariosPorId(Set<Integer> ids) {
        return usuarioRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, Function.identity()));
    }

    private UUID leerClave(String texto) {
        if (texto == null || texto.isBlank()) {
            throw new SolicitudInvalidaException("Falta la clave de la solicitud (claveSolicitud).");
        }
        try {
            return UUID.fromString(texto.trim());
        } catch (IllegalArgumentException e) {
            throw new SolicitudInvalidaException("La clave de la solicitud no es un UUID válido.");
        }
    }

    private <E extends Enum<E>> E leerEnum(Class<E> tipo, String texto, String campo) {
        if (texto == null || texto.isBlank()) {
            throw new SolicitudInvalidaException(campo + " es obligatorio.");
        }
        try {
            return Enum.valueOf(tipo, texto.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new SolicitudInvalidaException(campo + " no es válido: " + texto + ".");
        }
    }

    private String nombre(Usuario u) {
        return u == null ? null : (u.getNombreusuario() + " " + u.getApellidousuario()).trim();
    }
}
