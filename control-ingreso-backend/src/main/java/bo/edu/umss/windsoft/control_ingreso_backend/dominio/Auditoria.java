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
@Table(name = "historialauditoria")
public class Auditoria {

    @Id
    @Column(name = "idauditoria")
    private Integer idAuditoria;

    @Column(name = "idusuario")
    private Integer idUsuario;

    @Column(name = "accion")
    private String accion;

    @Column(name = "fechaaccion")
    private LocalDate fechaAccion;

    public Auditoria() {
        this.fechaAccion = LocalDate.now();
    }

    public Auditoria(Integer idUsuario, String accion) {
        this.idUsuario = idUsuario;
        this.accion = accion;
        this.fechaAccion = LocalDate.now();
    }

    public Integer getIdAuditoria() {
        return idAuditoria;
    }

    public void setIdAuditoria(Integer idAuditoria) {
        this.idAuditoria = idAuditoria;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getAccion() {
        return accion;
    }

    public void setAccion(String accion) {
        this.accion = accion;
    }

    public LocalDate getFechaAccion() {
        return fechaAccion;
    }

    public void setFechaAccion(LocalDate fechaAccion) {
        this.fechaAccion = fechaAccion;
    }

    public String getTipoOperacion() {
        return accion != null ? accion : "";
    }

    public String getUsuarioEjecutor() {
        return idUsuario != null ? String.valueOf(idUsuario) : "SISTEMA";
    }

    public String getUsuarioAfectado() {
        return idUsuario != null ? String.valueOf(idUsuario) : "";
    }

    public String getDetalles() {
        return accion;
    }

    public String getIpOrigen() {
        return "N/A";
    }

    public LocalDateTime getFechaHora() {
        return fechaAccion != null ? fechaAccion.atStartOfDay() : LocalDateTime.now();
    }
}
