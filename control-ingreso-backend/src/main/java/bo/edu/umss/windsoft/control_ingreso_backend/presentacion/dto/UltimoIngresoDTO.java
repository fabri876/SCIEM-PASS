package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record UltimoIngresoDTO(
        Integer idIngreso,
        LocalDateTime horaIngreso,
        String metodoIngreso,
        EstudianteResumenDTO estudiante,
        String registradoPor,
        Integer idAsignatura,
        Integer idExamen,
        Integer idAmbiente,
        /** true cuando el ingreso se registró con verificación facial aprobada. */
        boolean verificacionFacial,
        /** Similitud facial 0..1; null cuando el ingreso fue sin facial. */
        Double scoreFacial,
        String estado
) {
    public UltimoIngresoDTO(Integer idIngreso, LocalDateTime horaIngreso, String metodoIngreso,
                            EstudianteResumenDTO estudiante, String registradoPor, Integer idAsignatura,
                            Integer idExamen, Integer idAmbiente, boolean verificacionFacial,
                            Double scoreFacial) {
        this(idIngreso, horaIngreso, metodoIngreso, estudiante, registradoPor, idAsignatura, idExamen,
                idAmbiente, verificacionFacial, scoreFacial, "PERMITIDO");
    }

    public UltimoIngresoDTO(Integer idIngreso, LocalDateTime horaIngreso, String metodoIngreso,
                            EstudianteResumenDTO estudiante, String registradoPor, Integer idAsignatura,
                            Integer idExamen, Integer idAmbiente, String estado) {
        this(idIngreso, horaIngreso, metodoIngreso, estudiante, registradoPor, idAsignatura, idExamen,
                idAmbiente, false, null, estado);
    }

    public UltimoIngresoDTO(Integer idIngreso, LocalDateTime horaIngreso, String metodoIngreso,
                            EstudianteResumenDTO estudiante, String registradoPor, Integer idAsignatura,
                            Integer idExamen, Integer idAmbiente) {
        this(idIngreso, horaIngreso, metodoIngreso, estudiante, registradoPor, idAsignatura, idExamen,
                idAmbiente, false, null, "PERMITIDO");
    }
}