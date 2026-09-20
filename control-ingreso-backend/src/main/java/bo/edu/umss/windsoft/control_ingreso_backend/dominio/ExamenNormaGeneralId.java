// dominio/ExamenNormaGeneralId.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ExamenNormaGeneralId implements Serializable {

    @Column(name = "idasignatura")
    private Integer idAsignatura;

    @Column(name = "idexamen")
    private Integer idExamen;

    @Column(name = "idnormageneral")
    private Integer idNormaGeneral;

    public ExamenNormaGeneralId() {}

    public ExamenNormaGeneralId(Integer idAsignatura, Integer idExamen, Integer idNormaGeneral) {
        this.idAsignatura = idAsignatura;
        this.idExamen = idExamen;
        this.idNormaGeneral = idNormaGeneral;
    }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }
    public Integer getIdNormaGeneral() { return idNormaGeneral; }
    public void setIdNormaGeneral(Integer idNormaGeneral) { this.idNormaGeneral = idNormaGeneral; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExamenNormaGeneralId)) return false;
        ExamenNormaGeneralId that = (ExamenNormaGeneralId) o;
        return Objects.equals(idAsignatura, that.idAsignatura)
                && Objects.equals(idExamen, that.idExamen)
                && Objects.equals(idNormaGeneral, that.idNormaGeneral);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idAsignatura, idExamen, idNormaGeneral);
    }
}