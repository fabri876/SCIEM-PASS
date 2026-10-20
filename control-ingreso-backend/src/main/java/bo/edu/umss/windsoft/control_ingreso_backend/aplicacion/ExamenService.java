// aplicacion/ExamenService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AmbienteRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.NormaGeneralRespuestaDto;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenDetalleDto;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ExamenService {

    private final CambioExamenService cambiosExamen;
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final DocenteAsignaturaRepository docenteAsignaturaRepository;
    private final HorarioRegularRepository horarioRegularRepository;
    private final ExamenNormaGeneralRepository examenNormaGeneralRepository;
    private final NormaEspecificaRepository normaEspecificaRepository;
    private final TipoExamenRepository tipoExamenRepository;
    private final AulaRepository aulaRepository;
    private final DocenteRepository docenteRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final UsuarioRepository usuarioRepository;
    private final NormaGeneralRepository normaGeneralRepository;
    private final GrupoRepository grupoRepository;
    private final HabilitacionRepository habilitacionRepository;
    private final IngresoRepository ingresoRepository;

    public ExamenService(
            ExamenRepository examenRepository,
            AmbienteRepository ambienteRepository,
            DocenteAsignaturaRepository docenteAsignaturaRepository,
            HorarioRegularRepository horarioRegularRepository,
            ExamenNormaGeneralRepository examenNormaGeneralRepository,
            NormaEspecificaRepository normaEspecificaRepository,
            TipoExamenRepository tipoExamenRepository,
            AulaRepository aulaRepository,
            DocenteRepository docenteRepository,
            AsignaturaRepository asignaturaRepository,
            UsuarioRepository usuarioRepository,
            NormaGeneralRepository normaGeneralRepository,
            GrupoRepository grupoRepository,
            HabilitacionRepository habilitacionRepository,
            IngresoRepository ingresoRepository,
            CambioExamenService cambiosExamen) {

        this.cambiosExamen = cambiosExamen;
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.horarioRegularRepository = horarioRegularRepository;
        this.examenNormaGeneralRepository = examenNormaGeneralRepository;
        this.normaEspecificaRepository = normaEspecificaRepository;
        this.tipoExamenRepository = tipoExamenRepository;
        this.aulaRepository = aulaRepository;
        this.docenteRepository = docenteRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.usuarioRepository = usuarioRepository;
        this.normaGeneralRepository = normaGeneralRepository;
        this.grupoRepository = grupoRepository;
        this.habilitacionRepository = habilitacionRepository;
        this.ingresoRepository = ingresoRepository;
    }

    // -------------------------------------------------------------------------
    // CREAR EXAMEN
    // -------------------------------------------------------------------------

    @Transactional
    public Examen registrarExamen(ExamenRequest request) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean esAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));

        if (!esAdmin) {
            Integer idUsuarioAutenticado = (Integer) auth.getDetails();
            Docente docente = docenteRepository.findByIdusuario(idUsuarioAutenticado)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "No se encontró un docente para el usuario autenticado."));
            request.setIdUsuario(idUsuarioAutenticado);
            request.setCodsisDocente(docente.getCodsisdocente());
        }

        return crearOActualizarExamen(null, request);
    }

    // -------------------------------------------------------------------------
    // ACTUALIZAR EXAMEN (PUT /api/examenes/{id})
    // -------------------------------------------------------------------------

    @Transactional
    public ExamenRespuestaDto actualizarExamen(Integer idExamen, ExamenRequest request) {

        Examen examenExistente = examenRepository.findById(idExamen)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No se encontró el examen con ID: " + idExamen));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean esAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));

        if (!esAdmin) {
            Integer idUsuarioAutenticado = (Integer) auth.getDetails();
            Docente docente = docenteRepository.findByIdusuario(idUsuarioAutenticado)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "No se encontró un docente para el usuario autenticado."));
            if (!examenExistente.getIdUsuario().equals(idUsuarioAutenticado)) {
                throw new IllegalArgumentException("No tienes permiso para editar este examen.");
            }
            request.setIdUsuario(idUsuarioAutenticado);
            request.setCodsisDocente(docente.getCodsisdocente());
        }

        var antes = cambiosExamen.estado(examenExistente.getFechaExamen(), ambienteRepository.findByIdExamen(idExamen));
        ambienteRepository.deleteAll(ambienteRepository.findByIdExamen(idExamen));
        examenNormaGeneralRepository.deleteAll(
                examenNormaGeneralRepository.findByIdIdExamen(idExamen));
        normaEspecificaRepository.deleteAll(
                normaEspecificaRepository.findByIdAsignaturaAndIdExamen(
                        examenExistente.getIdAsignatura(), idExamen));

        Examen actualizado = crearOActualizarExamen(examenExistente, request);
        ambienteRepository.flush();
        cambiosExamen.registrar(idExamen, antes,
                cambiosExamen.estado(actualizado.getFechaExamen(), ambienteRepository.findByIdExamen(idExamen)));
        return enriquecerExamen(actualizado);
    }

    // -------------------------------------------------------------------------
    // LÓGICA COMPARTIDA CREAR / ACTUALIZAR
    // -------------------------------------------------------------------------

    private Examen crearOActualizarExamen(Examen examenAActualizar, ExamenRequest request) {

        validarExamen(request);

        DocenteAsignaturaId daId = new DocenteAsignaturaId(
                request.getIdUsuario(), request.getCodsisDocente(), request.getIdAsignatura());

        docenteAsignaturaRepository.findById(daId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "El docente no dicta esa asignatura."));

        TipoExamen tipoExamen = tipoExamenRepository.findById(request.getIdTipoExamen())
                .orElseThrow(() -> new IllegalArgumentException("Tipo de examen no encontrado."));

        if (Boolean.TRUE.equals(tipoExamen.getRequiereDescripcion())
                && (request.getDetalleTipoExamen() == null
                        || request.getDetalleTipoExamen().isBlank())) {
            throw new IllegalArgumentException(
                    "Debe especificar el detalle del tipo de examen.");
        }

        List<Integer> tiposYaUsados = examenRepository.findTiposUsadosByAsignaturaAndDocente(
                request.getIdAsignatura(), request.getCodsisDocente());
        boolean yaExisteEseTipo = tiposYaUsados.contains(request.getIdTipoExamen());
        boolean esElMismoExamenConMismoTipo = examenAActualizar != null
                && examenAActualizar.getIdTipoExamen().equals(request.getIdTipoExamen());
        if (yaExisteEseTipo && !esElMismoExamenConMismoTipo) {
            throw new IllegalArgumentException(
                    "Este docente ya tiene registrado un examen de tipo '"
                            + tipoExamen.getNombreTipoExamen() + "' para esta asignatura.");
        }

        Integer idAula;
        LocalTime horaInicio;
        LocalTime horaFin;
        Integer idHorarioRegularUsado = null;

        if (request.getTipoHorario() == TipoHorario.REGULAR) {

            HorarioRegular hr = horarioRegularRepository.findById(request.getIdHorarioRegular())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Horario regular no encontrado."));

            boolean perteneceAlDocente = hr.getIdUsuario().equals(request.getIdUsuario())
                    && hr.getCodsisDocente().equals(request.getCodsisDocente())
                    && hr.getIdAsignatura().equals(request.getIdAsignatura());

            if (!perteneceAlDocente) {
                throw new IllegalArgumentException(
                        "Ese horario regular no pertenece a este docente/asignatura.");
            }

            // FIX: el aula puede diferir de la registrada en el horario regular
            // (ej. el docente necesita un aula más grande para el examen). Si el
            // frontend no manda idAula, se mantiene el comportamiento anterior
            // (usa el aula por defecto del horario regular). La hora siempre viene
            // del horario regular, porque es lo que define cuándo es el examen.
            idAula = (request.getIdAula() != null) ? request.getIdAula() : hr.getIdAula();
            horaInicio = hr.getHoraInicio();
            horaFin = hr.getHoraFin();
            idHorarioRegularUsado = hr.getIdHorarioRegular();

        } else { // EVENTUAL
            idAula = request.getIdAula();
            horaInicio = request.getHoraInicio();
            horaFin = request.getHoraFin();
        }

        Duration duracion = Duration.between(horaInicio, horaFin);
        if (duracion.isNegative() || duracion.isZero()) {
            throw new IllegalArgumentException(
                    "La hora de fin debe ser posterior a la hora de inicio.");
        }

        List<Integer> aulasAdicionales = request.getIdsAulasAdicionales();
        validarAulaActiva(idAula);
        if (aulasAdicionales != null && !aulasAdicionales.isEmpty()) {
            if (aulasAdicionales.size() != new HashSet<>(aulasAdicionales).size()) {
                throw new IllegalArgumentException("Hay aulas adicionales repetidas en la lista.");
            }
            if (aulasAdicionales.contains(idAula)) {
                throw new IllegalArgumentException(
                        "El aula " + idAula + " ya es el aula principal del examen, no la repitas como adicional.");
            }
            for (Integer idAulaAdicional : aulasAdicionales) {
                validarAulaActiva(idAulaAdicional);
            }
        }

        Integer idExamenActual = examenAActualizar != null ? examenAActualizar.getIdExamen() : null;
        LocalDate fechaDelExamen = request.getFechaExamen().toLocalDate();
        validarSinSolapamiento(idAula, fechaDelExamen, horaInicio, horaFin, idExamenActual);
        if (aulasAdicionales != null) {
            for (Integer idAulaAdicional : aulasAdicionales) {
                validarSinSolapamiento(idAulaAdicional, fechaDelExamen, horaInicio, horaFin, idExamenActual);
            }
        }

        Examen examen = (examenAActualizar != null) ? examenAActualizar : new Examen();
        examen.setFechaExamen(request.getFechaExamen().toLocalDate());
        examen.setDuracionExamen(LocalTime.MIDNIGHT.plus(duracion));
        if (examenAActualizar == null) {
            examen.setFechaCreacionExamen(LocalDate.now());
        }
        examen.setEstadoExamen(request.getEstadoExamen());
        examen.setIdAsignatura(request.getIdAsignatura());
        examen.setIdTipoExamen(request.getIdTipoExamen());
        examen.setDetalleTipoExamen(request.getDetalleTipoExamen());
        examen.setIdUsuario(request.getIdUsuario());
        examen.setCodsisDocente(request.getCodsisDocente());

        Examen examenGuardado = examenRepository.save(examen);

        guardarAmbiente(examenGuardado, idAula, idHorarioRegularUsado, horaInicio, horaFin, request.getTipoHorario());

        if (aulasAdicionales != null) {
            for (Integer idAulaAdicional : aulasAdicionales) {
                guardarAmbiente(examenGuardado, idAulaAdicional, idHorarioRegularUsado, horaInicio, horaFin,
                        request.getTipoHorario());
            }
        }

        if (request.getIdsNormasGenerales() != null) {
            for (Integer idNormaGeneral : request.getIdsNormasGenerales()) {
                ExamenNormaGeneralId id = new ExamenNormaGeneralId(
                        examenGuardado.getIdAsignatura(),
                        examenGuardado.getIdExamen(),
                        idNormaGeneral);
                examenNormaGeneralRepository.save(new ExamenNormaGeneral(id));
            }
        }

        if (request.getNormasEspecificas() != null) {
            for (String descripcion : request.getNormasEspecificas()) {
                NormaEspecifica ne = new NormaEspecifica();
                ne.setIdAsignatura(examenGuardado.getIdAsignatura());
                ne.setIdExamen(examenGuardado.getIdExamen());
                ne.setDescripcionNorma(descripcion);
                ne.setFechaCreacion(LocalDateTime.now());
                normaEspecificaRepository.save(ne);
            }
        }

        return examenGuardado;
    }

    // -------------------------------------------------------------------------
    // LECTURA ENRIQUECIDA (batch — evita el patrón N+1)
    // -------------------------------------------------------------------------

    public List<ExamenRespuestaDto> obtenerExamenesEnriquecidos() {
        return enriquecerLote(examenRepository.findAll());
    }

    public List<ExamenRespuestaDto> obtenerMisExamenesEnriquecidos(Integer idUsuarioAutenticado) {
        Docente docente = docenteRepository.findByIdusuario(idUsuarioAutenticado)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No se encontró un docente para el usuario autenticado."));
        return obtenerExamenesDocenteEnriquecidos(idUsuarioAutenticado, docente.getCodsisdocente());
    }

    /** Exámenes en los que el estudiante autenticado tiene habilitación. */
    public List<ExamenRespuestaDto> obtenerExamenesEstudiante(Integer idUsuario) {
        List<Integer> ids = habilitacionRepository.findAllConDetalles().stream()
                .filter(h -> h.getEstudiante() != null
                        && idUsuario.equals(h.getEstudiante().getIdusuario()))
                .map(Habilitacion::getIdExamen)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty())
            return List.of();
        return enriquecerLote(examenRepository.findAllById(ids));
    }

    public List<ExamenRespuestaDto> obtenerExamenesDocenteEnriquecidos(
            Integer idUsuario, Integer codsisDocente) {
        return enriquecerLote(examenRepository.findByIdUsuarioAndCodsisDocente(idUsuario, codsisDocente));
    }

    public ExamenRespuestaDto enriquecerExamen(Examen examen) {
        return enriquecerLote(List.of(examen)).get(0);
    }

    /**
     * Enriquece una lista de exámenes con UNA consulta por tipo de dato relacionado
     * (asignaturas, tipos, docentes, ambientes, aulas, normas generales), en vez de
     * una consulta por examen. Evita el patrón N+1.
     */
    private List<ExamenRespuestaDto> enriquecerLote(List<Examen> examenes) {
        if (examenes.isEmpty()) {
            return List.of();
        }

        List<Integer> idsAsignatura = examenes.stream()
                .map(Examen::getIdAsignatura).distinct().toList();
        List<Integer> idsTipoExamen = examenes.stream()
                .map(Examen::getIdTipoExamen).filter(Objects::nonNull).distinct().toList();
        List<Integer> idsUsuario = examenes.stream()
                .map(Examen::getIdUsuario).filter(Objects::nonNull).distinct().toList();
        List<Integer> idsExamen = examenes.stream()
                .map(Examen::getIdExamen).toList();

        Map<Integer, Asignatura> asignaturasPorId = asignaturaRepository.findAllById(idsAsignatura).stream()
                .collect(Collectors.toMap(Asignatura::getIdAsignatura, a -> a));
        Map<Integer, TipoExamen> tiposPorId = tipoExamenRepository.findAllById(idsTipoExamen).stream()
                .collect(Collectors.toMap(TipoExamen::getIdTipoExamen, t -> t));
        Map<Integer, Usuario> usuariosPorId = usuarioRepository.findAllById(idsUsuario).stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, u -> u));

        List<Ambiente> todosAmbientes = ambienteRepository.findByIdExamenIn(idsExamen);
        List<Integer> idsAula = todosAmbientes.stream()
                .map(Ambiente::getIdAula).distinct().toList();
        Map<Integer, Aula> aulasPorId = idsAula.isEmpty()
                ? Map.of()
                : aulaRepository.findAllById(idsAula).stream()
                        .collect(Collectors.toMap(Aula::getIdAula, a -> a));
        Map<Integer, List<Ambiente>> ambientesPorExamen = todosAmbientes.stream()
                .collect(Collectors.groupingBy(Ambiente::getIdExamen));

        // --- NUEVO: batch de normas generales ---
        List<ExamenNormaGeneral> todasRelaciones = examenNormaGeneralRepository.findByIdIdExamenIn(idsExamen);
        List<Integer> idsNormaGeneral = todasRelaciones.stream()
                .map(rel -> rel.getId().getIdNormaGeneral()).distinct().toList();
        Map<Integer, NormaGeneral> normasGeneralesPorId = idsNormaGeneral.isEmpty()
                ? Map.of()
                : normaGeneralRepository.findAllById(idsNormaGeneral).stream()
                        .collect(Collectors.toMap(NormaGeneral::getIdNormaGeneral, n -> n));
        Map<Integer, List<ExamenNormaGeneral>> relacionesPorExamen = todasRelaciones.stream()
                .collect(Collectors.groupingBy(rel -> rel.getId().getIdExamen()));
        // --- FIN NUEVO ---

        // Grupos por asignatura
        Map<Integer, List<Grupo>> gruposPorAsignatura = asignaturasPorId.keySet().isEmpty()
                ? Map.of()
                : grupoRepository.findByIdAsignaturaIn(idsAsignatura)
                        .stream()
                        .collect(Collectors.groupingBy(Grupo::getIdAsignatura));

        return examenes.stream().map(examen -> {
            ExamenRespuestaDto dto = new ExamenRespuestaDto();
            dto.setIdExamen(examen.getIdExamen());
            dto.setFechaExamen(examen.getFechaExamen());
            dto.setDuracionExamen(examen.getDuracionExamen());
            dto.setFechaCreacionExamen(examen.getFechaCreacionExamen());
            dto.setEstadoExamen(examen.getEstadoExamen());
            dto.setIdAsignatura(examen.getIdAsignatura());
            dto.setIdTipoExamen(examen.getIdTipoExamen());
            dto.setIdUsuario(examen.getIdUsuario());
            dto.setCodsisDocente(examen.getCodsisDocente());
            dto.setDetalleTipoExamen(examen.getDetalleTipoExamen());

            Asignatura asignatura = asignaturasPorId.get(examen.getIdAsignatura());
            if (asignatura != null) {
                dto.setNombreAsignatura(asignatura.getNombreAsignatura());
                dto.setSiglaAsignatura(asignatura.getSiglaAsignatura());
            }

            TipoExamen tipo = tiposPorId.get(examen.getIdTipoExamen());
            if (tipo != null) {
                dto.setNombreTipoExamen(tipo.getNombreTipoExamen());
            }

            Usuario usuario = usuariosPorId.get(examen.getIdUsuario());
            if (usuario != null) {
                dto.setNombreDocente(usuario.getNombreusuario() + " " + usuario.getApellidousuario());
            }

            List<Grupo> grupos = gruposPorAsignatura.getOrDefault(examen.getIdAsignatura(), List.of());
            if (!grupos.isEmpty()) {
                String nombresGrupos = grupos.stream().map(Grupo::getNombreGrupo).collect(Collectors.joining(", "));
                dto.setNombreGrupo(nombresGrupos);
                try {
                    dto.setNumeroGrupo(Integer.valueOf(grupos.get(0).getNombreGrupo().replaceAll("\\D", "")));
                } catch (Exception ignored) {
                    dto.setNumeroGrupo(grupos.get(0).getIdGrupo());
                }
            }

            List<Ambiente> ambientesDeEsteExamen = ambientesPorExamen.getOrDefault(examen.getIdExamen(), List.of());
            List<AmbienteRespuestaDto> ambientesDto = ambientesDeEsteExamen.stream().map(a -> {
                AmbienteRespuestaDto amb = new AmbienteRespuestaDto();
                amb.setIdAmbiente(a.getIdAmbiente());
                amb.setIdAula(a.getIdAula());
                amb.setIdHorarioRegular(a.getIdHorarioRegular()); // <-- NUEVO
                amb.setTipoHorario(a.getTipoHorario() != null ? a.getTipoHorario().name() : null);
                amb.setHoraInicio(a.getHoraInicio() != null ? a.getHoraInicio().toString() : null);
                amb.setHoraFin(a.getHoraFin() != null ? a.getHoraFin().toString() : null);

                Aula aula = aulasPorId.get(a.getIdAula());
                if (aula != null) {
                    amb.setNombreAmbiente(aula.getNombreAula());
                    amb.setUbicacionAmbiente(aula.getUbicacionAula());
                    amb.setCapacidadAmbiente(aula.getCapacidadAula());
                }
                return amb;
            }).collect(Collectors.toList());
            dto.setAmbientes(ambientesDto);

            int totalHabilitados = (int) habilitacionRepository
                    .countByIdAsignaturaAndIdExamenAndEstadohabilitacionTrue(examen.getIdAsignatura(), examen.getIdExamen());
            int inhabilitados = (int) habilitacionRepository
                    .countByIdAsignaturaAndIdExamenAndEstadohabilitacionFalse(examen.getIdAsignatura(), examen.getIdExamen());
            int ingresados = (int) ingresoRepository
                    .countByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(examen.getIdAsignatura(), examen.getIdExamen());
            dto.setIngresados(ingresados);
            dto.setInhabilitados(inhabilitados);
            dto.setTotalInscritos(totalHabilitados);
            dto.setNoLlegan(Math.max(0, totalHabilitados - ingresados));

            // --- NUEVO: poblar normasGenerales del DTO ---
            List<ExamenNormaGeneral> relacionesDeEsteExamen = relacionesPorExamen.getOrDefault(examen.getIdExamen(),
                    List.of());
            List<NormaGeneralRespuestaDto> normasGeneralesDto = relacionesDeEsteExamen.stream().map(rel -> {
                NormaGeneralRespuestaDto ng = new NormaGeneralRespuestaDto();
                NormaGeneral norma = normasGeneralesPorId.get(rel.getId().getIdNormaGeneral());
                if (norma != null) {
                    ng.setIdNormaGeneral(norma.getIdNormaGeneral());
                    ng.setDescripcionNorma(norma.getDescripcionNorma());
                } else {
                    ng.setIdNormaGeneral(rel.getId().getIdNormaGeneral());
                }
                return ng;
            }).collect(Collectors.toList());
            dto.setNormasGenerales(normasGeneralesDto);
            // --- FIN NUEVO ---

            return dto;
        }).collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // TIPOS USADOS
    // -------------------------------------------------------------------------

    public List<Integer> obtenerTiposUsados(Integer idAsignatura, Integer codsisDocente) {
        return examenRepository.findTiposUsadosByAsignaturaAndDocente(idAsignatura, codsisDocente);
    }

    // -------------------------------------------------------------------------
    // HORARIOS REGULARES
    // -------------------------------------------------------------------------

    public List<HorarioRegular> obtenerHorariosRegulares(
            Integer idUsuario, Integer codsisDocente, Integer idAsignatura) {
        return horarioRegularRepository
                .findByIdUsuarioAndCodsisDocenteAndIdAsignaturaAndEstadoHorarioTrue(
                        idUsuario, codsisDocente, idAsignatura);
    }

    // -------------------------------------------------------------------------
    // AMBIENTES DE UN EXAMEN
    // -------------------------------------------------------------------------

    public List<AmbienteRespuestaDto> obtenerAmbientesDeExamen(Integer idExamen) {
        List<Ambiente> ambientes = ambienteRepository.findByIdExamen(idExamen);
        if (ambientes.isEmpty()) {
            return List.of();
        }
        List<Integer> idsAula = ambientes.stream().map(Ambiente::getIdAula).distinct().toList();
        Map<Integer, Aula> aulasPorId = aulaRepository.findAllById(idsAula).stream()
                .collect(Collectors.toMap(Aula::getIdAula, a -> a));

        return ambientes.stream().map(a -> {
            AmbienteRespuestaDto amb = new AmbienteRespuestaDto();
            amb.setIdAmbiente(a.getIdAmbiente());
            amb.setIdAula(a.getIdAula());
            amb.setIdHorarioRegular(a.getIdHorarioRegular()); // <-- NUEVO
            amb.setTipoHorario(a.getTipoHorario() != null ? a.getTipoHorario().name() : null);
            amb.setHoraInicio(a.getHoraInicio() != null ? a.getHoraInicio().toString() : null);
            amb.setHoraFin(a.getHoraFin() != null ? a.getHoraFin().toString() : null);
            Aula aula = aulasPorId.get(a.getIdAula());
            if (aula != null) {
                amb.setNombreAmbiente(aula.getNombreAula());
                amb.setUbicacionAmbiente(aula.getUbicacionAula());
                amb.setCapacidadAmbiente(aula.getCapacidadAula());
            }
            return amb;
        }).collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // NORMAS GENERALES DE UN EXAMEN (NUEVO)
    // -------------------------------------------------------------------------

    public List<NormaGeneralRespuestaDto> obtenerNormasGeneralesDeExamen(Integer idExamen) {
        List<ExamenNormaGeneral> relaciones = examenNormaGeneralRepository.findByIdIdExamen(idExamen);
        if (relaciones.isEmpty()) {
            return List.of();
        }
        List<Integer> idsNormaGeneral = relaciones.stream()
                .map(rel -> rel.getId().getIdNormaGeneral()).distinct().toList();
        Map<Integer, NormaGeneral> normasPorId = normaGeneralRepository.findAllById(idsNormaGeneral).stream()
                .collect(Collectors.toMap(NormaGeneral::getIdNormaGeneral, n -> n));

        return relaciones.stream().map(rel -> {
            NormaGeneralRespuestaDto ng = new NormaGeneralRespuestaDto();
            NormaGeneral norma = normasPorId.get(rel.getId().getIdNormaGeneral());
            if (norma != null) {
                ng.setIdNormaGeneral(norma.getIdNormaGeneral());
                ng.setDescripcionNorma(norma.getDescripcionNorma());
            } else {
                ng.setIdNormaGeneral(rel.getId().getIdNormaGeneral());
            }
            return ng;
        }).collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // LECTURA SIMPLE (sin enriquecer)
    // -------------------------------------------------------------------------

    public List<Examen> obtenerExamenesDeDocente(Integer idUsuario, Integer codsisDocente) {
        return examenRepository.findByIdUsuarioAndCodsisDocente(idUsuario, codsisDocente);
    }

    public List<Examen> obtenerExamenes() {
        return examenRepository.findAll();
    }

    public Examen obtenerExamenPorId(Integer id) {
        return examenRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "No se encontró el examen con ID: " + id));
    }

    // -------------------------------------------------------------------------
    // HELPERS PRIVADOS
    // -------------------------------------------------------------------------

    private void guardarAmbiente(Examen examen, Integer idAula, Integer idHorarioRegular,
            LocalTime horaInicio, LocalTime horaFin, TipoHorario tipoHorario) {
        Ambiente ambiente = new Ambiente();
        ambiente.setIdAsignatura(examen.getIdAsignatura());
        ambiente.setIdExamen(examen.getIdExamen());
        ambiente.setIdAula(idAula);
        ambiente.setIdHorarioRegular(idHorarioRegular);
        ambiente.setHoraInicio(horaInicio);
        ambiente.setHoraFin(horaFin);
        ambiente.setTipoHorario(tipoHorario);
        ambienteRepository.save(ambiente);
    }

    private void validarAulaActiva(Integer idAula) {
        Aula aula = aulaRepository.findById(idAula)
                .orElseThrow(() -> new IllegalArgumentException("Aula no encontrada: " + idAula));
        if (!Boolean.TRUE.equals(aula.getEstadoAula())) {
            throw new IllegalArgumentException(
                    "El aula '" + aula.getNombreAula() + "' está dada de baja y no puede usarse.");
        }
    }

    private void validarSinSolapamiento(Integer idAula, LocalDate fecha,
            LocalTime horaInicio, LocalTime horaFin,
            Integer idExamenAExcluir) {
        List<Ambiente> ambientesExistentes = ambienteRepository.findByIdAulaYFecha(idAula, fecha);

        for (Ambiente existente : ambientesExistentes) {
            if (idExamenAExcluir != null && idExamenAExcluir.equals(existente.getIdExamen())) {
                continue;
            }
            boolean seSuperponen = horaInicio.isBefore(existente.getHoraFin())
                    && horaFin.isAfter(existente.getHoraInicio());

            if (seSuperponen) {
                throw new IllegalArgumentException(
                        "El aula con id " + idAula + " ya está ocupada el " + fecha
                                + " entre " + existente.getHoraInicio() + " y " + existente.getHoraFin()
                                + " (examen id " + existente.getIdExamen() + ").");
            }
        }
    }

    private void validarExamen(ExamenRequest request) {
        if (request.getFechaExamen() == null) {
            throw new IllegalArgumentException("La fecha del examen es obligatoria.");
        }
        // El frontend manda la fecha a medianoche ("fecha" + "T00:00:00"), así que
        // compararla tal cual con la hora actual rechazaba cualquier examen del mismo
        // día. Se compara el inicio real del examen (fecha + hora de inicio) con la
        // hora oficial de Bolivia (el servidor de deploy puede estar en UTC).
        LocalDateTime inicioExamen = request.getFechaExamen().toLocalDate()
                .atTime(request.getHoraInicio() != null ? request.getHoraInicio() : LocalTime.MIDNIGHT);
        if (inicioExamen.isBefore(HoraOficial.ahora())) {
            throw new IllegalArgumentException(
                    "La fecha del examen no puede ser anterior a la fecha actual.");
        }
        if (request.getIdAsignatura() == null) {
            throw new IllegalArgumentException("La asignatura es obligatoria.");
        }
        if (request.getIdTipoExamen() == null) {
            throw new IllegalArgumentException("El tipo de examen es obligatorio.");
        }
        if (request.getTipoHorario() == null) {
            throw new IllegalArgumentException("Debe indicar si el horario es REGULAR o EVENTUAL.");
        }
        if (request.getTipoHorario() == TipoHorario.REGULAR
                && request.getIdHorarioRegular() == null) {
            throw new IllegalArgumentException("Debe indicar qué horario regular usará.");
        }
        if (request.getTipoHorario() == TipoHorario.EVENTUAL
                && (request.getIdAula() == null
                        || request.getHoraInicio() == null
                        || request.getHoraFin() == null)) {
            throw new IllegalArgumentException(
                    "Un horario eventual requiere aula, hora de inicio y hora de fin.");
        }
    }

    public ExamenDetalleDto obtenerDetalleExamenPorAsignatura(Integer idAsignatura) {
        List<Examen> examenes = examenRepository.findByIdAsignatura(idAsignatura);
        if (examenes.isEmpty()) {
            return new ExamenDetalleDto(null, "Examen Oficial", "---", "---", "---", idAsignatura);
        }

        Examen examen = examenes.stream()
                .filter(e -> Boolean.TRUE.equals(e.getEstadoExamen()))
                .findFirst()
                .orElse(examenes.get(examenes.size() - 1));

        String nombreExamen = "Examen Oficial";
        if (examen.getIdTipoExamen() != null) {
            TipoExamen te = tipoExamenRepository.findById(examen.getIdTipoExamen()).orElse(null);
            if (te != null) {
                nombreExamen = te.getNombreTipoExamen();
                if (examen.getDetalleTipoExamen() != null && !examen.getDetalleTipoExamen().isBlank()) {
                    nombreExamen += " (" + examen.getDetalleTipoExamen() + ")";
                }
            }
        }

        String fecha = (examen.getFechaExamen() != null) ? examen.getFechaExamen().toString() : "---";
        String hora = "---";
        String ambienteNombre = "---";

        LocalTime hInicio = null;
        LocalTime hFin = null;

        List<Ambiente> ambientes = ambienteRepository.findByIdExamen(examen.getIdExamen());
        if (ambientes.isEmpty()) {
            ambientes = ambienteRepository.findByIdAsignatura(idAsignatura);
        }

        if (!ambientes.isEmpty()) {
            Ambiente amb = ambientes.get(0);
            if (amb.getHoraInicio() != null && amb.getHoraFin() != null) {
                hInicio = amb.getHoraInicio();
                hFin = amb.getHoraFin();
                hora = amb.getHoraInicio() + " - " + amb.getHoraFin();
            }

            if (amb.getIdAula() != null) {
                Aula aula = aulaRepository.findById(amb.getIdAula()).orElse(null);
                if (aula != null) {
                    ambienteNombre = aula.getNombreAula()
                            + (aula.getUbicacionAula() != null && !aula.getUbicacionAula().isBlank()
                                    ? " · " + aula.getUbicacionAula()
                                    : "");
                }
            }
        }

        if ("---".equals(hora) || "---".equals(ambienteNombre)) {
            List<HorarioRegular> horarios = horarioRegularRepository.findByIdAsignatura(idAsignatura);
            if (!horarios.isEmpty()) {
                HorarioRegular hr = horarios.get(0);
                if ("---".equals(hora) && hr.getHoraInicio() != null && hr.getHoraFin() != null) {
                    if (hInicio == null)
                        hInicio = hr.getHoraInicio();
                    if (hFin == null)
                        hFin = hr.getHoraFin();
                    hora = hr.getHoraInicio() + " - " + hr.getHoraFin();
                }
                if ("---".equals(ambienteNombre) && hr.getIdAula() != null) {
                    Aula aula = aulaRepository.findById(hr.getIdAula()).orElse(null);
                    if (aula != null) {
                        ambienteNombre = aula.getNombreAula()
                                + (aula.getUbicacionAula() != null && !aula.getUbicacionAula().isBlank()
                                        ? " · " + aula.getUbicacionAula()
                                        : "");
                    }
                }
            }
        }

        String duracionExamen;
        if (hInicio != null && hFin != null) {
            long minutos = java.time.Duration.between(hInicio, hFin).toMinutes();
            if (minutos > 0) {
                long horas = minutos / 60;
                long mins = minutos % 60;
                duracionExamen = String.format("%02d:%02d", horas, mins);
            } else {
                duracionExamen = "01:30";
            }
        } else if (examen != null && examen.getDuracionExamen() != null) {
            duracionExamen = examen.getDuracionExamen().toString();
            if (duracionExamen.length() >= 5) {
                duracionExamen = duracionExamen.substring(0, 5);
            }
        } else {
            duracionExamen = "01:30";
        }

        String nombreDocente = "Docente Asignado";
        if (examen.getIdUsuario() != null) {
            Usuario u = usuarioRepository.findById(examen.getIdUsuario()).orElse(null);
            if (u != null) {
                String n = ((u.getNombreusuario() != null ? u.getNombreusuario() : "") + " "
                        + (u.getApellidousuario() != null ? u.getApellidousuario() : "")).trim();
                if (!n.isEmpty()) {
                    nombreDocente = n;
                }
            }
        }
        if ("Docente Asignado".equals(nombreDocente)) {
            List<DocenteAsignatura> docentesAsig = docenteAsignaturaRepository.findByIdIdasignatura(idAsignatura);
            if (!docentesAsig.isEmpty()) {
                Integer idU = docentesAsig.get(0).getId().getIdusuario();
                Usuario u = usuarioRepository.findById(idU).orElse(null);
                if (u != null) {
                    String n = ((u.getNombreusuario() != null ? u.getNombreusuario() : "") + " "
                            + (u.getApellidousuario() != null ? u.getApellidousuario() : "")).trim();
                    if (!n.isEmpty()) {
                        nombreDocente = n;
                    }
                }
            }
        }

        String siglaAsignatura = null;
        String nombreAsignaturaStr = null;
        if (idAsignatura != null) {
            Asignatura asig = asignaturaRepository.findById(idAsignatura).orElse(null);
            if (asig != null) {
                siglaAsignatura = asig.getSiglaAsignatura();
                nombreAsignaturaStr = asig.getNombreAsignatura();
            }
        }

        ExamenDetalleDto dto = new ExamenDetalleDto(
                examen.getIdExamen(),
                nombreExamen,
                fecha,
                hora,
                ambienteNombre,
                idAsignatura,
                nombreDocente);
        dto.setDuracion(duracionExamen);
        dto.setSiglaAsignatura(siglaAsignatura);
        dto.setNombreAsignatura(nombreAsignaturaStr);

        return dto;
    }
}
