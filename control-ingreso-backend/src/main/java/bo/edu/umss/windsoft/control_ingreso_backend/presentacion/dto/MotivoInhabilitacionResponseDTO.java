package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class MotivoInhabilitacionResponseDTO {

    private Integer idmotivo;
    private String nombremotivo;
    private String descripcionmotivo;

    public MotivoInhabilitacionResponseDTO() {
    }

    public MotivoInhabilitacionResponseDTO(Integer idmotivo, String nombremotivo, String descripcionmotivo) {
        this.idmotivo = idmotivo;
        this.nombremotivo = nombremotivo;
        this.descripcionmotivo = descripcionmotivo;
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
}
