package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class RegistroEstudianteResponseDto {

    private String mensaje;
    private Integer idUsuario;
    private Integer idEstudiante;
    private String nombre;
    private String apellido;
    private String ci;
    private String correo;
    private Integer codigoSis;
    private String rol;
    private String fotoUrl;
    private String codigoQr;

    public RegistroEstudianteResponseDto() {
    }

    public RegistroEstudianteResponseDto(String mensaje, Integer idUsuario, Integer idEstudiante, String nombre,
                                          String apellido, String ci, String correo, Integer codigoSis, String rol,
                                          String fotoUrl, String codigoQr) {
        this.mensaje = mensaje;
        this.idUsuario = idUsuario;
        this.idEstudiante = idEstudiante;
        this.nombre = nombre;
        this.apellido = apellido;
        this.ci = ci;
        this.correo = correo;
        this.codigoSis = codigoSis;
        this.rol = rol;
        this.fotoUrl = fotoUrl;
        this.codigoQr = codigoQr;
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

    public Integer getIdEstudiante() {
        return idEstudiante;
    }

    public void setIdEstudiante(Integer idEstudiante) {
        this.idEstudiante = idEstudiante;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getCi() {
        return ci;
    }

    public void setCi(String ci) {
        this.ci = ci;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public Integer getCodigoSis() {
        return codigoSis;
    }

    public void setCodigoSis(Integer codigoSis) {
        this.codigoSis = codigoSis;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    public String getCodigoQr() {
        return codigoQr;
    }

    public void setCodigoQr(String codigoQr) {
        this.codigoQr = codigoQr;
    }
}
