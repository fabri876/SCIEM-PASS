package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "auditoria")
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria")
    private Integer idAuditoria;

    @Column(name = "tipo_operacion", nullable = false)
    private String tipoOperacion;

    @Column(name = "usuario_ejecutor")
    private String usuarioEjecutor;

    @Column(name = "usuario_afectado")
    private String usuarioAfectado;

    @Column(name = "detalles", columnDefinition = "TEXT")
    private String detalles;

    @Column(name = "ip_origen")
    private String ipOrigen;

    @Column(name = "fecha_hora", nullable = false)
    private OffsetDateTime fechaHora;

    @PrePersist
    public void prePersist() {
        if (this.fechaHora == null) {
            this.fechaHora = OffsetDateTime.now();
        }
    }

    public Auditoria() {
    }

    public Auditoria(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                     String detalles, String ip_origen) {
        this.tipoOperacion = tipoOperacion;
        this.usuarioEjecutor = usuarioEjecutor;
        this.usuarioAfectado = usuarioAfectado;
        this.detalles = detalles;
        this.ipOrigen = ip_origen;
        this.fechaHora = OffsetDateTime.now();
    }

    public Integer getIdAuditoria() {
        return idAuditoria;
    }

    public void setIdAuditoria(Integer idAuditoria) {
        this.idAuditoria = idAuditoria;
    }

    public String getTipoOperacion() {
        return tipoOperacion;
    }

    public void setTipoOperacion(String tipoOperacion) {
        this.tipoOperacion = tipoOperacion;
    }

    public String getUsuarioEjecutor() {
        return usuarioEjecutor;
    }

    public void setUsuarioEjecutor(String usuarioEjecutor) {
        this.usuarioEjecutor = usuarioEjecutor;
    }

    public String getUsuarioAfectado() {
        return usuarioAfectado;
    }

    public void setUsuarioAfectado(String usuarioAfectado) {
        this.usuarioAfectado = usuarioAfectado;
    }

    public String getDetalles() {
        return detalles;
    }

    public void setDetalles(String detalles) {
        this.detalles = detalles;
    }

    public String getIpOrigen() {
        return ipOrigen;
    }

    public void setIpOrigen(String ipOrigen) {
        this.ipOrigen = ipOrigen;
    }

    public OffsetDateTime getFechaHora() {
        return fechaHora;
    }

    public void setFechaHora(OffsetDateTime fechaHora) {
        this.fechaHora = fechaHora;
    }
}
