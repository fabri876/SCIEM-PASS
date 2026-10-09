package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "credencial")
public class Credencial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idcredencial")
    private Integer idCredencial;

    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    // Campo renombrado: antes era codigoqr en la BD, ahora es token
    @Column(name = "token", unique = true, length = 20)
    private String token;

    @Column(name = "fechacreacioncredencial")
    private LocalDate fechaCreacionCredencial;

    @Column(name = "idexamen")
    private Integer idExamen;

    @Column(name = "validodesde")
    private LocalDateTime validoDesde;

    @Column(name = "validohasta")
    private LocalDateTime validoHasta;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado = "ACTIVO";

    public Credencial() {
    }

    public Credencial(Integer idUsuario, Integer idExamen, String token, LocalDateTime validoDesde, LocalDateTime validoHasta) {
        this.idUsuario = idUsuario;
        this.idExamen = idExamen;
        this.token = token;
        this.validoDesde = validoDesde;
        this.validoHasta = validoHasta;
        this.fechaCreacionCredencial = LocalDate.now();
        this.estado = "ACTIVO";
    }

    public Integer getIdCredencial() { return idCredencial; }
    public void setIdCredencial(Integer idCredencial) { this.idCredencial = idCredencial; }

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public LocalDate getFechaCreacionCredencial() { return fechaCreacionCredencial; }
    public void setFechaCreacionCredencial(LocalDate fechaCreacionCredencial) { this.fechaCreacionCredencial = fechaCreacionCredencial; }

    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }

    public LocalDateTime getValidoDesde() { return validoDesde; }
    public void setValidoDesde(LocalDateTime validoDesde) { this.validoDesde = validoDesde; }

    public LocalDateTime getValidoHasta() { return validoHasta; }
    public void setValidoHasta(LocalDateTime validoHasta) { this.validoHasta = validoHasta; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
