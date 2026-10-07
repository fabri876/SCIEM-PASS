package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class AyudanteExamenId implements Serializable {

    @Column(name = "idayudante")
    private Integer idayudante;

    @Column(name = "idasignatura")
    private Integer idasignatura;

    @Column(name = "idexamen")
    private Integer idexamen;

    @Column(name = "idambiente")
    private Integer idambiente;

    public AyudanteExamenId() {
    }

    public AyudanteExamenId(Integer idayudante, Integer idasignatura, Integer idexamen, Integer idambiente) {
        this.idayudante = idayudante;
        this.idasignatura = idasignatura;
        this.idexamen = idexamen;
        this.idambiente = idambiente;
    }

    public Integer getIdayudante() {
        return idayudante;
    }

    public void setIdayudante(Integer idayudante) {
        this.idayudante = idayudante;
    }

    public Integer getIdasignatura() {
        return idasignatura;
    }

    public void setIdasignatura(Integer idasignatura) {
        this.idasignatura = idasignatura;
    }

    public Integer getIdexamen() {
        return idexamen;
    }

    public void setIdexamen(Integer idexamen) {
        this.idexamen = idexamen;
    }

    public Integer getIdambiente() {
        return idambiente;
    }

    public void setIdambiente(Integer idambiente) {
        this.idambiente = idambiente;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AyudanteExamenId that)) return false;
        return Objects.equals(idayudante, that.idayudante) &&
                Objects.equals(idasignatura, that.idasignatura) &&
                Objects.equals(idexamen, that.idexamen) &&
                Objects.equals(idambiente, that.idambiente);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idayudante, idasignatura, idexamen, idambiente);
    }
}
