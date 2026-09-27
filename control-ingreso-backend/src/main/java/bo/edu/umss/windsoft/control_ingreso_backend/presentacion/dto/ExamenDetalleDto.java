package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class ExamenDetalleDto {

    private Integer idExamen;
    private Integer idAsignatura;
    private String nombreExamen;
    private String fecha;
    private String duracion;
    private String siglaAsignatura;
    private String nombreAsignatura;
    private String nombreDocente;
    private String hora;
    private String ambiente;


    public ExamenDetalleDto() {}

    public ExamenDetalleDto(Integer idExamen, String nombreExamen, String fecha, String hora, String ambiente, Integer idAsignatura) {
        this.idExamen = idExamen;
        this.nombreExamen = nombreExamen;
        this.fecha = fecha;
        this.hora = hora;
        this.ambiente = ambiente;
        this.idAsignatura = idAsignatura;
    }

    public ExamenDetalleDto(Integer idExamen, String nombreExamen, String fecha, String hora, String ambiente, Integer idAsignatura, String nombreDocente) {
        this.idExamen = idExamen;
        this.nombreExamen = nombreExamen;
        this.fecha = fecha;
        this.hora = hora;
        this.ambiente = ambiente;
        this.idAsignatura = idAsignatura;
        this.nombreDocente = nombreDocente;
    }

    public ExamenDetalleDto(Integer idExamen, String nombreExamen, String fecha, String hora, String duracion, String ambiente, Integer idAsignatura, String siglaAsignatura, String nombreAsignatura, String nombreDocente) {
        this.idExamen = idExamen;
        this.nombreExamen = nombreExamen;
        this.fecha = fecha;
        this.hora = hora;
        this.duracion = duracion;
        this.ambiente = ambiente;
        this.idAsignatura = idAsignatura;
        this.siglaAsignatura = siglaAsignatura;
        this.nombreAsignatura = nombreAsignatura;
        this.nombreDocente = nombreDocente;
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

    public String getNombreDocente() { return nombreDocente; }
    public void setNombreDocente(String nombreDocente) { this.nombreDocente = nombreDocente; }

    public String getDuracion() { return duracion; }
    public void setDuracion(String duracion) { this.duracion = duracion; }

    public String getSiglaAsignatura() { return siglaAsignatura; }
    public void setSiglaAsignatura(String siglaAsignatura) { this.siglaAsignatura = siglaAsignatura; }

    public String getNombreAsignatura() { return nombreAsignatura; }
    public void setNombreAsignatura(String nombreAsignatura) { this.nombreAsignatura = nombreAsignatura; }
}
