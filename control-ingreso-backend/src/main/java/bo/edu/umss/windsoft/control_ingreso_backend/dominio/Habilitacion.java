package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "habilitacion")
public class Habilitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idhabilitacion")
    private Integer idhabilitacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "codsisestudiante", referencedColumnName = "codsisestudiante", nullable = false)
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idmotivo", referencedColumnName = "idmotivo", nullable = false)
    private MotivoInhabilitacion motivo;

    @Column(name = "estadohabilitacion", nullable = false)
    private Boolean estadohabilitacion;

    @Column(name = "observacionhabilitacion")
    private String observacionhabilitacion;

    @Column(name = "fecharegistro", nullable = false)
    private LocalDateTime fecharegistro;

    @PrePersist
    public void prePersist() {
        if (this.fecharegistro == null) {
            this.fecharegistro = LocalDateTime.now();
        }
    }

    public Habilitacion() {
    }

    public Habilitacion(Estudiante estudiante, MotivoInhabilitacion motivo, Boolean estadohabilitacion, String observacionhabilitacion) {
        this.estudiante = estudiante;
        this.motivo = motivo;
        this.estadohabilitacion = estadohabilitacion;
        this.observacionhabilitacion = observacionhabilitacion;
        this.fecharegistro = LocalDateTime.now();
    }

    public Integer getIdhabilitacion() {
        return idhabilitacion;
    }

    public void setIdhabilitacion(Integer idhabilitacion) {
        this.idhabilitacion = idhabilitacion;
    }

    public Estudiante getEstudiante() {
        return estudiante;
    }

    public void setEstudiante(Estudiante estudiante) {
        this.estudiante = estudiante;
    }

    public MotivoInhabilitacion getMotivo() {
        return motivo;
    }

    public void setMotivo(MotivoInhabilitacion motivo) {
        this.motivo = motivo;
    }

    public Boolean getEstadohabilitacion() {
        return estadohabilitacion;
    }

    public void setEstadohabilitacion(Boolean estadohabilitacion) {
        this.estadohabilitacion = estadohabilitacion;
    }

    public String getObservacionhabilitacion() {
        return observacionhabilitacion;
    }

    public void setObservacionhabilitacion(String observacionhabilitacion) {
        this.observacionhabilitacion = observacionhabilitacion;
    }

    public LocalDateTime getFecharegistro() {
        return fecharegistro;
    }

    public void setFecharegistro(LocalDateTime fecharegistro) {
        this.fecharegistro = fecharegistro;
    }
}
