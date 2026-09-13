package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "estudiante")
public class Estudiante {

    // PK real de la tabla (usada también por Habilitacion.estudiante vía
    // @JoinColumn(name = "codsisestudiante")): es el código SIS del estudiante,
    // no un id autogenerado.
    @Id
    @Column(name = "codsisestudiante")
    private Integer codsisestudiante;

    @Column(name = "ci")
    private String ci;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "apellido")
    private String apellido;

    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "foto_url")
    private String fotoUrl;

    @Column(name = "codigo_qr")
    private String codigoQr;

    public Estudiante() {
    }

    public Estudiante(Integer codsisestudiante) {
        this.codsisestudiante = codsisestudiante;
    }

    public Estudiante(Integer codsisestudiante, String ci, String nombre, String apellido,
                       Integer idUsuario, String fotoUrl, String codigoQr) {
        this.codsisestudiante = codsisestudiante;
        this.ci = ci;
        this.nombre = nombre;
        this.apellido = apellido;
        this.idUsuario = idUsuario;
        this.fotoUrl = fotoUrl;
        this.codigoQr = codigoQr;
    }

    public Integer getCodsisestudiante() {
        return codsisestudiante;
    }

    public void setCodsisestudiante(Integer codsisestudiante) {
        this.codsisestudiante = codsisestudiante;
    }

    public String getCi() {
        return ci;
    }

    public void setCi(String ci) {
        this.ci = ci;
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

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
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
