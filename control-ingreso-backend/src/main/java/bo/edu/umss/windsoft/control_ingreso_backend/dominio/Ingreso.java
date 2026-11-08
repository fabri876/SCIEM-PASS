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
 * Ingreso de un estudiante a un examen. La tabla la comparten la HU05 (ingreso
 * NORMAL por el punto de control) y la HU06 (ingreso EXCEPCIONAL): usar esta
 * misma entidad, no crear otra sobre la tabla "ingreso".
 *
 * Reglas que pone la BD (docs/migraciones/2026-10-04_hu06_incidencias_ingreso_excepcional.sql):
 * - UNIQUE (codsisestudiante, idasignatura, idexamen): un solo ingreso por examen.
 * - Un EXCEPCIONAL siempre tiene motivoexcepcion y observacioningreso.
 * - idusuario es quien registró el ingreso (en un EXCEPCIONAL, quien lo autorizó).
 */
@Entity
@Table(name = "ingreso")
public class Ingreso {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ingreso_seq")
    @SequenceGenerator(name = "ingreso_seq", sequenceName = "ingreso_idingreso_seq", allocationSize = 1)
    @Column(name = "idingreso")
    private Integer idIngreso;

    @Column(name = "est_idusuario", nullable = false)
    private Integer idUsuarioEstudiante;

    @Column(name = "codsisestudiante", nullable = false)
    private Integer codsisEstudiante;

    @Column(name = "idasignatura", nullable = false)
    private Integer idAsignatura;

    @Column(name = "idexamen", nullable = false)
    private Integer idExamen;

    @Column(name = "idambiente", nullable = false)
    private Integer idAmbiente;

    @Column(name = "idusuario", nullable = false)
    private Integer idUsuarioRegistra;

    @Column(name = "idexpulsion")
    private Integer idExpulsion;

    @Column(name = "fechaingreso")
    private LocalDate fechaIngreso;

    @Column(name = "horaingreso", nullable = false)
    private LocalDateTime horaIngreso;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipoingreso", nullable = false)
    private TipoIngreso tipoIngreso = TipoIngreso.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "motivoexcepcion")
    private MotivoExcepcion motivoExcepcion;

    @Column(name = "observacioningreso")
    private String observacionIngreso;

    @Column(name = "evidenciaurl")
    private String evidenciaUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_ingreso", nullable = false)
    private MetodoIngreso metodoIngreso = MetodoIngreso.ESCANEO;

    /** Identificador generado por el dispositivo para idempotencia offline (HU7). */
    @Column(name = "client_uuid", length = 100, unique = true)
    private String clientUuid;

    /** Metadatos de auditoría de la verificación biométrica facial. */
    @Column(name = "score_facial")
    private Double scoreFacial;

    @Column(name = "liveness_score")
    private Double livenessScore;

    @Column(name = "model_version", length = 100)
    private String modelVersion;

    @Column(name = "device_id", length = 255)
    private String deviceId;

    @Column(name = "sincronizado_en")
    private LocalDateTime sincronizadoEn;

    @Column(name = "server_recheck_score")
    private Double serverRecheckScore;

    @Column(name = "audit_flag", nullable = false)
    private boolean auditFlag = false;

    /** Hora original capturada por el dispositivo; horaIngreso conserva la hora registrada en BD. */
    @Column(name = "hora_marcacion")
    private LocalDateTime horaMarcacion;

    public Ingreso() {
    }

    public boolean estaRetirado() {
        return idExpulsion != null;
    }

    public Integer getIdIngreso() { return idIngreso; }
    public Integer getIdUsuarioEstudiante() { return idUsuarioEstudiante; }
    public void setIdUsuarioEstudiante(Integer idUsuarioEstudiante) { this.idUsuarioEstudiante = idUsuarioEstudiante; }
    public Integer getCodsisEstudiante() { return codsisEstudiante; }
    public void setCodsisEstudiante(Integer codsisEstudiante) { this.codsisEstudiante = codsisEstudiante; }
    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }
    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }
    public Integer getIdUsuarioRegistra() { return idUsuarioRegistra; }
    public void setIdUsuarioRegistra(Integer idUsuarioRegistra) { this.idUsuarioRegistra = idUsuarioRegistra; }
    public Integer getIdExpulsion() { return idExpulsion; }
    public void setIdExpulsion(Integer idExpulsion) { this.idExpulsion = idExpulsion; }
    public LocalDate getFechaIngreso() { return fechaIngreso; }
    public void setFechaIngreso(LocalDate fechaIngreso) { this.fechaIngreso = fechaIngreso; }
    public LocalDateTime getHoraIngreso() { return horaIngreso; }
    public void setHoraIngreso(LocalDateTime horaIngreso) { this.horaIngreso = horaIngreso; }
    public TipoIngreso getTipoIngreso() { return tipoIngreso; }
    public void setTipoIngreso(TipoIngreso tipoIngreso) { this.tipoIngreso = tipoIngreso; }
    public MotivoExcepcion getMotivoExcepcion() { return motivoExcepcion; }
    public void setMotivoExcepcion(MotivoExcepcion motivoExcepcion) { this.motivoExcepcion = motivoExcepcion; }
    public String getObservacionIngreso() { return observacionIngreso; }
    public void setObservacionIngreso(String observacionIngreso) { this.observacionIngreso = observacionIngreso; }
    public String getEvidenciaUrl() { return evidenciaUrl; }
    public void setEvidenciaUrl(String evidenciaUrl) { this.evidenciaUrl = evidenciaUrl; }
    public MetodoIngreso getMetodoIngreso() { return metodoIngreso; }
    public void setMetodoIngreso(MetodoIngreso metodoIngreso) { this.metodoIngreso = metodoIngreso; }
    public String getClientUuid() { return clientUuid; }
    public void setClientUuid(String clientUuid) { this.clientUuid = clientUuid; }
    public Double getScoreFacial() { return scoreFacial; }
    public void setScoreFacial(Double scoreFacial) { this.scoreFacial = scoreFacial; }
    public Double getLivenessScore() { return livenessScore; }
    public void setLivenessScore(Double livenessScore) { this.livenessScore = livenessScore; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public LocalDateTime getSincronizadoEn() { return sincronizadoEn; }
    public void setSincronizadoEn(LocalDateTime sincronizadoEn) { this.sincronizadoEn = sincronizadoEn; }
    public Double getServerRecheckScore() { return serverRecheckScore; }
    public void setServerRecheckScore(Double serverRecheckScore) { this.serverRecheckScore = serverRecheckScore; }
    public boolean isAuditFlag() { return auditFlag; }
    public void setAuditFlag(boolean auditFlag) { this.auditFlag = auditFlag; }
    public LocalDateTime getHoraMarcacion() { return horaMarcacion; }
    public void setHoraMarcacion(LocalDateTime horaMarcacion) { this.horaMarcacion = horaMarcacion; }
}
