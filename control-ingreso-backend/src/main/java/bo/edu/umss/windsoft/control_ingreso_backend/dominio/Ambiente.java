// dominio/Ambiente.java
package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "ambiente")
public class Ambiente {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ambiente_seq")
    @SequenceGenerator(name = "ambiente_seq", sequenceName = "ambiente_idambiente_seq", allocationSize = 1)
    @Column(name = "idambiente")
    private Integer idAmbiente;

    @Column(name = "idasignatura", nullable = false)
    private Integer idAsignatura;

    @Column(name = "idexamen", nullable = false)
    private Integer idExamen;

    @Column(name = "nombreambiente")
    private String nombreAmbiente;

    @Column(name = "ubicacionambiente")
    private String ubicacionAmbiente;

    @Column(name = "capacidadambiente")
    private Integer capacidadAmbiente;

    @Column(name = "idaula", nullable = false)
    private Integer idAula;

    @Column(name = "idhorarioregular")
    private Integer idHorarioRegular; // null si es EVENTUAL

    @Column(name = "horainicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "horafin", nullable = false)
    private LocalTime horaFin;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipohorario", nullable = false)
    private TipoHorario tipoHorario;

    public Ambiente() {}

    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }
    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }
    public String getNombreAmbiente() { return nombreAmbiente; }
    public void setNombreAmbiente(String nombreAmbiente) { this.nombreAmbiente = nombreAmbiente; }
    public String getUbicacionAmbiente() { return ubicacionAmbiente; }
    public void setUbicacionAmbiente(String ubicacionAmbiente) { this.ubicacionAmbiente = ubicacionAmbiente; }
    public Integer getCapacidadAmbiente() { return capacidadAmbiente; }
    public void setCapacidadAmbiente(Integer capacidadAmbiente) { this.capacidadAmbiente = capacidadAmbiente; }
    public Integer getIdAula() { return idAula; }
    public void setIdAula(Integer idAula) { this.idAula = idAula; }
    public Integer getIdHorarioRegular() { return idHorarioRegular; }
    public void setIdHorarioRegular(Integer idHorarioRegular) { this.idHorarioRegular = idHorarioRegular; }
    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }
    public LocalTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalTime horaFin) { this.horaFin = horaFin; }
    public TipoHorario getTipoHorario() { return tipoHorario; }
    public void setTipoHorario(TipoHorario tipoHorario) { this.tipoHorario = tipoHorario; }
}