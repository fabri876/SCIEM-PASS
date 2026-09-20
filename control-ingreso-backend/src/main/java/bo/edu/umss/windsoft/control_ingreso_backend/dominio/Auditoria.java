package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

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

    // Ampliada de DATE a TIMESTAMP (ver instrucciones SQL) para poder cumplir
    // el criterio de "fecha/hora exacta" de la auditoría.
    @Column(name = "fechaaccion")
    private LocalDateTime fechaAccion;

    public Auditoria() {
        this.fechaAccion = LocalDateTime.now();
    }

    public Auditoria(Integer idUsuario, String accion) {
        this.idUsuario = idUsuario;
        this.accion = accion;
        this.fechaAccion = LocalDateTime.now();
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

    public LocalDateTime getFechaAccion() {
        return fechaAccion;
    }

    public void setFechaAccion(LocalDateTime fechaAccion) {
        this.fechaAccion = fechaAccion;
    }
}
