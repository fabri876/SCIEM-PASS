package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "admin")
public class Admin {

    @Id
    @Column(name = "idadmin")
    private Integer idadmin;

    // NOT NULL en la base nueva (rediseño de sep-2026): la fila de "admin" ya
    // no comparte automáticamente el id del usuario como en el esquema viejo,
    // ahora hay que guardarlo explícito. Se sigue usando idadmin == idusuario
    // (mismo patrón de siempre) para no romper RegistroUsuarioService.
    @Column(name = "idusuario", nullable = false)
    private Integer idusuario;

    public Admin() {
    }

    public Admin(Integer idusuario) {
        this.idadmin = idusuario;
        this.idusuario = idusuario;
    }

    public Integer getIdadmin() {
        return idadmin;
    }

    public void setIdadmin(Integer idadmin) {
        this.idadmin = idadmin;
    }

    public Integer getIdusuario() {
        return idusuario;
    }

    public void setIdusuario(Integer idusuario) {
        this.idusuario = idusuario;
    }
}
