package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class ExamenRequest {

    @NotNull
    private LocalDateTime fechaExamen;

    @NotNull
    private LocalTime duracionExamen;

    private String normasExamen;

    @NotNull
    private Boolean estadoExamen;

    @NotNull
    private Integer idAsignatura;

    @NotEmpty
    private List<Integer> idAmbientes;

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

    public List<Integer> getIdAmbientes() {
        return idAmbientes;
    }

    public void setIdAmbientes(List<Integer> idAmbientes) {
        this.idAmbientes = idAmbientes;
    }
}