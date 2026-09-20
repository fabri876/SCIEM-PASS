// aplicacion/dto/ExamenRequest.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoHorario;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class ExamenRequest {

    @NotNull
    private LocalDateTime fechaExamen;

    @NotNull
    private Boolean estadoExamen;

    @NotNull
    private Integer idAsignatura;
    
    // TODO(seguridad): reemplazar por el usuario autenticado (JWT), ver nota arriba.
    @NotNull
    private Integer idUsuario;

    @NotNull
    private Integer codsisDocente;

    @NotNull
    private TipoHorario tipoHorario;

    @NotNull
    private Integer idTipoExamen;

    private String detalleTipoExamen;

    
    private Integer idHorarioRegular;

    // Obligatorios si tipoHorario == EVENTUAL
    private Integer idAula;
    private LocalTime horaInicio;
    private LocalTime horaFin;

    // Normas
    private List<Integer> idsNormasGenerales;
    private List<String> normasEspecificas;
    
    public LocalDateTime getFechaExamen() { return fechaExamen; }
    public void setFechaExamen(LocalDateTime fechaExamen) { this.fechaExamen = fechaExamen; }
    public Boolean getEstadoExamen() { return estadoExamen; }
    public void setEstadoExamen(Boolean estadoExamen) { this.estadoExamen = estadoExamen; }
    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public Integer getCodsisDocente() { return codsisDocente; }
    public void setCodsisDocente(Integer codsisDocente) { this.codsisDocente = codsisDocente; }
    public TipoHorario getTipoHorario() { return tipoHorario; }
    public void setTipoHorario(TipoHorario tipoHorario) { this.tipoHorario = tipoHorario; }
    public Integer getIdHorarioRegular() { return idHorarioRegular; }
    public void setIdHorarioRegular(Integer idHorarioRegular) { this.idHorarioRegular = idHorarioRegular; }
    public Integer getIdAula() { return idAula; }
    public void setIdAula(Integer idAula) { this.idAula = idAula; }
    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }
    public LocalTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalTime horaFin) { this.horaFin = horaFin; }
    public List<Integer> getIdsNormasGenerales() { return idsNormasGenerales; }
    public void setIdsNormasGenerales(List<Integer> idsNormasGenerales) { this.idsNormasGenerales = idsNormasGenerales; }
    public List<String> getNormasEspecificas() { return normasEspecificas; }
    public void setNormasEspecificas(List<String> normasEspecificas) { this.normasEspecificas = normasEspecificas; }
    public Integer getIdTipoExamen() { return idTipoExamen; }
    public void setIdTipoExamen(Integer idTipoExamen) { this.idTipoExamen = idTipoExamen; }
    public String getDetalleTipoExamen() { return detalleTipoExamen; }
    public void setDetalleTipoExamen(String detalleTipoExamen) { this.detalleTipoExamen = detalleTipoExamen; }
}