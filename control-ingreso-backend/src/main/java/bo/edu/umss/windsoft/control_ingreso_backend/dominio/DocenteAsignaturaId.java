// dominio/DocenteAsignaturaId.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class DocenteAsignaturaId implements Serializable {

    @Column(name = "idusuario")
    private Integer idusuario;

    @Column(name = "codsisdocente")
    private Integer codsisdocente;

    @Column(name = "idasignatura")
    private Integer idasignatura;

    public DocenteAsignaturaId() {}

    public DocenteAsignaturaId(Integer idusuario, Integer codsisdocente, Integer idasignatura) {
        this.idusuario = idusuario;
        this.codsisdocente = codsisdocente;
        this.idasignatura = idasignatura;
    }

    public Integer getIdusuario() { return idusuario; }
    public void setIdusuario(Integer idusuario) { this.idusuario = idusuario; }
    public Integer getCodsisdocente() { return codsisdocente; }
    public void setCodsisdocente(Integer codsisdocente) { this.codsisdocente = codsisdocente; }
    public Integer getIdasignatura() { return idasignatura; }
    public void setIdasignatura(Integer idasignatura) { this.idasignatura = idasignatura; }

    // OJO: equals/hashCode son OBLIGATORIOS en una @EmbeddedId.
    // Sin esto, Hibernate no puede comparar ni cachear correctamente la entidad.
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DocenteAsignaturaId)) return false;
        DocenteAsignaturaId that = (DocenteAsignaturaId) o;
        return Objects.equals(idusuario, that.idusuario)
                && Objects.equals(codsisdocente, that.codsisdocente)
                && Objects.equals(idasignatura, that.idasignatura);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idusuario, codsisdocente, idasignatura);
    }
}