package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Retiro de un estudiante que ya había ingresado al examen (HU06). */
@Entity
@Table(name = "expulsion")
public class Expulsion {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "expulsion_seq")
    @SequenceGenerator(name = "expulsion_seq", sequenceName = "expulsion_idexpulsion_seq", allocationSize = 1)
    @Column(name = "idexpulsion")
    private Integer idExpulsion;

    @Column(name = "idingreso", nullable = false)
    private Integer idIngreso;

    // Quien registró el retiro.
    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "motivoexpulsion")
    private String motivoExpulsion;

    @Column(name = "fechaexpulsion")
    private LocalDate fechaExpulsion;

    @Column(name = "horaexpulsion", nullable = false)
    private LocalDateTime horaExpulsion;

    @Column(name = "idincidencia", nullable = false)
    private Integer idIncidencia;

    public Expulsion() {
    }

    public Integer getIdExpulsion() { return idExpulsion; }
    public Integer getIdIngreso() { return idIngreso; }
    public void setIdIngreso(Integer idIngreso) { this.idIngreso = idIngreso; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public String getMotivoExpulsion() { return motivoExpulsion; }
    public void setMotivoExpulsion(String motivoExpulsion) { this.motivoExpulsion = motivoExpulsion; }
    public LocalDate getFechaExpulsion() { return fechaExpulsion; }
    public void setFechaExpulsion(LocalDate fechaExpulsion) { this.fechaExpulsion = fechaExpulsion; }
    public LocalDateTime getHoraExpulsion() { return horaExpulsion; }
    public void setHoraExpulsion(LocalDateTime horaExpulsion) { this.horaExpulsion = horaExpulsion; }
    public Integer getIdIncidencia() { return idIncidencia; }
    public void setIdIncidencia(Integer idIncidencia) { this.idIncidencia = idIncidencia; }
}
