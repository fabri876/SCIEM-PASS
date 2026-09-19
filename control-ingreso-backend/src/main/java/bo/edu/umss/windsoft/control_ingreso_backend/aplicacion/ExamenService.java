package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ExamenAmbiente;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenAmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExamenService {

    private final ExamenRepository examenRepository;
    private final ExamenAmbienteRepository examenAmbienteRepository;

    public ExamenService(
            ExamenRepository examenRepository,
            ExamenAmbienteRepository examenAmbienteRepository) {

        this.examenRepository = examenRepository;
        this.examenAmbienteRepository = examenAmbienteRepository;
    }

    @Transactional
    public Examen registrarExamen(ExamenRequest request) {

        validarExamen(request);

        Examen examen = new Examen();

        // La base nueva guarda fecha_examen/fecha_creacion_examen como DATE
        // (sin hora) — ver Examen.java.
        examen.setFechaExamen(request.getFechaExamen().toLocalDate());
        examen.setDuracionExamen(request.getDuracionExamen());
        examen.setFechaCreacionExamen(LocalDate.now());
        examen.setNormasExamen(request.getNormasExamen());
        examen.setEstadoExamen(request.getEstadoExamen());
        examen.setIdAsignatura(request.getIdAsignatura());

        Examen examenGuardado = examenRepository.save(examen);

        for (Integer idAmbiente : request.getIdAmbientes()) {

            ExamenAmbiente examenAmbiente = new ExamenAmbiente();

            examenAmbiente.setIdExamen(
                    examenGuardado.getIdExamen()
            );

            examenAmbiente.setIdAmbiente(idAmbiente);

            examenAmbienteRepository.save(examenAmbiente);
        }

        return examenGuardado;
    }

    public List<Examen> obtenerExamenes() {
        return examenRepository.findAll();
    }

    public Examen obtenerExamenPorId(Integer id) {
        return examenRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "No se encontró el examen con ID: " + id
                        )
                );
    }

    private void validarExamen(ExamenRequest request) {

        if (request.getFechaExamen() == null) {
            throw new IllegalArgumentException(
                    "La fecha del examen es obligatoria."
            );
        }

        if (request.getFechaExamen().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "La fecha del examen no puede ser anterior a la fecha actual."
            );
        }

        if (request.getDuracionExamen() == null) {
            throw new IllegalArgumentException(
                    "La duración del examen es obligatoria."
            );
        }

        if (request.getIdAsignatura() == null) {
            throw new IllegalArgumentException(
                    "La asignatura es obligatoria."
            );
        }

        if (request.getIdAmbientes() == null
                || request.getIdAmbientes().isEmpty()) {

            throw new IllegalArgumentException(
                    "Debe asignarse al menos un ambiente al examen."
            );
        }
    }
}