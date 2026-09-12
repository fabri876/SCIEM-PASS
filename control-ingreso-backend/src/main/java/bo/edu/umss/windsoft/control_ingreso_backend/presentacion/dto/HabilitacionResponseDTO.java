package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.OffsetDateTime;

public class HabilitacionResponseDTO {

    private Integer idhabilitacion;
    private Integer codsisestudiante;
    private String nombreEstudiante;
    private String apellidoEstudiante;
    private String ciEstudiante;
    private Boolean estadohabilitacion;
    private String estado;
    private Integer idmotivo;
    private String nombremotivo;
    private String descripcionmotivo;
    private String observacionhabilitacion;
    private OffsetDateTime fecharegistro;

    public HabilitacionResponseDTO() {
    }

    public HabilitacionResponseDTO(Integer idhabilitacion, Integer codsisestudiante, String nombreEstudiante,
                                  String apellidoEstudiante, String ciEstudiante, Boolean estadohabilitacion,
                                  Integer idmotivo, String nombremotivo, String descripcionmotivo,
                                  String observacionhabilitacion, OffsetDateTime fecharegistro) {
        this.idhabilitacion = idhabilitacion;
        this.codsisestudiante = codsisestudiante;
        this.nombreEstudiante = nombreEstudiante;
        this.apellidoEstudiante = apellidoEstudiante;
        this.ciEstudiante = ciEstudiante;
        this.estadohabilitacion = estadohabilitacion;
        this.estado = Boolean.TRUE.equals(estadohabilitacion) ? "HABILITADO" : "INHABILITADO";
        this.idmotivo = idmotivo;
        this.nombremotivo = nombremotivo;
        this.descripcionmotivo = descripcionmotivo;
        this.observacionhabilitacion = observacionhabilitacion;
        this.fecharegistro = fecharegistro;
    }

    public Integer getIdhabilitacion() {
        return idhabilitacion;
    }

    public void setIdhabilitacion(Integer idhabilitacion) {
        this.idhabilitacion = idhabilitacion;
    }

    public Integer getCodsisestudiante() {
        return codsisestudiante;
    }

    public void setCodsisestudiante(Integer codsisestudiante) {
        this.codsisestudiante = codsisestudiante;
    }

    public String getNombreEstudiante() {
        return nombreEstudiante;
    }

    public void setNombreEstudiante(String nombreEstudiante) {
        this.nombreEstudiante = nombreEstudiante;
    }

    public String getApellidoEstudiante() {
        return apellidoEstudiante;
    }

    public void setApellidoEstudiante(String apellidoEstudiante) {
        this.apellidoEstudiante = apellidoEstudiante;
    }

    public String getCiEstudiante() {
        return ciEstudiante;
    }

    public void setCiEstudiante(String ciEstudiante) {
        this.ciEstudiante = ciEstudiante;
    }

    public Boolean getEstadohabilitacion() {
        return estadohabilitacion;
    }

    public void setEstadohabilitacion(Boolean estadohabilitacion) {
        this.estadohabilitacion = estadohabilitacion;
        this.estado = Boolean.TRUE.equals(estadohabilitacion) ? "HABILITADO" : "INHABILITADO";
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Integer getIdmotivo() {
        return idmotivo;
    }

    public void setIdmotivo(Integer idmotivo) {
        this.idmotivo = idmotivo;
    }

    public String getNombremotivo() {
        return nombremotivo;
    }

    public void setNombremotivo(String nombremotivo) {
        this.nombremotivo = nombremotivo;
    }

    public String getDescripcionmotivo() {
        return descripcionmotivo;
    }

    public void setDescripcionmotivo(String descripcionmotivo) {
        this.descripcionmotivo = descripcionmotivo;
    }

    public String getObservacionhabilitacion() {
        return observacionhabilitacion;
    }

    public void setObservacionhabilitacion(String observacionhabilitacion) {
        this.observacionhabilitacion = observacionhabilitacion;
    }

    public OffsetDateTime getFecharegistro() {
        return fecharegistro;
    }

    public void setFecharegistro(OffsetDateTime fecharegistro) {
        this.fecharegistro = fecharegistro;
    }
}
