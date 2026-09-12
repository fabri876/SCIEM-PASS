package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ayudante")
public class Ayudante {

    @Id
    @Column(name = "idayudante")
    private Integer idayudante;

    public Ayudante() {
    }

    public Ayudante(Integer idayudante) {
        this.idayudante = idayudante;
    }

    public Integer getIdayudante() {
        return idayudante;
    }

    public void setIdayudante(Integer idayudante) {
        this.idayudante = idayudante;
    }
}
