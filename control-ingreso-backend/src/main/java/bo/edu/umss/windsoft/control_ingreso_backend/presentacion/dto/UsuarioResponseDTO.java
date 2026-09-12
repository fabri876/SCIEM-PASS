package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class UsuarioResponseDTO {

    private Integer idusuario;
    private String ciusuario;
    private String nombreusuario;
    private String apellidousuario;
    private Integer telefonousuario;
    private String correousuario;
    private Boolean estadousuario;
    private String rol;
    private Integer codigoSis;

    public UsuarioResponseDTO() {
    }

    public UsuarioResponseDTO(Integer idusuario, String ciusuario, String nombreusuario, String apellidousuario,
                              Integer telefonousuario, String correousuario, Boolean estadousuario, String rol, Integer codigoSis) {
        this.idusuario = idusuario;
        this.ciusuario = ciusuario;
        this.nombreusuario = nombreusuario;
        this.apellidousuario = apellidousuario;
        this.telefonousuario = telefonousuario;
        this.correousuario = correousuario;
        this.estadousuario = estadousuario;
        this.rol = rol;
        this.codigoSis = codigoSis;
    }

    public Integer getIdusuario() {
        return idusuario;
    }

    public void setIdusuario(Integer idusuario) {
        this.idusuario = idusuario;
    }

    public String getCiusuario() {
        return ciusuario;
    }

    public void setCiusuario(String ciusuario) {
        this.ciusuario = ciusuario;
    }

    public String getNombreusuario() {
        return nombreusuario;
    }

    public void setNombreusuario(String nombreusuario) {
        this.nombreusuario = nombreusuario;
    }

    public String getApellidousuario() {
        return apellidousuario;
    }

    public void setApellidousuario(String apellidousuario) {
        this.apellidousuario = apellidousuario;
    }

    public Integer getTelefonousuario() {
        return telefonousuario;
    }

    public void setTelefonousuario(Integer telefonousuario) {
        this.telefonousuario = telefonousuario;
    }

    public String getCorreousuario() {
        return correousuario;
    }

    public void setCorreousuario(String correousuario) {
        this.correousuario = correousuario;
    }

    public Boolean getEstadousuario() {
        return estadousuario;
    }

    public void setEstadousuario(Boolean estadousuario) {
        this.estadousuario = estadousuario;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public Integer getCodigoSis() {
        return codigoSis;
    }

    public void setCodigoSis(Integer codigoSis) {
        this.codigoSis = codigoSis;
    }
}
