package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ExamenRequestDTO {

    @NotBlank(message = "La asignatura es obligatoria")
    private String asignatura;

    @NotNull(message = "La fecha y hora de inicio es obligatoria")
    private LocalDateTime fechaHoraInicio;

    @NotNull(message = "La duración en minutos es obligatoria")
    private Integer duracionMinutos;

    @NotBlank(message = "El ambiente o aula es obligatorio")
    private String ambiente;

    private String normas;

    @NotBlank(message = "El estado del examen es obligatorio")
    private String estado;

    @NotNull(message = "El ID del docente es obligatorio")
    private Integer idUsuarioDocente;

    public ExamenRequestDTO() {
    }

    public ExamenRequestDTO(String asignatura, LocalDateTime fechaHoraInicio, Integer duracionMinutos,
                            String ambiente, String normas, String estado, Integer idUsuarioDocente) {
        this.asignatura = asignatura;
        this.fechaHoraInicio = fechaHoraInicio;
        this.duracionMinutos = duracionMinutos;
        this.ambiente = ambiente;
        this.normas = normas;
        this.estado = estado;
        this.idUsuarioDocente = idUsuarioDocente;
    }

    public String getAsignatura() {
        return asignatura;
    }

    public void setAsignatura(String asignatura) {
        this.asignatura = asignatura;
    }

    public LocalDateTime getFechaHoraInicio() {
        return fechaHoraInicio;
    }

    public void setFechaHoraInicio(LocalDateTime fechaHoraInicio) {
        this.fechaHoraInicio = fechaHoraInicio;
    }

    public Integer getDuracionMinutos() {
        return duracionMinutos;
    }

    public void setDuracionMinutos(Integer duracionMinutos) {
        this.duracionMinutos = duracionMinutos;
    }

    public String getAmbiente() {
        return ambiente;
    }

    public void setAmbiente(String ambiente) {
        this.ambiente = ambiente;
    }

    public String getNormas() {
        return normas;
    }

    public void setNormas(String normas) {
        this.normas = normas;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Integer getIdUsuarioDocente() {
        return idUsuarioDocente;
    }

    public void setIdUsuarioDocente(Integer idUsuarioDocente) {
        this.idUsuarioDocente = idUsuarioDocente;
    }
}
