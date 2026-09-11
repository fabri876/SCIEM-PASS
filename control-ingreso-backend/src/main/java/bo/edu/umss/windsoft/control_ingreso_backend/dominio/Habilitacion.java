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
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "habilitacion",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_estudiante_examen", columnNames = {"id_estudiante", "id_examen"})
    }
)
public class Habilitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_habilitacion")
    private Integer idHabilitacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_estudiante", nullable = false)
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_examen", nullable = false)
    private Examen examen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_motivo")
    private MotivoInhabilitacion motivo;

    @Column(name = "estado_habilitacion", nullable = false)
    private Boolean estadoHabilitacion;

    @Column(name = "observacion_habilitacion", columnDefinition = "TEXT")
    private String observacionHabilitacion;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    public void prePersist() {
        if (this.fechaRegistro == null) {
            this.fechaRegistro = LocalDateTime.now();
        }
    }

    public Habilitacion() {
    }

    public Habilitacion(Estudiante estudiante, Examen examen, MotivoInhabilitacion motivo, Boolean estadoHabilitacion, String observacionHabilitacion) {
        this.estudiante = estudiante;
        this.examen = examen;
        this.motivo = motivo;
        this.estadoHabilitacion = estadoHabilitacion;
        this.observacionHabilitacion = observacionHabilitacion;
        this.fechaRegistro = LocalDateTime.now();
    }

    public Integer getIdHabilitacion() {
        return idHabilitacion;
    }

    public void setIdHabilitacion(Integer idHabilitacion) {
        this.idHabilitacion = idHabilitacion;
    }

    public Estudiante getEstudiante() {
        return estudiante;
    }

    public void setEstudiante(Estudiante estudiante) {
        this.estudiante = estudiante;
    }

    public Examen getExamen() {
        return examen;
    }

    public void setExamen(Examen examen) {
        this.examen = examen;
    }

    public MotivoInhabilitacion getMotivo() {
        return motivo;
    }

    public void setMotivo(MotivoInhabilitacion motivo) {
        this.motivo = motivo;
    }

    public Boolean getEstadoHabilitacion() {
        return estadoHabilitacion;
    }

    public void setEstadoHabilitacion(Boolean estadoHabilitacion) {
        this.estadoHabilitacion = estadoHabilitacion;
    }

    public String getObservacionHabilitacion() {
        return observacionHabilitacion;
    }

    public void setObservacionHabilitacion(String observacionHabilitacion) {
        this.observacionHabilitacion = observacionHabilitacion;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
}
