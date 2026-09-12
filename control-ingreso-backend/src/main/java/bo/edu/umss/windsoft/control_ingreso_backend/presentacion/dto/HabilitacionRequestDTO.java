package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotNull;

public class HabilitacionRequestDTO {

    @NotNull(message = "El código SIS del estudiante es obligatorio")
    private Integer codsisestudiante;

    @NotNull(message = "El estado de habilitación es obligatorio")
    private Boolean estadohabilitacion;

    private Integer idmotivo;

    private String observacionhabilitacion;

    public HabilitacionRequestDTO() {
    }

    public HabilitacionRequestDTO(Integer codsisestudiante, Boolean estadohabilitacion, Integer idmotivo, String observacionhabilitacion) {
        this.codsisestudiante = codsisestudiante;
        this.estadohabilitacion = estadohabilitacion;
        this.idmotivo = idmotivo;
        this.observacionhabilitacion = observacionhabilitacion;
    }

    public Integer getCodsisestudiante() {
        return codsisestudiante;
    }

    public void setCodsisestudiante(Integer codsisestudiante) {
        this.codsisestudiante = codsisestudiante;
    }

    public Boolean getEstadohabilitacion() {
        return estadohabilitacion;
    }

    public void setEstadohabilitacion(Boolean estadohabilitacion) {
        this.estadohabilitacion = estadohabilitacion;
    }

    public Integer getIdmotivo() {
        return idmotivo;
    }

    public void setIdmotivo(Integer idmotivo) {
        this.idmotivo = idmotivo;
    }

    public String getObservacionhabilitacion() {
        return observacionhabilitacion;
    }

    public void setObservacionhabilitacion(String observacionhabilitacion) {
        this.observacionhabilitacion = observacionhabilitacion;
    }
}
