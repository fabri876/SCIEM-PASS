package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "docente")
public class Docente {

    @Id
    @Column(name = "codsisdocente")
    private Integer codsisdocente;

    // NOT NULL en la base nueva (rediseño de sep-2026). Se sigue usando
    // codsisdocente == idusuario (mismo patrón de siempre) para no romper
    // RegistroUsuarioService.
    @Column(name = "idusuario", nullable = false)
    private Integer idusuario;

    public Docente() {
    }

    public Docente(Integer idusuario) {
        this.codsisdocente = idusuario;
        this.idusuario = idusuario;
    }

    public Integer getCodsisdocente() {
        return codsisdocente;
    }

    public void setCodsisdocente(Integer codsisdocente) {
        this.codsisdocente = codsisdocente;
    }

    public Integer getIdusuario() {
        return idusuario;
    }

    public void setIdusuario(Integer idusuario) {
        this.idusuario = idusuario;
    }
}
