package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class CambioEstadoRespuestaDto {

    private String mensaje;
    private Integer idUsuario;
    private String estado;

    public CambioEstadoRespuestaDto(String mensaje, Integer idUsuario, String estado) {
        this.mensaje = mensaje;
        this.idUsuario = idUsuario;
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

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}
