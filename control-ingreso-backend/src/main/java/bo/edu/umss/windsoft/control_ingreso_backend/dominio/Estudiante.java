package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "estudiante")
public class Estudiante {

    @Id
    @Column(name = "codsisestudiante")
    private Integer codsisestudiante;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "codsisestudiante")
    private Usuario usuario;

    @Column(name = "foto_url", columnDefinition = "TEXT")
    private String fotoUrl;

    @Column(name = "codigo_qr", columnDefinition = "TEXT")
    private String codigoQr;

    public Estudiante() {
    }

    public Estudiante(Usuario usuario, String fotoUrl, String codigoQr) {
        this.usuario = usuario;
        this.fotoUrl = fotoUrl;
        this.codigoQr = codigoQr;
    }

    public Estudiante(Integer codsisestudiante, Usuario usuario, String fotoUrl, String codigoQr) {
        this.codsisestudiante = codsisestudiante;
        this.usuario = usuario;
        this.fotoUrl = fotoUrl;
        this.codigoQr = codigoQr;
    }

    public Integer getCodsisestudiante() {
        return codsisestudiante;
    }

    public void setCodsisestudiante(Integer codsisestudiante) {
        this.codsisestudiante = codsisestudiante;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
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
