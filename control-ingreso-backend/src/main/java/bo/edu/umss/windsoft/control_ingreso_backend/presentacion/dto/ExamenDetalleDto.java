package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class ExamenDetalleDto {

    private Integer idExamen;
    private String nombreExamen;
    private String fecha;
    private String hora;
    private String ambiente;
    private Integer idAsignatura;

    public ExamenDetalleDto() {}

    public ExamenDetalleDto(Integer idExamen, String nombreExamen, String fecha, String hora, String ambiente, Integer idAsignatura) {
        this.idExamen = idExamen;
        this.nombreExamen = nombreExamen;
        this.fecha = fecha;
        this.hora = hora;
        this.ambiente = ambiente;
        this.idAsignatura = idAsignatura;
    }

    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }

    public String getNombreExamen() { return nombreExamen; }
    public void setNombreExamen(String nombreExamen) { this.nombreExamen = nombreExamen; }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }

    public String getHora() { return hora; }
    public void setHora(String hora) { this.hora = hora; }

    public String getAmbiente() { return ambiente; }
    public void setAmbiente(String ambiente) { this.ambiente = ambiente; }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
}
