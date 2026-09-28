package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "docente")
public class Docente {

    @Id
    @Column(name = "idusuario", nullable = false)
    private Integer idusuario;

    @Column(name = "codsisdocente", nullable = false)
    private Integer codsisdocente;

    public Docente() {
    }

    public Docente(Integer idusuario, Integer codsisdocente) {
        this.idusuario = idusuario;
        this.codsisdocente = codsisdocente;
    }

    public Integer getIdusuario() {
        return idusuario;
    }

    public void setIdusuario(Integer idusuario) {
        this.idusuario = idusuario;
    }

    public Integer getCodsisdocente() {
        return codsisdocente;
    }

    public void setCodsisdocente(Integer codsisdocente) {
        this.codsisdocente = codsisdocente;
    }
}
