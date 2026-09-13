package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;

public class ExamenRequestDTO {

    @NotNull(message = "El ID de la asignatura es obligatorio")
    private Integer idAsignatura;

    @NotNull(message = "La fecha del examen es obligatoria")
    private LocalDateTime fechaExamen;

    @NotNull(message = "La duración del examen es obligatoria")
    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime duracionExamen;

    private LocalDateTime fechaCreacionExamen;

    private String normasExamen;

    private Boolean estadoExamen;

    public ExamenRequestDTO() {
    }

    public ExamenRequestDTO(Integer idAsignatura, LocalDateTime fechaExamen, LocalTime duracionExamen,
                            LocalDateTime fechaCreacionExamen, String normasExamen, Boolean estadoExamen) {
        this.idAsignatura = idAsignatura;
        this.fechaExamen = fechaExamen;
        this.duracionExamen = duracionExamen;
        this.fechaCreacionExamen = fechaCreacionExamen;
        this.normasExamen = normasExamen;
        this.estadoExamen = estadoExamen;
    }

    public Integer getIdAsignatura() {
        return idAsignatura;
    }

    public void setIdAsignatura(Integer idAsignatura) {
        this.idAsignatura = idAsignatura;
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
}
