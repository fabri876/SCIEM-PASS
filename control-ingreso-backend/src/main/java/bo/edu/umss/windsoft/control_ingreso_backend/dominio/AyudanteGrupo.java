package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "ayudantegrupo")
public class AyudanteGrupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idayudantegrupo")
    private Integer idAyudanteGrupo;

    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "idgrupo", nullable = false)
    private Integer idGrupo;

    public AyudanteGrupo() {}

    public AyudanteGrupo(Integer idUsuario, Integer idGrupo) {
        this.idUsuario = idUsuario;
        this.idGrupo = idGrupo;
    }

    public Integer getIdAyudanteGrupo() { return idAyudanteGrupo; }
    public void setIdAyudanteGrupo(Integer idAyudanteGrupo) { this.idAyudanteGrupo = idAyudanteGrupo; }

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }

    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }
}
