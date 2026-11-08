package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public record OtroExamenDTO(String asignatura, String nombre, String aula, String hora,
                            String grupo, String edificio, Integer idAsignatura,
                            Integer idExamen, Integer idAmbiente) {
    public OtroExamenDTO(String asignatura, String nombre, String aula, String hora) {
        this(asignatura, nombre, aula, hora, null, null, null, null, null);
    }
}
