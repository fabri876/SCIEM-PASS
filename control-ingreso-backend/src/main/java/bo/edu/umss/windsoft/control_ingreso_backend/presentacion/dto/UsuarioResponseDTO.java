package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

public class UsuarioResponseDTO {

    private Integer idUsuario;
    private String ciUsuario;
    private String nombreUsuario;
    private String apellidoUsuario;
    private String nombreCompleto;
    private String correoUsuario;
    private Integer telefonoUsuario;
    private List<String> roles;
    private Boolean estadoUsuario;
    private String mensaje;

    public UsuarioResponseDTO() {
    }

    public UsuarioResponseDTO(Integer idUsuario, String ciUsuario, String nombreUsuario, String apellidoUsuario, String correoUsuario, Integer telefonoUsuario, List<String> roles, Boolean estadoUsuario, String mensaje) {
        this.idUsuario = idUsuario;
        this.ciUsuario = ciUsuario;
        this.nombreUsuario = nombreUsuario;
        this.apellidoUsuario = apellidoUsuario;
        this.nombreCompleto = (nombreUsuario + " " + apellidoUsuario).trim();
        this.correoUsuario = correoUsuario;
        this.telefonoUsuario = telefonoUsuario;
        this.roles = roles;
        this.estadoUsuario = estadoUsuario;
        this.mensaje = mensaje;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getCiUsuario() {
        return ciUsuario;
    }

    public void setCiUsuario(String ciUsuario) {
        this.ciUsuario = ciUsuario;
    }

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public void setNombreUsuario(String nombreUsuario) {
        this.nombreUsuario = nombreUsuario;
    }

    public String getApellidoUsuario() {
        return apellidoUsuario;
    }

    public void setApellidoUsuario(String apellidoUsuario) {
        this.apellidoUsuario = apellidoUsuario;
    }

    public String getNombreCompleto() {
        return nombreCompleto;
    }

    public void setNombreCompleto(String nombreCompleto) {
        this.nombreCompleto = nombreCompleto;
    }

    public String getCorreoUsuario() {
        return correoUsuario;
    }

    public void setCorreoUsuario(String correoUsuario) {
        this.correoUsuario = correoUsuario;
    }

    public Integer getTelefonoUsuario() {
        return telefonoUsuario;
    }

    public void setTelefonoUsuario(Integer telefonoUsuario) {
        this.telefonoUsuario = telefonoUsuario;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public Boolean getEstadoUsuario() {
        return estadoUsuario;
    }

    public void setEstadoUsuario(Boolean estadoUsuario) {
        this.estadoUsuario = estadoUsuario;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }
}
