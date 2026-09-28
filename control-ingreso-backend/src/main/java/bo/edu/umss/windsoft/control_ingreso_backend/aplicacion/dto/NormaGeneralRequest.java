package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto;

import jakarta.validation.constraints.NotBlank;

public class NormaGeneralRequest {

    @NotBlank
    private String descripcionNorma;

    public String getDescripcionNorma() { return descripcionNorma; }
    public void setDescripcionNorma(String descripcionNorma) { this.descripcionNorma = descripcionNorma; }
}