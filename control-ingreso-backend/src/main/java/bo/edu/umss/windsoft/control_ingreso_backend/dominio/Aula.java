// dominio/Aula.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "aula")
public class Aula {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "aula_seq")
    @SequenceGenerator(name = "aula_seq", sequenceName = "aula_idaula_seq", allocationSize = 1)
    @Column(name = "idaula")
    private Integer idAula;

    @Column(name = "nombreaula", nullable = false)
    private String nombreAula;

    @Column(name = "ubicacionaula")
    private String ubicacionAula;

    @Column(name = "capacidadaula")
    private Integer capacidadAula;

    @Column(name = "estadoaula", nullable = false)
    private Boolean estadoAula = true;

    public Aula() {}

    public Integer getIdAula() { return idAula; }
    public void setIdAula(Integer idAula) { this.idAula = idAula; }
    public String getNombreAula() { return nombreAula; }
    public void setNombreAula(String nombreAula) { this.nombreAula = nombreAula; }
    public String getUbicacionAula() { return ubicacionAula; }
    public void setUbicacionAula(String ubicacionAula) { this.ubicacionAula = ubicacionAula; }
    public Integer getCapacidadAula() { return capacidadAula; }
    public void setCapacidadAula(Integer capacidadAula) { this.capacidadAula = capacidadAula; }
    public Boolean getEstadoAula() { return estadoAula; }
    public void setEstadoAula(Boolean estadoAula) { this.estadoAula = estadoAula; }
}