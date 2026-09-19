// dominio/DocenteAsignatura.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "docenteasignatura")
public class DocenteAsignatura {

    @EmbeddedId
    private DocenteAsignaturaId id;

    public DocenteAsignatura() {}

    public DocenteAsignatura(DocenteAsignaturaId id) {
        this.id = id;
    }

    public DocenteAsignaturaId getId() { return id; }
    public void setId(DocenteAsignaturaId id) { this.id = id; }
}