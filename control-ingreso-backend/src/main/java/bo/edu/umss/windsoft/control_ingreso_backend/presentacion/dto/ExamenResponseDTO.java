package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

public class ExamenResponseDTO {

    private Integer idExamen;
    private LocalDateTime fechaExamen;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime duracionExamen;

    private LocalDateTime fechaCreacionExamen;
    private String normasExamen;
    private Boolean estadoExamen;
    private Integer idAsignatura;

    public ExamenResponseDTO() {
    }

    public ExamenResponseDTO(Integer idExamen, LocalDateTime fechaExamen, LocalTime duracionExamen,
                             LocalDateTime fechaCreacionExamen, String normasExamen, Boolean estadoExamen,
                             Integer idAsignatura) {
        this.idExamen = idExamen;
        this.fechaExamen = fechaExamen;
        this.duracionExamen = duracionExamen;
        this.fechaCreacionExamen = fechaCreacionExamen;
        this.normasExamen = normasExamen;
        this.estadoExamen = estadoExamen;
        this.idAsignatura = idAsignatura;
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
