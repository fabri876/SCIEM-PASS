// dominio/TipoExamen.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "tipoexamen")
public class TipoExamen {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "tipoexamen_seq")
    @SequenceGenerator(name = "tipoexamen_seq", sequenceName = "tipoexamen_idtipoexamen_seq", allocationSize = 1)
    @Column(name = "idtipoexamen")
    private Integer idTipoExamen;

    @Column(name = "nombretipoexamen", nullable = false)
    private String nombreTipoExamen;

    @Column(name = "requieredescripcion", nullable = false)
    private Boolean requiereDescripcion = false;

    @Column(name = "estadotipoexamen", nullable = false)
    private Boolean estadoTipoExamen = true;

    public TipoExamen() {}

    public Integer getIdTipoExamen() { return idTipoExamen; }
    public void setIdTipoExamen(Integer idTipoExamen) { this.idTipoExamen = idTipoExamen; }
    public String getNombreTipoExamen() { return nombreTipoExamen; }
    public void setNombreTipoExamen(String nombreTipoExamen) { this.nombreTipoExamen = nombreTipoExamen; }
    public Boolean getRequiereDescripcion() { return requiereDescripcion; }
    public void setRequiereDescripcion(Boolean requiereDescripcion) { this.requiereDescripcion = requiereDescripcion; }
    public Boolean getEstadoTipoExamen() { return estadoTipoExamen; }
    public void setEstadoTipoExamen(Boolean estadoTipoExamen) { this.estadoTipoExamen = estadoTipoExamen; }
}