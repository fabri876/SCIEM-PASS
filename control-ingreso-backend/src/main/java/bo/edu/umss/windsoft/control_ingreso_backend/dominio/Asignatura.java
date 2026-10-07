// dominio/Asignatura.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "asignatura")
public class Asignatura {

    @Id
    @Column(name = "idasignatura")
    private Integer idAsignatura;

    @Column(name = "idinscripcion")
    private Integer idInscripcion;

    @Column(name = "nombreasignatura")
    private String nombreAsignatura;

    @Column(name = "siglaasignatura")
    private String siglaAsignatura;

    @Column(name = "codigooficial", length = 20)
    private String codigoOficial;

    public Asignatura() {}

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdInscripcion() { return idInscripcion; }
    public void setIdInscripcion(Integer idInscripcion) { this.idInscripcion = idInscripcion; }
    public String getNombreAsignatura() { return nombreAsignatura; }
    public void setNombreAsignatura(String nombreAsignatura) { this.nombreAsignatura = nombreAsignatura; }
    public String getSiglaAsignatura() { return siglaAsignatura; }
    public void setSiglaAsignatura(String siglaAsignatura) { this.siglaAsignatura = siglaAsignatura; }
    public String getCodigoOficial() { return codigoOficial; }
    public void setCodigoOficial(String codigoOficial) { this.codigoOficial = codigoOficial; }
}
