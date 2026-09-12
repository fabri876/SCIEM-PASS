package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public class ExamenResponseDTO {

    private Long idExamen;
    private String asignatura;
    private LocalDateTime fechaHoraInicio;
    private Integer duracionMinutos;
    private String ambiente;
    private String normas;
    private String estado;
    private Integer idUsuarioDocente;
    private String nombreDocente;

    public ExamenResponseDTO() {
    }

    public ExamenResponseDTO(Long idExamen, String asignatura, LocalDateTime fechaHoraInicio,
                             Integer duracionMinutos, String ambiente, String normas, String estado,
                             Integer idUsuarioDocente, String nombreDocente) {
        this.idExamen = idExamen;
        this.asignatura = asignatura;
        this.fechaHoraInicio = fechaHoraInicio;
        this.duracionMinutos = duracionMinutos;
        this.ambiente = ambiente;
        this.normas = normas;
        this.estado = estado;
        this.idUsuarioDocente = idUsuarioDocente;
        this.nombreDocente = nombreDocente;
    }

    public Long getIdExamen() {
        return idExamen;
    }

    public void setIdExamen(Long idExamen) {
        this.idExamen = idExamen;
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

    public String getNombreDocente() {
        return nombreDocente;
    }

    public void setNombreDocente(String nombreDocente) {
        this.nombreDocente = nombreDocente;
    }
}
