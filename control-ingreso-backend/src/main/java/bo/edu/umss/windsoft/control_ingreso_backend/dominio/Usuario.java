package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idusuario")
    private Integer idusuario;

    @Column(name = "ciusuario", nullable = false, unique = true)
    private String ciusuario;

    @Column(name = "nombreusuario", nullable = false)
    private String nombreusuario;

    @Column(name = "apellidousuario", nullable = false)
    private String apellidousuario;

    @Column(name = "telefonousuario")
    private Integer telefonousuario;

    @Column(name = "correousuario", nullable = false, unique = true)
    private String correousuario;

    @Column(name = "contraseniausuario", nullable = false)
    private String contraseniausuario;

    @Column(name = "estadousuario", nullable = false)
    private Boolean estadousuario = true;

    // Control de intentos fallidos de login (HU16, criterio #10). El "tipo" de
    // usuario (rol) ya NO se guarda en esta tabla: lo determina en qué tabla
    // hija (admin/docente/ayudante/estudiante) tiene fila este usuario — ver
    // TipoUsuarioResolver.
    @Column(name = "intentos_fallidos", nullable = false)
    private int intentosFallidos = 0;

    @Column(name = "fecha_bloqueo")
    private LocalDateTime fechaBloqueo;

    public Usuario() {
    }

    public Usuario(String ciusuario, String nombreusuario, String apellidousuario, Integer telefonousuario, String correousuario, String contraseniausuario, Boolean estadousuario) {
        this.ciusuario = ciusuario;
        this.nombreusuario = nombreusuario;
        this.apellidousuario = apellidousuario;
        this.telefonousuario = telefonousuario;
        this.correousuario = correousuario;
        this.contraseniausuario = contraseniausuario;
        this.estadousuario = estadousuario != null ? estadousuario : true;
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

    public int getIntentosFallidos() {
        return intentosFallidos;
    }

    public void setIntentosFallidos(int intentosFallidos) {
        this.intentosFallidos = intentosFallidos;
    }

    public LocalDateTime getFechaBloqueo() {
        return fechaBloqueo;
    }

    public void setFechaBloqueo(LocalDateTime fechaBloqueo) {
        this.fechaBloqueo = fechaBloqueo;
    }

    // Métodos de negocio usados por el módulo de administración de usuarios (HU16).
    public void registrarIntentoFallido() {
        this.intentosFallidos++;
        if (this.intentosFallidos >= 5) {
            this.fechaBloqueo = LocalDateTime.now();
        }
    }

    public void reiniciarIntentosFallidos() {
        this.intentosFallidos = 0;
        this.fechaBloqueo = null;
    }

    public boolean isBloqueado() {
        if (this.intentosFallidos >= 5 && this.fechaBloqueo != null) {
            // Bloqueo temporal por 15 minutos tras 5 intentos fallidos
            if (this.fechaBloqueo.plusMinutes(15).isAfter(LocalDateTime.now())) {
                return true;
            } else {
                // El tiempo de bloqueo ya expiró, reiniciamos automáticamente
                reiniciarIntentosFallidos();
                return false;
            }
        }
        return false;
    }
}
