// dominio/ExamenNormaGeneral.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "examennormageneral")
public class ExamenNormaGeneral {

    @EmbeddedId
    private ExamenNormaGeneralId id;

    public ExamenNormaGeneral() {}

    public ExamenNormaGeneral(ExamenNormaGeneralId id) {
        this.id = id;
    }

    public ExamenNormaGeneralId getId() { return id; }
    public void setId(ExamenNormaGeneralId id) { this.id = id; }
}