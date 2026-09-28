// dominio/NormaGeneral.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "normageneral")
public class NormaGeneral {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "normageneral_seq")
    @SequenceGenerator(name = "normageneral_seq", sequenceName = "normageneral_idnormageneral_seq", allocationSize = 1)
    @Column(name = "idnormageneral")
    private Integer idNormaGeneral;

    @Column(name = "descripcionnorma", nullable = false)
    private String descripcionNorma;

    @Column(name = "estadonorma", nullable = false)
    private Boolean estadoNorma = true;

    public NormaGeneral() {}

    public Integer getIdNormaGeneral() { return idNormaGeneral; }
    public void setIdNormaGeneral(Integer idNormaGeneral) { this.idNormaGeneral = idNormaGeneral; }
    public String getDescripcionNorma() { return descripcionNorma; }
    public void setDescripcionNorma(String descripcionNorma) { this.descripcionNorma = descripcionNorma; }
    public Boolean getEstadoNorma() { return estadoNorma; }
    public void setEstadoNorma(Boolean estadoNorma) { this.estadoNorma = estadoNorma; }
}