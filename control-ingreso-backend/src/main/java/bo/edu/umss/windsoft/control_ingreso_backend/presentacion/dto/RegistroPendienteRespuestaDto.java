package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class RegistroPendienteRespuestaDto {

    private String mensaje;
    private Integer idUsuario;
    private String correo;
    private String rol;
    private String estado;

    public RegistroPendienteRespuestaDto(String mensaje, Integer idUsuario, String correo, String rol, String estado) {
        this.mensaje = mensaje;
        this.idUsuario = idUsuario;
        this.correo = correo;
        this.rol = rol;
        this.estado = estado;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}
