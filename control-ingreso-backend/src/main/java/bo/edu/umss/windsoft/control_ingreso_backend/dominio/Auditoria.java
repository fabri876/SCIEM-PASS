package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "historialauditoria")
public class Auditoria {

    // Antes el id se calculaba como MAX(idauditoria) + 1, y con dos
    // registros simultáneos ambos tomaban el mismo id: uno fallaba y esa
    // auditoría se perdía. A diferencia de usuario/examen, esta columna SÍ es
    // IDENTITY (BY DEFAULT) en la base real (verificado contra
    // information_schema), así que el id lo genera PostgreSQL. Antes de usar
    // esto hay que sincronizar la identity con el MAX actual (ver
    // docs/migraciones/2026-10-04_secuencia_historialauditoria.sql).
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idauditoria")
    private Integer idAuditoria;

    @Column(name = "idusuario")
    private Integer idUsuario;

    @Column(name = "accion", columnDefinition = "TEXT")
    private String accion;

    // Ampliada de DATE a TIMESTAMP (ver instrucciones SQL) para poder cumplir
    // el criterio de "fecha/hora exacta" de la auditoría.
    @Column(name = "fechaaccion")
    private LocalDateTime fechaAccion;

    @Column(name = "motivo", columnDefinition = "TEXT")
    private String motivo;

    public Auditoria() {
        this.fechaAccion = LocalDateTime.now();
    }

    public Auditoria(Integer idUsuario, String accion) {
        this.idUsuario = idUsuario;
        this.accion = accion;
        this.fechaAccion = LocalDateTime.now();
    }

    public Auditoria(Integer idUsuario, String accion, String motivo) {
        this.idUsuario = idUsuario;
        this.accion = accion;
        this.motivo = motivo;
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

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public void setFechaAccion(LocalDateTime fechaAccion) {
        this.fechaAccion = fechaAccion;
    }
}
