// dominio/NormaEspecifica.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "normaespecifica")
public class NormaEspecifica {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "normaespecifica_seq")
    @SequenceGenerator(name = "normaespecifica_seq", sequenceName = "normaespecifica_idnormaespecifica_seq", allocationSize = 1)
    @Column(name = "idnormaespecifica")
    private Integer idNormaEspecifica;

    @Column(name = "idasignatura", nullable = false)
    private Integer idAsignatura;

    @Column(name = "idexamen", nullable = false)
    private Integer idExamen;

    @Column(name = "descripcionnorma", nullable = false)
    private String descripcionNorma;

    @Column(name = "fechacreacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "promovida", nullable = false)
        private Boolean promovida = false;

    public NormaEspecifica() {}

    public Integer getIdNormaEspecifica() { return idNormaEspecifica; }
    public void setIdNormaEspecifica(Integer idNormaEspecifica) { this.idNormaEspecifica = idNormaEspecifica; }
    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }
    public String getDescripcionNorma() { return descripcionNorma; }
    public void setDescripcionNorma(String descripcionNorma) { this.descripcionNorma = descripcionNorma; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public Boolean getPromovida() { return promovida; }
    public void setPromovida(Boolean promovida) { this.promovida = promovida; }
}