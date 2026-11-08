package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Ingreso BLOQUEADO en el punto de control (HU05): duplicado, aula diferente a
 * la asignada o estudiante inhabilitado. Lo usa el dashboard de la HU10
 * ("Duplicados Bloqueados" y alertas de estudiantes desubicados).
 * Ver docs/migraciones/2026-10-10_hu10_monitoreo_intentos_reubicaciones.sql.
 */
@Entity
@Table(name = "intentosnoautorizados")
public class IntentoNoAutorizado {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "intento_seq")
    @SequenceGenerator(name = "intento_seq", sequenceName = "intentosnoautorizados_idintento_seq", allocationSize = 1)
    @Column(name = "idintento")
    private Integer idIntento;

    @Column(name = "idasignatura", nullable = false)
    private Integer idAsignatura;

    @Column(name = "idexamen", nullable = false)
    private Integer idExamen;

    // Operador (o docente) que intentó registrar el ingreso.
    @Column(name = "idusuario", nullable = false)
    private Integer idUsuarioRegistra;

    @Column(name = "est_idusuario", nullable = false)
    private Integer idUsuarioEstudiante;

    @Column(name = "codsisestudiante", nullable = false)
    private Integer codsisEstudiante;

    @Column(name = "fechaintento")
    private LocalDate fechaIntento;

    @Column(name = "horaintento", nullable = false)
    private LocalDateTime horaIntento;

    @Enumerated(EnumType.STRING)
    @Column(name = "motivointento", nullable = false)
    private MotivoIntento motivo;

    // Aula donde se presentó el estudiante.
    @Column(name = "idambiente")
    private Integer idAmbiente;

    // Aula que tenía asignada (solo para AMBIENTE_DIFERENTE).
    @Column(name = "idambienteasignado")
    private Integer idAmbienteAsignado;

    public IntentoNoAutorizado() {
    }

    public Integer getIdIntento() { return idIntento; }
    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }
    public Integer getIdUsuarioRegistra() { return idUsuarioRegistra; }
    public void setIdUsuarioRegistra(Integer idUsuarioRegistra) { this.idUsuarioRegistra = idUsuarioRegistra; }
    public Integer getIdUsuarioEstudiante() { return idUsuarioEstudiante; }
    public void setIdUsuarioEstudiante(Integer idUsuarioEstudiante) { this.idUsuarioEstudiante = idUsuarioEstudiante; }
    public Integer getCodsisEstudiante() { return codsisEstudiante; }
    public void setCodsisEstudiante(Integer codsisEstudiante) { this.codsisEstudiante = codsisEstudiante; }
    public LocalDate getFechaIntento() { return fechaIntento; }
    public void setFechaIntento(LocalDate fechaIntento) { this.fechaIntento = fechaIntento; }
    public LocalDateTime getHoraIntento() { return horaIntento; }
    public void setHoraIntento(LocalDateTime horaIntento) { this.horaIntento = horaIntento; }
    public MotivoIntento getMotivo() { return motivo; }
    public void setMotivo(MotivoIntento motivo) { this.motivo = motivo; }
    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }
    public Integer getIdAmbienteAsignado() { return idAmbienteAsignado; }
    public void setIdAmbienteAsignado(Integer idAmbienteAsignado) { this.idAmbienteAsignado = idAmbienteAsignado; }
}
