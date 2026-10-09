package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "grupo")
public class Grupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idgrupo")
    private Integer idGrupo;

    @Column(name = "idasignatura", nullable = false)
    private Integer idAsignatura;

    @Column(name = "nombregrupo", nullable = false)
    private String nombreGrupo;

    @Column(name = "estadogrupo", nullable = false)
    private Boolean estadoGrupo = true;

    public Grupo() {}

    public Grupo(Integer idAsignatura, String nombreGrupo, String horarios) {
        this.idAsignatura = idAsignatura;
        this.nombreGrupo = nombreGrupo;
        this.estadoGrupo = true;
    }

    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }

    public String getNombreGrupo() { return nombreGrupo; }
    public void setNombreGrupo(String nombreGrupo) { this.nombreGrupo = nombreGrupo; }

    public Boolean getEstadoGrupo() { return estadoGrupo; }
    public void setEstadoGrupo(Boolean estadoGrupo) { this.estadoGrupo = estadoGrupo; }
}
