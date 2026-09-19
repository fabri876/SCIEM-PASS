package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ayudante")
public class Ayudante {

    @Id
    @Column(name = "idayudante")
    private Integer idayudante;

    // NOT NULL en la base nueva (rediseño de sep-2026). Se sigue usando
    // idayudante == idusuario (mismo patrón de siempre) para no romper
    // RegistroUsuarioService.
    @Column(name = "idusuario", nullable = false)
    private Integer idusuario;

    public Ayudante() {
    }

    public Ayudante(Integer idusuario) {
        this.idayudante = idusuario;
        this.idusuario = idusuario;
    }

    public Integer getIdayudante() {
        return idayudante;
    }

    public void setIdayudante(Integer idayudante) {
        this.idayudante = idayudante;
    }

    public Integer getIdusuario() {
        return idusuario;
    }

    public void setIdusuario(Integer idusuario) {
        this.idusuario = idusuario;
    }
}
