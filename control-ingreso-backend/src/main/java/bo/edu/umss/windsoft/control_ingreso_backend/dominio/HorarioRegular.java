// dominio/HorarioRegular.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "horarioregular")
public class HorarioRegular {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "horarioregular_seq")
    @SequenceGenerator(name = "horarioregular_seq", sequenceName = "horarioregular_idhorarioregular_seq", allocationSize = 1)
    @Column(name = "idhorarioregular")
    private Integer idHorarioRegular;

    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "codsisdocente", nullable = false)
    private Integer codsisDocente;

    @Column(name = "idasignatura", nullable = false)
    private Integer idAsignatura;

    @Column(name = "idaula", nullable = false)
    private Integer idAula;

    @Column(name = "diasemana", nullable = false)
    private Short diaSemana; // 1=Lunes ... 7=Domingo

    @Column(name = "horainicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "horafin", nullable = false)
    private LocalTime horaFin;

    @Column(name = "estadohorario", nullable = false)
    private Boolean estadoHorario = true;

    public HorarioRegular() {}

    public Integer getIdHorarioRegular() { return idHorarioRegular; }
    public void setIdHorarioRegular(Integer idHorarioRegular) { this.idHorarioRegular = idHorarioRegular; }
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
    public Boolean getEstadoHorario() { return estadoHorario; }
    public void setEstadoHorario(Boolean estadoHorario) { this.estadoHorario = estadoHorario; }
}