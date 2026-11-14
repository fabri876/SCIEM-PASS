package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService.AmbienteInfo;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService.UsuarioActual;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService.EstudianteEncontrado;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EvidenciaService.EvidenciaSubida;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoExpulsion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Expulsion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Incidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.SeveridadIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ClaveSolicitudDuplicadaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ReintentarSincronizacionException;
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
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
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
    /** Límite de la columna "incidencia.resolucion" (varchar 255) en PostgreSQL. */
    private static final int RESOLUCION_MAX = 255;
    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");

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

    /**
     * Id de la incidencia ya registrada con esa clave de solicitud.
     *
     * Lo usa la sincronización offline para responder "DUPLICADO" con el id:
     * sin él, el dispositivo no puede subir la evidencia que quedó guardada en
     * su cola local y la foto se pierde en silencio.
     */
    @Transactional(readOnly = true)
    public Optional<Integer> idPorClaveSolicitud(String claveSolicitudTexto) {
        return incidenciaRepository.findByClaveSolicitud(leerClave(claveSolicitudTexto))
                .map(Incidencia::getIdIncidencia);
    }

    // -------------------------------------------------------------------------
    // REGISTRAR
    // -------------------------------------------------------------------------

    @Transactional
    public IncidenciaDetalleDto registrar(String claveSolicitudTexto, Integer idAmbiente, String tipoTexto,
                                          String severidadTexto, String descripcion, Integer codSisEstudiante,
                                          boolean retirarEstudiante, MultipartFile evidenciaArchivo, String ip) {
        return registrar(claveSolicitudTexto, idAmbiente, tipoTexto, severidadTexto, descripcion, codSisEstudiante,
                retirarEstudiante, evidenciaArchivo, null, ip);
    }

    /**
     * Variante usada por la sincronización offline: conserva la fecha y hora
     * reales del evento registrado en el dispositivo (HU21, CA15/CA30) y deja
     * la auditoría con la hora en que el servidor recibió el registro.
     */
    @Transactional
    public IncidenciaDetalleDto registrar(String claveSolicitudTexto, Integer idAmbiente, String tipoTexto,
                                          String severidadTexto, String descripcion, Integer codSisEstudiante,
                                          boolean retirarEstudiante, MultipartFile evidenciaArchivo,
                                          OffsetDateTime registradoEn, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        UUID claveSolicitud = leerClave(claveSolicitudTexto);

        // Hora real del evento: si el registro llegó desde la cola offline se
        // conserva la del dispositivo; en el flujo en línea se usa la hora oficial.
        boolean desdeSincronizacion = registradoEn != null;
        LocalDateTime fechaEvento = desdeSincronizacion
                ? registradoEn.atZoneSameInstant(HoraOficial.ZONA).toLocalDateTime()
                : HoraOficial.ahora();

        // Doble clic / reintento: la misma clave devuelve la incidencia ya creada.
        Optional<Incidencia> yaRegistrada = incidenciaRepository.findByClaveSolicitud(claveSolicitud);
        if (yaRegistrada.isPresent()) {
            if (!usuario.idUsuario().equals(yaRegistrada.get().getIdUsuarioReporta())) {
                throw new ConflictoEstadoException("La clave de la solicitud ya fue usada. Vuelva a abrir el formulario.");
            }
            return armarDetalle(yaRegistrada.get(), ambienteExamenService.obtener(yaRegistrada.get().getIdAmbiente()));
        }

        Ambiente ambiente = ambienteExamenService.obtener(idAmbiente);
        // Las incidencias son del docente responsable y del administrador:
        // el operador (ayudante) no registra incidencias.
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, false,
                "Registrar incidencia", ip);
        // Se puede registrar el día del examen o después, pero no antes.
        AmbienteInfo infoAmbiente = ambienteExamenService.describir(ambiente);
        ambienteExamenService.verificarExamenYaIniciado(infoAmbiente);
        if (desdeSincronizacion) {
            // El registro se hizo sin conexión: se valida la marca del
            // dispositivo (que no puede ser anterior al examen ni futura).
            // Una incidencia también se puede registrar después del examen, así
            // que aquí no se exige que el evento sea del día del examen (eso sí
            // se exige en la expulsión, más abajo, que solo se puede hacer
            // mientras el examen está en curso).
            ambienteExamenService.verificarFechaEventoOffline(infoAmbiente, fechaEvento);
        }

        TipoIncidencia tipo = leerEnum(TipoIncidencia.class, tipoTexto, "El tipo de incidencia");
        SeveridadIncidencia severidad = leerEnum(SeveridadIncidencia.class, severidadTexto, "La severidad");
        String descripcionLimpia = descripcion == null ? "" : descripcion.trim();
        if (descripcionLimpia.length() < DESCRIPCION_MIN || descripcionLimpia.length() > DESCRIPCION_MAX) {
            throw new SolicitudInvalidaException("La descripción debe tener entre " + DESCRIPCION_MIN + " y "
                    + DESCRIPCION_MAX + " caracteres.");
        }
        evidenciaService.validar(evidenciaArchivo);

        EstudianteEncontrado estudiante = null;
        Optional<Ingreso> ingresoEstudiante = Optional.empty();
        if (codSisEstudiante != null) {
            estudiante = estudianteExamenService.buscarPorCodSis(codSisEstudiante)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Estudiante no encontrado."));

            // BUG-001: bloquea el ingreso del estudiante antes de leerlo. Sin el lock, dos
            // expulsiones simultáneas del mismo estudiante pasaban las dos la comprobación
            // "no está retirado" y las dos creaban una expulsión. Con el lock, la segunda
            // espera y luego ve la expulsión de la primera (409) en vez de duplicarla.
            ingresoRepository.bloquearIngresoPorEstudiante(codSisEstudiante,
                    ambiente.getIdAsignatura(), ambiente.getIdExamen());

            // El estudiante debe estar inscrito en la asignatura del examen para que
            // la incidencia sea válida: un estudiante con ingreso previo pero no inscrito
            // en la materia no puede registrar incidencias en ese examen (BUG-020-EXP).
            if (!estudianteExamenService.estaInscritoEnAsignatura(codSisEstudiante,
                    ambiente.getIdAsignatura())) {
                throw new SolicitudInvalidaException(
                        "El estudiante no está inscrito en la asignatura de este examen; no se puede registrar una incidencia para él.");
            }

            ingresoEstudiante = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                    codSisEstudiante, ambiente.getIdAsignatura(), ambiente.getIdExamen());

            // Un estudiante que no ha ingresado al examen no puede estar involucrado en
            // una incidencia: no podría haber causado un incidente sin haber ingresado.
            if (ingresoEstudiante.isEmpty()) {
                String mensaje = "El estudiante no ha ingresado a este examen; no se puede registrar una incidencia para él.";
                if (desdeSincronizacion) {
                    // En la cola offline el ingreso del estudiante puede que aún no se
                    // haya sincronizado: se reintenta en el siguiente ciclo en vez de
                    // descartar la incidencia para siempre.
                    throw new ReintentarSincronizacionException(
                            "El ingreso del estudiante todavía no está en el servidor (puede que su marcación se sincronice después). "
                                    + mensaje);
                }
                throw new SolicitudInvalidaException(mensaje);
            }

            // Un estudiante expulsado del examen no puede volver a figurar en otra incidencia,
            // sea del tipo que sea (no solo las expulsiones).
            if (ingresoEstudiante.get().estaRetirado()) {
                throw new ConflictoEstadoException(
                        "El estudiante fue expulsado de este examen; no se pueden registrar más incidencias para él.");
            }
        }

        Ingreso ingresoARetirar = null;
        if (retirarEstudiante) {
            if (usuario.esAdmin()) {
                throw new AccesoDenegadoException(
                        "El administrador solo puede consultar reportes; no puede registrar expulsiones.");
            }
            if (estudiante == null) {
                throw new SolicitudInvalidaException("Para retirar a un estudiante debe indicar quién es.");
            }
            ingresoARetirar = ingresoEstudiante
                    .orElseThrow(() -> new ConflictoEstadoException(
                            "El estudiante no ingresó a este examen; no se puede retirar."));
            if (ingresoARetirar.estaRetirado()) {
                throw new ConflictoEstadoException("El estudiante ya fue retirado de este examen.");
            }

            // Validar que el examen esté en curso para poder registrar una expulsión.
            // En la sincronización offline el examen puede haber terminado ya:
            // lo que manda es la hora real del evento, no la del servidor.
            AmbienteInfo infoExpulsion = ambienteExamenService.describir(ambiente);
            LocalDate fechaBase = desdeSincronizacion ? fechaEvento.toLocalDate() : HoraOficial.hoy();
            LocalTime horaBase = desdeSincronizacion ? fechaEvento.toLocalTime() : HoraOficial.ahora().toLocalTime();
            LocalDate fechaExamen = infoExpulsion.fechaExamen();
            LocalTime horaInicio = ambiente.getHoraInicio();
            LocalTime horaFin = ambiente.getHoraFin();

            if (fechaExamen != null && horaInicio != null && horaFin != null) {
                // Se comparan fecha y hora completas (no solo la hora del día):
                // un examen que termina a las 23:50 no puede "terminar" a las
                // 00:05 por el tolerance de reloj.
                LocalDateTime momentoEvento = LocalDateTime.of(fechaBase, horaBase);
                LocalDateTime inicioExamen = LocalDateTime.of(fechaExamen, horaInicio);
                LocalDateTime finExamen = LocalDateTime.of(fechaExamen, horaFin);
                // En la sincronización offline se tolera un desfase de reloj.
                LocalDateTime finTolerado = desdeSincronizacion
                        ? finExamen.plusMinutes(AmbienteExamenService.TOLERANCIA_RELOJ_MINUTOS)
                        : finExamen;
                boolean aunNoEmpieza = momentoEvento.isBefore(inicioExamen);
                boolean yaTermino = momentoEvento.isAfter(finTolerado);
                if (aunNoEmpieza || yaTermino) {
                    throw new ConflictoEstadoException(desdeSincronizacion
                            ? "El registro offline de la expulsión no corresponde al horario de este examen ("
                            + fechaExamen + " " + horaInicio + "-" + horaFin + ")."
                            : "No se puede registrar una expulsión: el examen no está en curso.");
                }
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
            incidencia.setFechaHora(fechaEvento);
            incidencia = incidenciaRepository.saveAndFlush(incidencia);

            if (ingresoARetirar != null) {
                Integer idIncidencia = incidencia.getIdIncidencia();
                if (idIncidencia == null) {
                    throw new IllegalArgumentException("No se puede crear una expulsión sin una incidencia asociada.");
                }
                Incidencia incidenciaAbierta = incidenciaRepository.findById(idIncidencia)
                        .orElseThrow(() -> new IllegalArgumentException("Incidencia no encontrada: " + idIncidencia));
                if (incidenciaAbierta.getEstado() != EstadoIncidencia.ABIERTA) {
                    throw new IllegalStateException("Solo se puede expulsar con una incidencia en estado ABIERTA.");
                }

                expulsion = new Expulsion();
                expulsion.setIdIngreso(ingresoARetirar.getIdIngreso());
                expulsion.setIdUsuario(usuario.idUsuario());
                expulsion.setMotivoExpulsion(tipo.getEtiqueta() + ": " + descripcionLimpia);
                expulsion.setFechaExpulsion(fechaEvento.toLocalDate());
                expulsion.setHoraExpulsion(fechaEvento);
                expulsion.setIdIncidencia(idIncidencia);
                // La expulsión nace AUTORIZADA, no PENDIENTE: el formulario de
                // incidencia ya retira al estudiante de inmediato y queda
                // auditado, así que no hay nada pendiente de decidir. Si se
                // dejaba en PENDIENTE (el default de la entidad) el botón
                // "Revocar" fallaba siempre, porque el servicio de expulsiones
                // solo revoca las que están AUTORIZADA, y el estudiante quedaba
                // bloqueado sin forma de reingresar.
                expulsion.setEstado(EstadoExpulsion.AUTORIZADA);
                expulsion.setFechaAutorizacion(fechaEvento);
                expulsion.setIdUsuarioAutoriza(usuario.idUsuario());
                expulsion = expulsionRepository.save(expulsion);

                ingresoARetirar.setIdExpulsion(expulsion.getIdExpulsion());
                ingresoRepository.saveAndFlush(ingresoARetirar);
            }
        } catch (DataIntegrityViolationException e) {
            // La misma clave llegó dos veces al mismo tiempo (UNIQUE de la BD).
            evidenciaService.eliminarSinFallar(evidencia);
            if (esClaveSolicitudDuplicada(e)) {
                // No es un rechazo: la incidencia ya está guardada. Se relanza como error
                // reintentable para que el siguiente intento la encuentre y la devuelva
                // (idempotencia real: los dos registros terminados en 201 y sin duplicar).
                throw new ClaveSolicitudDuplicadaException("Esta incidencia ya fue registrada.", e);
            }
            throw new ConflictoEstadoException("Esta incidencia ya fue registrada.");
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        String afectado = estudiante != null ? estudiante.usuario().getCorreousuario() : usuario.correo();
        String contexto = info.asignatura() + " · examen " + ambiente.getIdExamen() + " · " + info.aula();
        try {
            auditoriaService.registrarEnTransaccion("INCIDENCIA_REGISTRADA", usuario.correo(), afectado,
                    incidencia.getCodigo() + " · " + tipo.name() + " · " + severidad.name() + " · " + contexto, ip);
            if (expulsion != null) {
                // "autorizada al momento": la expulsión nace AUTORIZADA, así que
                // el detalle de auditoría lo deja explícito. El motivo se incluye
                // en el texto de la acción para que quede visible en la interfaz
                // (BUG-021: antes solo se guardaba en la columna aparte "motivo"
                // y no se mostraba en la lista de auditoría).
                auditoriaService.registrarExpulsionEnTransaccion("EXPULSION_REGISTRADA", usuario.correo(), afectado,
                        incidencia.getCodigo() + " · ingreso #" + ingresoARetirar.getIdIngreso()
                                + " retirado · motivo: " + expulsion.getMotivoExpulsion()
                                + " · expulsión autorizada al momento · " + contexto,
                        expulsion.getMotivoExpulsion(), ip);
            }
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        return armarDetalle(incidencia, ambiente);
    }

    // -------------------------------------------------------------------------
    // LISTAR / DETALLE / CONTADOR
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public IncidenciaListaDto listar(Integer idExamen, Integer idAmbiente, Integer idAsignatura,
                                     String tipoTexto, String estadoTexto, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        TipoIncidencia tipo = tipoTexto == null || tipoTexto.isBlank()
                ? null : leerEnum(TipoIncidencia.class, tipoTexto, "El tipo de incidencia");
        EstadoIncidencia estado = estadoTexto == null || estadoTexto.isBlank()
                ? null : leerEnum(EstadoIncidencia.class, estadoTexto, "El estado");

        List<Ambiente> ambientes = ambienteExamenService.ambientesVisibles(usuario, idExamen, idAmbiente, false,
                "Listar incidencias", ip);
        // Filtro por materia: el listado en pantalla y el export a Excel usan
        // exactamente el mismo filtro.
        if (idAsignatura != null) {
            ambientes = ambientes.stream()
                    .filter(a -> idAsignatura.equals(a.getIdAsignatura()))
                    .toList();
        }
        if (ambientes.isEmpty()) {
            return new IncidenciaListaDto(new TotalesIncidenciasDto(0, 0, 0, 0), List.of());
        }
        Map<Integer, AmbienteInfo> infos = ambienteExamenService.describir(ambientes);

        List<Incidencia> delFiltro = incidenciaRepository.findByIdAmbienteInOrderByFechaHoraDesc(infos.keySet()).stream()
                .filter(i -> tipo == null || i.getTipo() == tipo)
                .toList();

        TotalesIncidenciasDto totales = new TotalesIncidenciasDto(
                delFiltro.stream().filter(i -> i.getEstado() == EstadoIncidencia.ABIERTA).count(),
                delFiltro.stream().filter(i -> i.getEstado() == EstadoIncidencia.EN_REVISION).count(),
                delFiltro.stream().filter(i -> i.getEstado() == EstadoIncidencia.CERRADA).count(),
                delFiltro.stream().filter(i -> i.getEstado() == EstadoIncidencia.REVOCADA).count());

        List<Incidencia> visibles = delFiltro.stream()
                .filter(i -> estado == null || i.getEstado() == estado)
                .toList();

        // IDs de incidencias que tienen una expulsión asociada (para la columna de filtro).
        Set<Integer> idsConExpulsion = new HashSet<>();
        Map<Integer, Expulsion> expulsionPorIncidencia = new java.util.HashMap<>();
        if (!visibles.isEmpty()) {
            Set<Integer> idsVisibles = visibles.stream()
                    .map(Incidencia::getIdIncidencia)
                    .collect(Collectors.toSet());
            List<Expulsion> expulsiones = expulsionRepository.findByIdIncidenciaIn(
                    new ArrayList<>(idsVisibles));
            for (Expulsion ex : expulsiones) {
                idsConExpulsion.add(ex.getIdIncidencia());
                // normally hay una sola expulsión por incidencia; si hubiera más,
                // se conserva la más antigua para que el resultado sea estable.
                Expulsion previa = expulsionPorIncidencia.get(ex.getIdIncidencia());
                if (previa == null || ex.getIdExpulsion() < previa.getIdExpulsion()) {
                    expulsionPorIncidencia.put(ex.getIdIncidencia(), ex);
                }
            }
        }

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
                    nombre(usuarios.get(i.getIdUsuarioEstudiante())),
                    idsConExpulsion.contains(i.getIdIncidencia()),
                    expulsionPorIncidencia.get(i.getIdIncidencia()) == null ? null
                            : expulsionPorIncidencia.get(i.getIdIncidencia()).getIdExpulsion(),
                    expulsionPorIncidencia.get(i.getIdIncidencia()) == null ? null
                            : expulsionPorIncidencia.get(i.getIdIncidencia()).getEstado().name());
        }).toList();

        return new IncidenciaListaDto(totales, filas);
    }

    /**
     * Exporta a Excel (.xlsx) exactamente las filas del filtro actual.
     * `soloExpulsiones` se aplica sobre el mismo listado visible.
     */
    @Transactional(readOnly = true)
    public byte[] exportarExcel(Integer idExamen, Integer idAmbiente, Integer idAsignatura, String tipoTexto,
                                String estadoTexto, boolean soloExpulsiones, String ip) {
        List<IncidenciaResumenDto> filas = listar(idExamen, idAmbiente, idAsignatura, tipoTexto, estadoTexto, ip)
                .incidencias();
        if (soloExpulsiones) {
            filas = filas.stream().filter(IncidenciaResumenDto::estudianteRetirado).toList();
        }

        String[] cabeceras = {"Código", "Fecha", "Hora", "Aula", "Asignatura", "Tipo", "Severidad",
                "Reportado por", "Estudiante", "Expulsión", "Estado"};
        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet("Incidencias");

            CellStyle estiloCabecera = libro.createCellStyle();
            Font fuenteCabecera = libro.createFont();
            fuenteCabecera.setBold(true);
            fuenteCabecera.setColor(IndexedColors.WHITE.getIndex());
            estiloCabecera.setFont(fuenteCabecera);
            estiloCabecera.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            estiloCabecera.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row filaCabecera = hoja.createRow(0);
            for (int i = 0; i < cabeceras.length; i++) {
                var celda = filaCabecera.createCell(i);
                celda.setCellValue(cabeceras[i]);
                celda.setCellStyle(estiloCabecera);
            }

            int numeroFila = 1;
            for (IncidenciaResumenDto fila : filas) {
                Row row = hoja.createRow(numeroFila++);
                String[] valores = {
                        valor(fila.codigo()),
                        fila.fechaHora() == null ? "" : FORMATO_FECHA.format(fila.fechaHora()),
                        fila.fechaHora() == null ? "" : FORMATO_HORA.format(fila.fechaHora()),
                        valor(fila.aula()),
                        valor(fila.asignatura()),
                        valor(fila.tipoEtiqueta()),
                        valor(fila.severidadEtiqueta()),
                        valor(fila.reportadoPor()),
                        valor(fila.estudiante()),
                        fila.estudianteRetirado() ? "Sí" : "No",
                        valor(fila.estadoEtiqueta())
                };
                for (int i = 0; i < valores.length; i++) {
                    row.createCell(i).setCellValue(valores[i]);
                }
            }

            for (int i = 0; i < cabeceras.length; i++) {
                hoja.autoSizeColumn(i);
            }
            libro.write(salida);
            return salida.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar el Excel de incidencias.", e);
        }
    }

    private static String valor(String texto) {
        return texto == null ? "" : texto;
    }

    @Transactional(readOnly = true)
    public IncidenciaDetalleDto detalle(Integer idIncidencia, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Incidencia incidencia = obtener(idIncidencia);
        Ambiente ambiente = ambienteExamenService.obtener(incidencia.getIdAmbiente());
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, false,
                "Ver incidencia " + incidencia.getCodigo(), ip);
        return armarDetalle(incidencia, ambiente);
    }

    /**
     * Adjunta (o reemplaza) la evidencia de una incidencia ya registrada.
     * Se usa cuando la incidencia se creó offline y la foto quedó en la cola
     * local: al sincronizar, la imagen se sube con este endpoint (HU21, CA25).
     */
    @Transactional
    public IncidenciaDetalleDto adjuntarEvidencia(Integer idIncidencia, MultipartFile archivo, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Incidencia incidencia = obtener(idIncidencia);
        Ambiente ambiente = ambienteExamenService.obtener(incidencia.getIdAmbiente());
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, false,
                "Adjuntar evidencia a " + incidencia.getCodigo(), ip);

        evidenciaService.validar(archivo);
        if (incidencia.getEvidenciaUrl() != null && !incidencia.getEvidenciaUrl().isBlank()) {
            throw new ConflictoEstadoException("La incidencia " + incidencia.getCodigo() + " ya tiene una evidencia adjunta.");
        }
        EvidenciaSubida evidencia = evidenciaService.subir(archivo, "control-ingreso/incidencias");
        if (evidencia == null) {
            throw new SolicitudInvalidaException("No se recibió ningún archivo de evidencia.");
        }
        try {
            incidencia.setEvidenciaUrl(evidencia.url());
            incidencia = incidenciaRepository.saveAndFlush(incidencia);
        } catch (RuntimeException e) {
            evidenciaService.eliminarSinFallar(evidencia);
            throw e;
        }

        auditoriaService.registrarEnTransaccion("INCIDENCIA_EVIDENCIA", usuario.correo(), correoAfectado(incidencia, usuario),
                incidencia.getCodigo() + " · evidencia adjunta desde sincronización offline", ip);
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
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, false,
                "Marcar en revisión " + incidencia.getCodigo(), ip);

        if (incidencia.getEstado() == EstadoIncidencia.CERRADA
                || incidencia.getEstado() == EstadoIncidencia.REVOCADA) {
            throw new ConflictoEstadoException("La incidencia está cerrada y ya no se puede modificar.");
        }
        if (incidencia.getEstado() != EstadoIncidencia.ABIERTA) {
            throw new ConflictoEstadoException("La incidencia ya está en revisión.");
        }

        incidencia.setEstado(EstadoIncidencia.EN_REVISION);
        incidencia.setFechaRevision(HoraOficial.ahora());
        incidencia.setIdUsuarioRevisa(usuario.idUsuario());
        incidencia = incidenciaRepository.save(incidencia);

        auditoriaService.registrarEnTransaccion("INCIDENCIA_EN_REVISION", usuario.correo(), correoAfectado(incidencia, usuario),
                incidencia.getCodigo() + " · ABIERTA → EN_REVISION", ip);
        return armarDetalle(incidencia, ambiente);
    }

    /**
     * Cierra la incidencia con su resolución obligatoria.
     *
     * Si la incidencia ya estaba cerrada, la llamada es una revocación (HU21):
     * la incidencia no se reabre, pasa a REVOCADA (revocar es cancelar: deja
     * de estar en vigor) y la resolución anterior queda en la auditoría (una
     * incidencia no se edita ni se borra; cada cambio queda en auditoría).
     */
    @Transactional
    public IncidenciaDetalleDto cerrar(Integer idIncidencia, String resolucion, String ip) {
        UsuarioActual usuario = contextoUsuarioService.actual();
        Incidencia incidencia = obtener(idIncidencia);
        Ambiente ambiente = ambienteExamenService.obtener(incidencia.getIdAmbiente());
        contextoUsuarioService.verificarAccesoAmbiente(usuario, ambiente, false,
                "Cerrar " + incidencia.getCodigo(), ip);

        String resolucionLimpia = resolucion == null ? "" : resolucion.trim();
        if (resolucionLimpia.isEmpty()) {
            throw new SolicitudInvalidaException("La resolución es obligatoria para cerrar la incidencia.");
        }
        if (resolucionLimpia.length() > RESOLUCION_MAX) {
            throw new SolicitudInvalidaException(
                    "La resolución no puede superar los " + RESOLUCION_MAX + " caracteres.");
        }

        boolean esRevocacion = incidencia.getEstado() == EstadoIncidencia.CERRADA;
        if (incidencia.getEstado() == EstadoIncidencia.REVOCADA) {
            throw new ConflictoEstadoException("La incidencia ya fue revocada y no se puede modificar.");
        }
        EstadoIncidencia anterior = incidencia.getEstado();
        String resolucionAnterior = incidencia.getResolucion();

        incidencia.setEstado(esRevocacion ? EstadoIncidencia.REVOCADA : EstadoIncidencia.CERRADA);
        incidencia.setResolucion(resolucionLimpia);
        incidencia.setFechaResolucion(HoraOficial.ahora());
        incidencia.setIdUsuarioResuelve(usuario.idUsuario());
        try {
            incidencia = incidenciaRepository.saveAndFlush(incidencia);
        } catch (DataIntegrityViolationException e) {
            // El CHECK "ck_incidencia_estado" de PostgreSQL todavía no admite
            // el valor REVOCADA: falta aplicar la migración pendiente.
            if (esRevocacion) {
                throw new ConflictoEstadoException(
                        "La base de datos todavía no admite el estado REVOCADA. Hay que aplicar la migración "
                        + "docs/migraciones/2026-11-12_hu21_estado_incidencia_revocada.sql antes de revocar.");
            }
            throw e;
        }

        String accionAuditoria = esRevocacion ? "INCIDENCIA_REVOCADA" : "INCIDENCIA_CERRADA";
        String detalle = incidencia.getCodigo() + " · " + anterior.name() + " → " + incidencia.getEstado().name()
                + (esRevocacion ? " · resolución anterior: \"" + valor(resolucionAnterior) + "\" · " : " · ")
                + "resolución: " + resolucionLimpia;
        auditoriaService.registrarEnTransaccion(accionAuditoria, usuario.correo(), correoAfectado(incidencia, usuario),
                detalle, ip);
        return armarDetalle(incidencia, ambiente);
    }

    // -------------------------------------------------------------------------
    // Auxiliares
    // -------------------------------------------------------------------------

    /**
     * true si la violación de integridad viene del UNIQUE de 'incidencia.clavesolicitud'.
     *
     * BUG-001: si la clave ya se usó, la incidencia existe y no hay nada que reprobar; solo
     * hay que devolverla. Si la violación es de otro UNIQUE, es un dato inválido de verdad y
     * se rechaza con 409 como antes.
     */
    private boolean esClaveSolicitudDuplicada(DataIntegrityViolationException e) {
        for (Throwable t = e; t != null; t = (t.getCause() == t ? null : t.getCause())) {
            if (t instanceof org.hibernate.exception.ConstraintViolationException violacion) {
                String nombre = violacion.getConstraintName();
                if (nombre != null && nombre.toLowerCase().contains("clavesolicitud")) {
                    return true;
                }
            }
        }
        return false;
    }

    private Incidencia obtener(Integer idIncidencia) {
        return incidenciaRepository.findById(idIncidencia)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la incidencia con ID " + idIncidencia + "."));
    }

    private IncidenciaDetalleDto armarDetalle(Incidencia i, Ambiente ambiente) {
        AmbienteInfo info = ambienteExamenService.describir(ambiente);
        Optional<Expulsion> expulsion = expulsionRepository.findFirstByIdIncidencia(i.getIdIncidencia());
        // El estado de la expulsión va aparte del de la incidencia: puede estar
        // CERRADA y su expulsión REVOCADA (el frontend lo muestra como distintivo).

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
            lineaTiempo.add(new EventoIncidenciaDto(i.getFechaResolucion(),
                    i.getEstado() == EstadoIncidencia.REVOCADA ? "Revocada" : "Cerrada",
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
                expulsion.isPresent(), i.getDescripcion(), i.getEvidenciaUrl(), i.getResolucion(),
                expulsion.map(Expulsion::getIdExpulsion).orElse(null),
                expulsion.map(e -> e.getEstado().name()).orElse(null),
                lineaTiempo);
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
