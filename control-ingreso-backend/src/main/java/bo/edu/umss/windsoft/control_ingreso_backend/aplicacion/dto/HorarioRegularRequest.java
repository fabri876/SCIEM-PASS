// aplicacion/dto/HorarioRegularRequest.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

public class HorarioRegularRequest {

    @NotNull private Integer idUsuario;
    @NotNull private Integer codsisDocente;
    @NotNull private Integer idAsignatura;
    @NotNull private Integer idAula;

    @NotNull @Min(1) @Max(7)
    private Short diaSemana;

    @NotNull private LocalTime horaInicio;
    @NotNull private LocalTime horaFin;

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public Integer getCodsisDocente() { return codsisDocente; }
    public void setCodsisDocente(Integer codsisDocente) { this.codsisDocente = codsisDocente; }
    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdAula() { return idAula; }
    public void setIdAula(Integer idAula) { this.idAula = idAula; }
    public Short getDiaSemana() { return diaSemana; }
    public void setDiaSemana(Short diaSemana) { this.diaSemana = diaSemana; }
    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }
    public LocalTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalTime horaFin) { this.horaFin = horaFin; }
}