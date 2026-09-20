// aplicacion/ExamenService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

    public ExamenService(
            ExamenRepository examenRepository,
            AmbienteRepository ambienteRepository,
            DocenteAsignaturaRepository docenteAsignaturaRepository,
            HorarioRegularRepository horarioRegularRepository,
            ExamenNormaGeneralRepository examenNormaGeneralRepository,
            NormaEspecificaRepository normaEspecificaRepository,
            TipoExamenRepository tipoExamenRepository) {

        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.horarioRegularRepository = horarioRegularRepository;
        this.examenNormaGeneralRepository = examenNormaGeneralRepository;
        this.normaEspecificaRepository = normaEspecificaRepository;
        this.tipoExamenRepository = tipoExamenRepository;
    }

    @Transactional
    public Examen registrarExamen(ExamenRequest request) {

        validarExamen(request);

        // 1. El docente realmente dicta esa asignatura
        DocenteAsignaturaId daId = new DocenteAsignaturaId(
                request.getIdUsuario(), request.getCodsisDocente(), request.getIdAsignatura());

        docenteAsignaturaRepository.findById(daId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "El docente no dicta esa asignatura."));

        // 2. Tipo de examen válido, y detalle obligatorio si el tipo lo requiere (ej. "Otro")
        TipoExamen tipoExamen = tipoExamenRepository.findById(request.getIdTipoExamen())
                .orElseThrow(() -> new IllegalArgumentException("Tipo de examen no encontrado."));

        if (Boolean.TRUE.equals(tipoExamen.getRequiereDescripcion())
                && (request.getDetalleTipoExamen() == null
                    || request.getDetalleTipoExamen().isBlank())) {
            throw new IllegalArgumentException(
                    "Debe especificar el detalle del tipo de examen.");
        }

        // 3. Resolver aula + horario según REGULAR o EVENTUAL
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

        // 4. Crear el examen
        Examen examen = new Examen();
        examen.setFechaExamen(request.getFechaExamen().toLocalDate());
        examen.setDuracionExamen(LocalTime.MIDNIGHT.plus(duracion));
        examen.setFechaCreacionExamen(LocalDate.now());
        examen.setEstadoExamen(request.getEstadoExamen());
        examen.setIdAsignatura(request.getIdAsignatura());
        examen.setIdTipoExamen(request.getIdTipoExamen());
        examen.setDetalleTipoExamen(request.getDetalleTipoExamen());

        Examen examenGuardado = examenRepository.save(examen);

        // 5. Crear la asignación real de aula+horario para este examen
        Ambiente ambiente = new Ambiente();
        ambiente.setIdAsignatura(examenGuardado.getIdAsignatura());
        ambiente.setIdExamen(examenGuardado.getIdExamen());
        ambiente.setIdAula(idAula);
        ambiente.setIdHorarioRegular(idHorarioRegularUsado);
        ambiente.setHoraInicio(horaInicio);
        ambiente.setHoraFin(horaFin);
        ambiente.setTipoHorario(request.getTipoHorario());
        ambienteRepository.save(ambiente);

        // 6. Normas generales elegidas del catálogo
        if (request.getIdsNormasGenerales() != null) {
            for (Integer idNormaGeneral : request.getIdsNormasGenerales()) {
                ExamenNormaGeneralId id = new ExamenNormaGeneralId(
                        examenGuardado.getIdAsignatura(),
                        examenGuardado.getIdExamen(),
                        idNormaGeneral);
                examenNormaGeneralRepository.save(new ExamenNormaGeneral(id));
            }
        }

        // 7. Normas específicas nuevas, propias de este examen
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

    public List<HorarioRegular> obtenerHorariosRegulares(
            Integer idUsuario, Integer codsisDocente, Integer idAsignatura) {

        return horarioRegularRepository
                .findByIdUsuarioAndCodsisDocenteAndIdAsignaturaAndEstadoHorarioTrue(
                        idUsuario, codsisDocente, idAsignatura);
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
            throw new IllegalArgumentException(
                    "Debe indicar qué horario regular usará.");
        }
        if (request.getTipoHorario() == TipoHorario.EVENTUAL
                && (request.getIdAula() == null
                    || request.getHoraInicio() == null
                    || request.getHoraFin() == null)) {
            throw new IllegalArgumentException(
                    "Un horario eventual requiere aula, hora de inicio y hora de fin.");
        }
    }
}