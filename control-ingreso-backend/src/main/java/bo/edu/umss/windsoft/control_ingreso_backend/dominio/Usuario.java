package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idusuario")
    private Integer idusuario;

    @Column(name = "ciusuario", nullable = false, unique = true, columnDefinition = "TEXT")
    private String ciusuario;

    @Column(name = "nombreusuario", nullable = false, columnDefinition = "TEXT")
    private String nombreusuario;

    @Column(name = "apellidousuario", nullable = false, columnDefinition = "TEXT")
    private String apellidousuario;

    @Column(name = "telefonousuario")
    private Integer telefonousuario;

    @Column(name = "correousuario", nullable = false, unique = true, columnDefinition = "TEXT")
    private String correousuario;

    @Column(name = "contraseniausuario", nullable = false, columnDefinition = "TEXT")
    private String contraseniausuario;

    @Column(name = "estadousuario", nullable = false)
    private Boolean estadousuario = true;

    @Column(name = "rol")
    private String rol = "ESTUDIANTE";

    @Column(name = "intentos_fallidos", nullable = false)
    private Integer intentosFallidos = 0;

    @Column(name = "fecha_bloqueo")
    private OffsetDateTime fechaBloqueo;

    public Usuario() {
    }

    public Usuario(String ciusuario, String nombreusuario, String apellidousuario, Integer telefonousuario,
                   String correousuario, String contraseniausuario, Boolean estadousuario, String rol) {
        this.ciusuario = ciusuario;
        this.nombreusuario = nombreusuario;
        this.apellidousuario = apellidousuario;
        this.telefonousuario = telefonousuario;
        this.correousuario = correousuario;
        this.contraseniausuario = contraseniausuario;
        this.estadousuario = estadousuario != null ? estadousuario : true;
        this.rol = rol != null ? rol : "ESTUDIANTE";
        this.intentosFallidos = 0;
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

    public String getContraseniausuario() {
        return contraseniausuario;
    }

    public void setContraseniausuario(String contraseniausuario) {
        this.contraseniausuario = contraseniausuario;
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

    public Integer getIntentosFallidos() {
        return intentosFallidos;
    }

    public void setIntentosFallidos(Integer intentosFallidos) {
        this.intentosFallidos = intentosFallidos;
    }

    public OffsetDateTime getFechaBloqueo() {
        return fechaBloqueo;
    }

    public void setFechaBloqueo(OffsetDateTime fechaBloqueo) {
        this.fechaBloqueo = fechaBloqueo;
    }
}
