// aplicacion/ExamenService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;

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

    public ExamenService(
            ExamenRepository examenRepository,
            AmbienteRepository ambienteRepository,
            DocenteAsignaturaRepository docenteAsignaturaRepository,
            HorarioRegularRepository horarioRegularRepository,
            ExamenNormaGeneralRepository examenNormaGeneralRepository,
            NormaEspecificaRepository normaEspecificaRepository,
            TipoExamenRepository tipoExamenRepository,
            AulaRepository aulaRepository) {

        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.horarioRegularRepository = horarioRegularRepository;
        this.examenNormaGeneralRepository = examenNormaGeneralRepository;
        this.normaEspecificaRepository = normaEspecificaRepository;
        this.tipoExamenRepository = tipoExamenRepository;
        this.aulaRepository = aulaRepository;
    }

    @Transactional
    public Examen registrarExamen(ExamenRequest request) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean esAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRADOR"));

        if (!esAdmin) {
            // Docente normal: ignoramos lo que venga en el body y usamos SIEMPRE
            // el usuario real del token, para que no pueda crear a nombre de otro.
            Integer idUsuarioAutenticado = (Integer) auth.getDetails();
            request.setIdUsuario(idUsuarioAutenticado);
            request.setCodsisDocente(idUsuarioAutenticado); // codsisdocente = idusuario siempre, por diseño
        }
        // Si es admin, se respeta lo que venga en el body (idUsuario/codsisDocente del docente elegido)

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

        // Validar aulas adicionales ANTES de guardar nada (fallar rápido, sin dejar datos a medias)
        List<Integer> aulasAdicionales = request.getIdsAulasAdicionales();
        if (aulasAdicionales != null && !aulasAdicionales.isEmpty()) {

            if (aulasAdicionales.size() != new HashSet<>(aulasAdicionales).size()) {
                throw new IllegalArgumentException("Hay aulas adicionales repetidas en la lista.");
            }
            if (aulasAdicionales.contains(idAula)) {
                throw new IllegalArgumentException(
                        "El aula " + idAula + " ya es el aula principal del examen, no la repitas como adicional.");
            }
            for (Integer idAulaAdicional : aulasAdicionales) {
                aulaRepository.findById(idAulaAdicional)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Aula adicional no encontrada: " + idAulaAdicional));
            }
        }

        Examen examen = new Examen();
        examen.setFechaExamen(request.getFechaExamen().toLocalDate());
        examen.setDuracionExamen(LocalTime.MIDNIGHT.plus(duracion));
        examen.setFechaCreacionExamen(LocalDate.now());
        examen.setEstadoExamen(request.getEstadoExamen());
        examen.setIdAsignatura(request.getIdAsignatura());
        examen.setIdTipoExamen(request.getIdTipoExamen());
        examen.setDetalleTipoExamen(request.getDetalleTipoExamen());
        examen.setIdUsuario(request.getIdUsuario());
        examen.setCodsisDocente(request.getCodsisDocente());
        
        Examen examenGuardado = examenRepository.save(examen);

        // Ambiente principal (igual que siempre)
        guardarAmbiente(examenGuardado, idAula, idHorarioRegularUsado, horaInicio, horaFin, request.getTipoHorario());

        // Ambientes adicionales: mismo examen, mismo horario, distinta aula
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

    private void guardarAmbiente(Examen examen, Integer idAula, Integer idHorarioRegular,
                                  LocalTime horaInicio, LocalTime horaFin, TipoHorario tipoHorario) {

        Aula aula = aulaRepository.findById(idAula)
                .orElseThrow(() -> new IllegalArgumentException("Aula no encontrada: " + idAula));

        if (!Boolean.TRUE.equals(aula.getEstadoAula())) {
            throw new IllegalArgumentException(
                    "El aula '" + aula.getNombreAula() + "' está dada de baja y no puede usarse para un examen.");
        }

        Ambiente ambiente = new Ambiente();
        ambiente.setIdAsignatura(examen.getIdAsignatura());
        ambiente.setIdExamen(examen.getIdExamen());
        ambiente.setIdAula(idAula);
        ambiente.setNombreAmbiente(aula.getNombreAula());
        ambiente.setUbicacionAmbiente(aula.getUbicacionAula());
        ambiente.setCapacidadAmbiente(aula.getCapacidadAula());
        ambiente.setIdHorarioRegular(idHorarioRegular);
        ambiente.setHoraInicio(horaInicio);
        ambiente.setHoraFin(horaFin);
        ambiente.setTipoHorario(tipoHorario);
        ambienteRepository.save(ambiente);
    }

    // NUEVO: para que el frontend pueda mostrar todas las aulas de un examen
    public List<Ambiente> obtenerAmbientesDeExamen(Integer idExamen) {
        return ambienteRepository.findByIdExamen(idExamen);
    }

    public List<HorarioRegular> obtenerHorariosRegulares(
            Integer idUsuario, Integer codsisDocente, Integer idAsignatura) {
        return horarioRegularRepository
                .findByIdUsuarioAndCodsisDocenteAndIdAsignaturaAndEstadoHorarioTrue(
                        idUsuario, codsisDocente, idAsignatura);
    }
    
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
            if ("---".equals(ambienteNombre) && amb.getNombreAmbiente() != null && !amb.getNombreAmbiente().isBlank()) {
                ambienteNombre = amb.getNombreAmbiente() + (amb.getUbicacionAmbiente() != null && !amb.getUbicacionAmbiente().isBlank() ? " · " + amb.getUbicacionAmbiente() : "");
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