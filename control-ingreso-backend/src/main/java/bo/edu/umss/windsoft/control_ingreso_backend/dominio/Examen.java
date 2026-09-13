package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "examen")
public class Examen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_examen")
    private Integer idExamen;

    @Column(name = "fecha_examen", nullable = false)
    private LocalDateTime fechaExamen;

    @Column(name = "duracion_examen", nullable = false)
    private LocalTime duracionExamen;

    @Column(name = "fecha_creacion_examen", nullable = false)
    private LocalDateTime fechaCreacionExamen;

    @Column(name = "normas_examen", columnDefinition = "TEXT")
    private String normasExamen;

    @Column(name = "estado_examen", nullable = false)
    private Boolean estadoExamen;

    @Column(name = "id_asignatura", nullable = false)
    private Integer idAsignatura;

    public Examen() {
    }

    public Integer getIdExamen() {
        return idExamen;
    }

    public void setIdExamen(Integer idExamen) {
        this.idExamen = idExamen;
    }

    public LocalDateTime getFechaExamen() {
        return fechaExamen;
    }

    public void setFechaExamen(LocalDateTime fechaExamen) {
        this.fechaExamen = fechaExamen;
    }

    public LocalTime getDuracionExamen() {
        return duracionExamen;
    }

    public void setDuracionExamen(LocalTime duracionExamen) {
        this.duracionExamen = duracionExamen;
    }

    public LocalDateTime getFechaCreacionExamen() {
        return fechaCreacionExamen;
    }

    public void setFechaCreacionExamen(LocalDateTime fechaCreacionExamen) {
        this.fechaCreacionExamen = fechaCreacionExamen;
    }

    public String getNormasExamen() {
        return normasExamen;
    }

    public void setNormasExamen(String normasExamen) {
        this.normasExamen = normasExamen;
    }

    public Boolean getEstadoExamen() {
        return estadoExamen;
    }

    public void setEstadoExamen(Boolean estadoExamen) {
        this.estadoExamen = estadoExamen;
    }

    public Integer getIdAsignatura() {
        return idAsignatura;
    }

    public void setIdAsignatura(Integer idAsignatura) {
        this.idAsignatura = idAsignatura;
    }
}