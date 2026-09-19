package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

import java.time.LocalDate;

/**
 * Mapea la tabla "historialauditoria" del nuevo esquema de base de datos
 * (reemplazó a la tabla "auditoria" original). Es más simple que el diseño
 * anterior: solo tiene un idusuario (no distingue ejecutor de afectado) y
 * fechaaccion es DATE, no timestamp (sin hora exacta). AuditoriaService
 * compensa parte de esa pérdida de detalle empaquetando toda la info en el
 * campo "accion".
 */
@Entity
@Table(name = "historialauditoria")
public class Auditoria {

    // Sin IDENTITY/sequence en la base real (ver Usuario.java) — se usa una
    // sequence propia creada a mano.
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "historialauditoria_seq")
    @SequenceGenerator(name = "historialauditoria_seq", sequenceName = "historialauditoria_idauditoria_seq", allocationSize = 1)
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
}
