package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotBlank;

public class MotivoInhabilitacionRequestDTO {

    @NotBlank(message = "El nombre del motivo es obligatorio")
    private String nombremotivo;

    private String descripcionmotivo;

    public MotivoInhabilitacionRequestDTO() {
    }

    public MotivoInhabilitacionRequestDTO(String nombremotivo, String descripcionmotivo) {
        this.nombremotivo = nombremotivo;
        this.descripcionmotivo = descripcionmotivo;
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
}
