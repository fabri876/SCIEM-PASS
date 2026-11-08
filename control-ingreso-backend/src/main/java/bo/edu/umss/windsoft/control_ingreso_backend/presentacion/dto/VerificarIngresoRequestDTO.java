package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Solicitud de identificación/registro de ingreso.
 *
 * <p>{@code soloVerificar = true} hace que el backend valide todo (QR, horario,
 * habilitación, duplicado, aula) pero NO registre el ingreso. Se usa en la
 * primera fase del control: identificar al estudiante antes del facial.</p>
 *
 * <p>Los scores faciales son opcionales. Cuando llegan, el ingreso queda
 * marcado como "con facial" (método QR/MANUAL + score_facial no nulo).</p>
 */
public record VerificarIngresoRequestDTO(
        @NotBlank(message = "El C.I. o Código SIS del estudiante es obligatorio.")
        String identificador,

        @NotNull(message = "El ID de la asignatura es obligatorio.")
        Integer idasignatura,

        @NotNull(message = "El ID del examen es obligatorio.")
        Integer idexamen,

        @NotNull(message = "El ID del ambiente es obligatorio.")
        Integer idambiente,

        MetodoIngreso metodoIngreso,

        java.util.UUID solicitud,

        Boolean soloVerificar,

        Double scoreFacial,

        Double livenessScore,

        String modelVersion,

        String deviceId
) {
    /** Constructor de compatibilidad para los flujos existentes. */
    public VerificarIngresoRequestDTO(String identificador, Integer idasignatura, Integer idexamen,
                                      Integer idambiente, MetodoIngreso metodoIngreso) {
        this(identificador, idasignatura, idexamen, idambiente, metodoIngreso, null, false, null, null, null, null);
    }

    /** Constructor de compatibilidad con solicitud UUID (tests e idempotencia). */
    public VerificarIngresoRequestDTO(String identificador, Integer idasignatura, Integer idexamen,
                                      Integer idambiente, MetodoIngreso metodoIngreso, java.util.UUID solicitud) {
        this(identificador, idasignatura, idexamen, idambiente, metodoIngreso, solicitud, false, null, null, null, null);
    }

    /** Constructor de compatibilidad para sincronización por lote con scores faciales. */
    public VerificarIngresoRequestDTO(String identificador, Integer idasignatura, Integer idexamen,
                                      Integer idambiente, MetodoIngreso metodoIngreso,
                                      Boolean soloVerificar, Double scoreFacial, Double livenessScore,
                                      String modelVersion, String deviceId) {
        this(identificador, idasignatura, idexamen, idambiente, metodoIngreso, null,
                soloVerificar, scoreFacial, livenessScore, modelVersion, deviceId);
    }
}
