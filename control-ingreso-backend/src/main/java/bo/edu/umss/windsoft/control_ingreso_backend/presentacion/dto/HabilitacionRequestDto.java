package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.Size;

public class HabilitacionRequestDto {

    private Boolean estadoHabilitacion;
    private String estado;
    private Integer idMotivo;
    private String motivo;
    private String observacion;

    @Size(max = 255, message = "La observación no puede superar los 255 caracteres")
    private String observacionHabilitacion;

    public HabilitacionRequestDto() {
    }

    public HabilitacionRequestDto(Boolean estadoHabilitacion, String observacionHabilitacion) {
        this.estadoHabilitacion = estadoHabilitacion;
        this.observacionHabilitacion = observacionHabilitacion;
    }

    public Boolean getEstadoHabilitacion() {
        return estadoHabilitacion;
    }

    public void setEstadoHabilitacion(Boolean estadoHabilitacion) {
        this.estadoHabilitacion = estadoHabilitacion;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Integer getIdMotivo() {
        return idMotivo;
    }

    public void setIdMotivo(Integer idMotivo) {
        this.idMotivo = idMotivo;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public String getObservacionHabilitacion() {
        return observacionHabilitacion;
    }

    public void setObservacionHabilitacion(String observacionHabilitacion) {
        this.observacionHabilitacion = observacionHabilitacion;
    }

    public Boolean resolverEstado() {
        if (estadoHabilitacion != null) {
            return estadoHabilitacion;
        }
        if (estado != null) {
            return "HABILITADO".equalsIgnoreCase(estado.trim()) || "TRUE".equalsIgnoreCase(estado.trim());
        }
        return null;
    }

    public String resolverTextoMotivo() {
        if (observacionHabilitacion != null && !observacionHabilitacion.trim().isEmpty()) {
            return observacionHabilitacion.trim();
        }
        if (motivo != null && !motivo.trim().isEmpty()) {
            return motivo.trim();
        }
        if (observacion != null && !observacion.trim().isEmpty()) {
            return observacion.trim();
        }
        return null;
    }
}

