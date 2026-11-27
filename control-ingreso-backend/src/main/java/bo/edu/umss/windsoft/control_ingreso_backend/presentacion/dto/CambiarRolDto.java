package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotBlank;

public class CambiarRolDto {

    @NotBlank(message = "El nuevo rol es obligatorio")
    private String nuevoRol;

    // Solo obligatorio cuando nuevoRol=ESTUDIANTE.
    @jakarta.validation.constraints.Min(value = 100000000, message = "El Código SIS debe tener exactamente 9 dígitos.")
    @jakarta.validation.constraints.Max(value = 999999999, message = "El Código SIS debe tener exactamente 9 dígitos.")
    private Integer codigoSis;

    public String getNuevoRol() {
        return nuevoRol;
    }

    public void setNuevoRol(String nuevoRol) {
        this.nuevoRol = nuevoRol;
    }

    public Integer getCodigoSis() {
        return codigoSis;
    }

    public void setCodigoSis(Integer codigoSis) {
        this.codigoSis = codigoSis;
    }
}
