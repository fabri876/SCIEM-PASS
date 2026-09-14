package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MotivoInhabilitacionRequestDto {

    @NotBlank(message = "El nombre del motivo es obligatorio")
    @Size(max = 100, message = "El nombre del motivo no puede superar los 100 caracteres")
    private String nombreMotivo;

    @Size(max = 255, message = "La descripción del motivo no puede superar los 255 caracteres")
    private String descripcionMotivo;

    public MotivoInhabilitacionRequestDto() {
    }

    public MotivoInhabilitacionRequestDto(String nombreMotivo, String descripcionMotivo) {
        this.nombreMotivo = nombreMotivo;
        this.descripcionMotivo = descripcionMotivo;
    }

    public String getNombreMotivo() {
        return nombreMotivo;
    }

    public void setNombreMotivo(String nombreMotivo) {
        this.nombreMotivo = nombreMotivo;
    }

    public String getDescripcionMotivo() {
        return descripcionMotivo;
    }

    public void setDescripcionMotivo(String descripcionMotivo) {
        this.descripcionMotivo = descripcionMotivo;
    }
}
