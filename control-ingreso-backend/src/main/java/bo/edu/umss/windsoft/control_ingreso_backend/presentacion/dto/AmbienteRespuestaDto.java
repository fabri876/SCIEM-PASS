// presentacion/dto/AmbienteRespuestaDto.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/**
 * DTO de lectura para ambientes (aulas asignadas a un examen).
 * Los datos del aula (nombre, ubicación, capacidad) se resuelven en el
 * momento vía JOIN a Aula, en vez de guardarse copiados en la tabla
 * ambiente (evita la redundancia/dependencia transitiva detectada).
 */
public class AmbienteRespuestaDto {

    private Integer idAmbiente;
    private Integer idAula;
    private String nombreAmbiente;
    private String ubicacionAmbiente;
    private Integer capacidadAmbiente;
    private String tipoHorario;
    private String horaInicio;
    private String horaFin;

    public AmbienteRespuestaDto() {}

    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }
    public Integer getIdAula() { return idAula; }
    public void setIdAula(Integer idAula) { this.idAula = idAula; }
    public String getNombreAmbiente() { return nombreAmbiente; }
    public void setNombreAmbiente(String nombreAmbiente) { this.nombreAmbiente = nombreAmbiente; }
    public String getUbicacionAmbiente() { return ubicacionAmbiente; }
    public void setUbicacionAmbiente(String ubicacionAmbiente) { this.ubicacionAmbiente = ubicacionAmbiente; }
    public Integer getCapacidadAmbiente() { return capacidadAmbiente; }
    public void setCapacidadAmbiente(Integer capacidadAmbiente) { this.capacidadAmbiente = capacidadAmbiente; }
    public String getTipoHorario() { return tipoHorario; }
    public void setTipoHorario(String tipoHorario) { this.tipoHorario = tipoHorario; }
    public String getHoraInicio() { return horaInicio; }
    public void setHoraInicio(String horaInicio) { this.horaInicio = horaInicio; }
    public String getHoraFin() { return horaFin; }
    public void setHoraFin(String horaFin) { this.horaFin = horaFin; }
}