package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuario")
public class Usuario {

    // La base nueva (rediseño de sep-2026) no tiene columnas IDENTITY/SERIAL
    // ni sequences para ninguna PK (se verificó contra information_schema).
    // Se usa una sequence propia creada a mano (ver instrucciones SQL) en vez
    // de GenerationType.IDENTITY, que fallaba con "null value in column
    // idusuario violates not-null constraint" al no haber autoincremento en
    // la columna real.
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "usuario_seq")
    @SequenceGenerator(name = "usuario_seq", sequenceName = "usuario_idusuario_seq", allocationSize = 1)
    @Column(name = "idusuario")
    private Integer idusuario;

    // La base nueva (rediseño completo, sep-2026) dejó estas columnas como
    // NULLABLE y sin constraint UNIQUE a nivel de esquema; la obligatoriedad y
    // la unicidad se siguen exigiendo igual, pero a nivel de aplicación
    // (@NotBlank en los DTOs + existsByCiusuario/existsByCorreousuario antes
    // de guardar), no como restricción de columna.
    @Column(name = "ciusuario")
    private String ciusuario;

    @Column(name = "nombreusuario")
    private String nombreusuario;

    @Column(name = "apellidousuario")
    private String apellidousuario;

    @Column(name = "telefonousuario")
    private Integer telefonousuario;

    @Column(name = "correousuario")
    private String correousuario;

    @Column(name = "contraseniausuario")
    private String contraseniausuario;

    @Column(name = "estadousuario")
    private Boolean estadousuario = true;

    // Control de intentos fallidos de login (HU16, criterio #10). El "tipo" de
    // usuario (rol) ya NO se guarda en esta tabla: lo determina en qué tabla
    // hija (admin/docente/ayudante/estudiante) tiene fila este usuario — ver
    // TipoUsuarioResolver.
    //
    // OJO: estas 2 columnas no existen todavía en la base nueva (rediseño de
    // sep-2026) — hay que correr:
    //   ALTER TABLE usuario ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER NOT NULL DEFAULT 0;
    //   ALTER TABLE usuario ADD COLUMN IF NOT EXISTS fecha_bloqueo TIMESTAMP WITH TIME ZONE;
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
        if (this.intentosFallidos < 5) {
            return false;
        }
        if (this.fechaBloqueo == null) {
            // 5+ intentos fallidos sin marca de tiempo (dato cargado a mano,
            // no a través de registrarIntentoFallido()): se mantiene bloqueado
            // hasta que el administrador reactive la cuenta, en vez de dejar
            // pasar el intento de login por no tener con qué medir los 15 minutos.
            return true;
        }
        // Bloqueo temporal por 15 minutos tras 5 intentos fallidos
        if (this.fechaBloqueo.plusMinutes(15).isAfter(LocalDateTime.now())) {
            return true;
        }
        // El tiempo de bloqueo ya expiró, reiniciamos automáticamente
        reiniciarIntentosFallidos();
        return false;
    }
}
