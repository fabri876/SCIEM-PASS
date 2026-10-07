package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "docentegrupo")
public class DocenteGrupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "iddocentegrupo")
    private Integer idDocenteGrupo;

    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "codsisdocente", nullable = false)
    private Integer codSisDocente;

    @Column(name = "idgrupo", nullable = false)
    private Integer idGrupo;

    public DocenteGrupo() {}

    public DocenteGrupo(Integer idUsuario, Integer codSisDocente, Integer idGrupo) {
        this.idUsuario = idUsuario;
        this.codSisDocente = codSisDocente;
        this.idGrupo = idGrupo;
    }

    public Integer getIdDocenteGrupo() { return idDocenteGrupo; }
    public void setIdDocenteGrupo(Integer idDocenteGrupo) { this.idDocenteGrupo = idDocenteGrupo; }

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }

    public Integer getCodSisDocente() { return codSisDocente; }
    public void setCodSisDocente(Integer codSisDocente) { this.codSisDocente = codSisDocente; }

    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }
}
