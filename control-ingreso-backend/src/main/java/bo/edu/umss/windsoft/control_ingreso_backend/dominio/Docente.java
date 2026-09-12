package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "docente")
public class Docente {

    @Id
    @Column(name = "codsisdocente")
    private Integer codsisdocente;

    public Docente() {
    }

    public Docente(Integer codsisdocente) {
        this.codsisdocente = codsisdocente;
    }

    public Integer getCodsisdocente() {
        return codsisdocente;
    }

    public void setCodsisdocente(Integer codsisdocente) {
        this.codsisdocente = codsisdocente;
    }
}
