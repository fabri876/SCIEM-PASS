package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ayudante")
public class Ayudante {

    @Id
    @Column(name = "idayudante")
    private Integer idayudante;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "idayudante")
    private Usuario usuario;

    public Ayudante() {
    }

    public Ayudante(Usuario usuario) {
        this.usuario = usuario;
    }

    public Ayudante(Integer idayudante, Usuario usuario) {
        this.idayudante = idayudante;
        this.usuario = usuario;
    }

    public Integer getIdayudante() {
        return idayudante;
    }

    public void setIdayudante(Integer idayudante) {
        this.idayudante = idayudante;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }
}
