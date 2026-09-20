package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;

import java.time.LocalDate;

public class HabilitacionResponseDto {

    private Integer idHabilitacion;
    private Integer codSisEstudiante;
    private String ciEstudiante;
    private String nombreEstudiante;
    private String apellidoEstudiante;
    private Boolean estadoHabilitacion;
    private String estado;
    private Integer motivoId;
    private Integer idMotivo;
    private String nombreMotivo;
    private String descripcionMotivo;
    private String observacion;
    private String observacionHabilitacion;
    private String correoEstudiante;
    private LocalDate fechaRegistro;

    public HabilitacionResponseDto() {
    }

    public static HabilitacionResponseDto fromEntity(Habilitacion h) {
        if (h == null) {
            return null;
        }

        HabilitacionResponseDto dto = new HabilitacionResponseDto();
        dto.setIdHabilitacion(h.getIdhabilitacion());
        dto.setEstadoHabilitacion(h.getEstadohabilitacion());
        dto.setEstado(Boolean.TRUE.equals(h.getEstadohabilitacion()) ? "HABILITADO" : "INHABILITADO");
        dto.setObservacion(h.getObservacionhabilitacion());
        dto.setObservacionHabilitacion(h.getObservacionhabilitacion());
        dto.setFechaRegistro(h.getFecharegistro());

        if (h.getEstudiante() != null) {
            dto.setCodSisEstudiante(h.getEstudiante().getCodsisestudiante());
        }

        return dto;
    }

    public static HabilitacionResponseDto fromEntity(Habilitacion h, bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario u) {
        HabilitacionResponseDto dto = fromEntity(h);
        if (dto != null && u != null) {
            dto.setCiEstudiante(u.getCiusuario());
            dto.setNombreEstudiante(u.getNombreusuario());
            dto.setApellidoEstudiante(u.getApellidousuario());
            dto.setCorreoEstudiante(u.getCorreousuario());
        }
        return dto;
    }


    public Integer getIdHabilitacion() {
        return idHabilitacion;
    }

    public void setIdHabilitacion(Integer idHabilitacion) {
        this.idHabilitacion = idHabilitacion;
    }

    public Integer getCodSisEstudiante() {
        return codSisEstudiante;
    }

    public void setCodSisEstudiante(Integer codSisEstudiante) {
        this.codSisEstudiante = codSisEstudiante;
    }

    public String getCiEstudiante() {
        return ciEstudiante;
    }

    public void setCiEstudiante(String ciEstudiante) {
        this.ciEstudiante = ciEstudiante;
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

    public Integer getMotivoId() {
        return motivoId;
    }

    public void setMotivoId(Integer motivoId) {
        this.motivoId = motivoId;
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

    public String getCorreoEstudiante() {
        return correoEstudiante;
    }

    public void setCorreoEstudiante(String correoEstudiante) {
        this.correoEstudiante = correoEstudiante;
    }

    public LocalDate getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDate fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
}

