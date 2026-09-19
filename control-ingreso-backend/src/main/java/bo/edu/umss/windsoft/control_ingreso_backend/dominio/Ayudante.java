package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ayudante")
public class Ayudante {

    @Id
    @Column(name = "idusuario", nullable = false)
    private Integer idusuario;

    @Column(name = "idayudante", insertable = false, updatable = false)
    private Integer idayudante;

    public Ayudante() {
    }

    public Ayudante(Integer idusuario) {
        this.idusuario = idusuario;
    }

    public Integer getIdusuario() {
        return idusuario;
    }

    public void setIdusuario(Integer idusuario) {
        this.idusuario = idusuario;
    }

    public Integer getIdayudante() {
        return idayudante;
    }

    public void setIdayudante(Integer idayudante) {
        this.idayudante = idayudante;
    }
}
