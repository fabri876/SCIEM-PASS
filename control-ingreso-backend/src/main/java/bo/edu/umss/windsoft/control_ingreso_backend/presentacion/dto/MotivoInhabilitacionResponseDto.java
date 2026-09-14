package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;

public class MotivoInhabilitacionResponseDto {

    private Integer idMotivo;
    private String nombreMotivo;
    private String descripcionMotivo;

    public MotivoInhabilitacionResponseDto() {
    }

    public MotivoInhabilitacionResponseDto(Integer idMotivo, String nombreMotivo, String descripcionMotivo) {
        this.idMotivo = idMotivo;
        this.nombreMotivo = nombreMotivo;
        this.descripcionMotivo = descripcionMotivo;
    }

    public static MotivoInhabilitacionResponseDto fromEntity(MotivoInhabilitacion entidad) {
        if (entidad == null) {
            return null;
        }
        return new MotivoInhabilitacionResponseDto(
                entidad.getIdmotivo(),
                entidad.getNombremotivo(),
                entidad.getDescripcionmotivo()
        );
    }

    public Integer getIdMotivo() {
        return idMotivo;
    }

    public void setIdMotivo(Integer idMotivo) {
        this.idMotivo = idMotivo;
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
