package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "estudiante")
public class Estudiante {

    @Id
    @Column(name = "idusuario", nullable = false)
    private Integer idusuario;

    @Column(name = "codsisestudiante", nullable = false)
    private Integer codsisestudiante;

    @Column(name = "idcambio")
    private Integer idcambio;

    public Estudiante() {
    }

    public Estudiante(Integer idusuario, Integer codsisestudiante) {
        this.idusuario = idusuario;
        this.codsisestudiante = codsisestudiante;
    }

    public Integer getIdusuario() {
        return idusuario;
    }

    public void setIdusuario(Integer idusuario) {
        this.idusuario = idusuario;
    }

    public Integer getCodsisestudiante() {
        return codsisestudiante;
    }

    public void setCodsisestudiante(Integer codsisestudiante) {
        this.codsisestudiante = codsisestudiante;
    }

    public Integer getIdcambio() {
        return idcambio;
    }

    public void setIdcambio(Integer idcambio) {
        this.idcambio = idcambio;
    }

    public Integer getIdUsuario() {
        return idusuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idusuario = idUsuario;
    }
}
