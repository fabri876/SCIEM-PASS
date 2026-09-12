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
@Table(name = "admin")
public class Admin {

    @Id
    @Column(name = "idadmin")
    private Integer idadmin;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "idadmin")
    private Usuario usuario;

    public Admin() {
    }

    public Admin(Usuario usuario) {
        this.usuario = usuario;
    }

    public Admin(Integer idadmin, Usuario usuario) {
        this.idadmin = idadmin;
        this.usuario = usuario;
    }

    public Integer getIdadmin() {
        return idadmin;
    }

    public void setIdadmin(Integer idadmin) {
        this.idadmin = idadmin;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }
}
