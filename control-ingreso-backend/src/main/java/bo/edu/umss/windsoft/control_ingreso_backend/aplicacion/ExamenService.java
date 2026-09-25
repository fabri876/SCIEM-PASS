// aplicacion/ExamenService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AmbienteRespuestaDto;

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
            UsuarioRepository usuarioRepository) {

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
            // FIX #1: leer codsisdocente real desde la tabla docente, NO forzarlo
            // igual a idUsuario.
            Integer idUsuarioAutenticado = (Integer) auth.getDetails();
            Docente docente = docenteRepository.findByIdusuario(idUsuarioAutenticado)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "No se encontró un docente para el usuario autenticado."));
            request.setIdUsuario(idUsuarioAutenticado);
            request.setCodsisDocente(docente.getCodsisdocente());
        }
        // Si es admin, se respeta lo que venga en el body (idUsuario/codsisDocente del docente elegido)

        return crearOActualizarExamen(null, request);
    }

    // -------------------------------------------------------------------------
    // ACTUALIZAR EXAMEN  (PUT /api/examenes/{id})
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
        // Si es admin, puede editar el examen de cualquier docente respetando lo que venga en el body.

        // Borrar ambientes viejos y normas viejas (se regeneran con crearOActualizarExamen)
        ambienteRepository.deleteAll(ambienteRepository.findByIdExamen(idExamen));
        examenNormaGeneralRepository.deleteAll(
                examenNormaGeneralRepository.findByIdIdExamen(idExamen));
        normaEspecificaRepository.deleteAll(
                normaEspecificaRepository.findByIdAsignaturaAndIdExamen(
                        examenExistente.getIdAsignatura(), idExamen));

        Examen actualizado = crearOActualizarExamen(examenExistente, request);
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

        // FIX #4 (punto 4 de la lista urgente): impedir que un docente repita
        // el mismo tipo de examen (ej. "Primer Parcial") en la misma asignatura.
        // Al editar, se permite que el examen conserve su propio tipo sin chocar consigo mismo.
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

            boolean perteneceAlDocente =
                    hr.getIdUsuario().equals(request.getIdUsuario())
                    && hr.getCodsisDocente().equals(request.getCodsisDocente())
                    && hr.getIdAsignatura().equals(request.getIdAsignatura());

            if (!perteneceAlDocente) {
                throw new IllegalArgumentException(
                        "Ese horario regular no pertenece a este docente/asignatura.");
            }

            idAula = hr.getIdAula();
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

        // Validar existencia y estado de TODAS las aulas ANTES de guardar nada.
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
                guardarAmbiente(examenGuardado, idAulaAdicional, idHorarioRegularUsado, horaInicio, horaFin, request.getTipoHorario());
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

    public List<ExamenRespuestaDto> obtenerExamenesDocenteEnriquecidos(
            Integer idUsuario, Integer codsisDocente) {
        return enriquecerLote(examenRepository.findByIdUsuarioAndCodsisDocente(idUsuario, codsisDocente));
    }

    /** Construye el DTO enriquecido para un único examen (usa el batch de tamaño 1). */
    public ExamenRespuestaDto enriquecerExamen(Examen examen) {
        return enriquecerLote(List.of(examen)).get(0);
    }

    /** Enriquece una lista de exámenes con UNA consulta por tipo de dato relacionado
     *  (asignaturas, tipos, docentes, ambientes, aulas), en vez de una consulta por
     *  examen. Evita el patrón N+1 que causaba ~10s de latencia con pocos registros. */
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

            List<Ambiente> ambientesDeEsteExamen = ambientesPorExamen.getOrDefault(examen.getIdExamen(), List.of());
            List<AmbienteRespuestaDto> ambientesDto = ambientesDeEsteExamen.stream().map(a -> {
                AmbienteRespuestaDto amb = new AmbienteRespuestaDto();
                amb.setIdAmbiente(a.getIdAmbiente());
                amb.setIdAula(a.getIdAula());
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
        if (request.getFechaExamen().isBefore(LocalDateTime.now())) {
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

        // 1. Intentar obtener de la tabla Ambiente vinculada al examen o la asignatura
        List<Ambiente> ambientes = ambienteRepository.findByIdExamen(examen.getIdExamen());
        if (ambientes.isEmpty()) {
            ambientes = ambienteRepository.findByIdAsignatura(idAsignatura);
        }

        if (!ambientes.isEmpty()) {
            Ambiente amb = ambientes.get(0);
            if (amb.getHoraInicio() != null && amb.getHoraFin() != null) {
                hora = amb.getHoraInicio() + " - " + amb.getHoraFin();
            }

            if (amb.getIdAula() != null) {
                Aula aula = aulaRepository.findById(amb.getIdAula()).orElse(null);
                if (aula != null) {
                    ambienteNombre = aula.getNombreAula() + (aula.getUbicacionAula() != null && !aula.getUbicacionAula().isBlank() ? " · " + aula.getUbicacionAula() : "");
                }
            }
        }

        // 2. Fallback: Si hora o ambiente siguen siendo "---", consultar HorarioRegular
        if ("---".equals(hora) || "---".equals(ambienteNombre)) {
            List<HorarioRegular> horarios = horarioRegularRepository.findByIdAsignatura(idAsignatura);
            if (!horarios.isEmpty()) {
                HorarioRegular hr = horarios.get(0);
                if ("---".equals(hora) && hr.getHoraInicio() != null && hr.getHoraFin() != null) {
                    hora = hr.getHoraInicio() + " - " + hr.getHoraFin();
                }
                if ("---".equals(ambienteNombre) && hr.getIdAula() != null) {
                    Aula aula = aulaRepository.findById(hr.getIdAula()).orElse(null);
                    if (aula != null) {
                        ambienteNombre = aula.getNombreAula() + (aula.getUbicacionAula() != null && !aula.getUbicacionAula().isBlank() ? " · " + aula.getUbicacionAula() : "");
                    }
                }
            }
        }

        // 3. Fallback de duración de examen para hora
        if ("---".equals(hora) && examen.getDuracionExamen() != null) {
            hora = "Duración: " + examen.getDuracionExamen();
        }

        return new ExamenDetalleDto(
                examen.getIdExamen(),
                nombreExamen,
                fecha,
                hora,
                ambienteNombre,
                idAsignatura
        );
    }
}