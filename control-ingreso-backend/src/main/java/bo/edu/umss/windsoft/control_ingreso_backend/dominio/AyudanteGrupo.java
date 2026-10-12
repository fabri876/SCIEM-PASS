package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "ayudantegrupo", uniqueConstraints = @UniqueConstraint(name = "uk_ayudante_grupo", columnNames = {"idusuario", "idgrupo"}))
public class AyudanteGrupo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idayudantegrupo")
    private Integer id;
    @Column(name = "idgrupo", nullable = false)
    private Integer idGrupo;
    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    public AyudanteGrupo() {}
    public AyudanteGrupo(Integer idUsuario, Integer idGrupo) {
        this.idUsuario = idUsuario;
        this.idGrupo = idGrupo;
    }
    public Integer getId() { return id; }
    public Integer getIdGrupo() { return idGrupo; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
}
