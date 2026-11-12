package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** Registro auditable de cada intento de verificación facial, incluso rechazado. */
@Entity
@Table(name = "face_intento")
public class FaceIntento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idintento")
    private Integer idIntento;

    @Column(name = "client_uuid", nullable = false, unique = true, length = 100)
    private String clientUuid;

    @Column(name = "est_idusuario", nullable = false)
    private Integer idUsuarioEstudiante;

    @Column(name = "idusuario", nullable = false)
    private Integer idUsuarioOperador;

    @Column(name = "idasignatura", nullable = false)
    private Integer idAsignatura;

    @Column(name = "idexamen", nullable = false)
    private Integer idExamen;

    @Column(name = "idambiente", nullable = false)
    private Integer idAmbiente;

    @Column(name = "score")
    private Double score;

    @Column(name = "liveness_score")
    private Double livenessScore;

    @Column(name = "resultado", nullable = false, length = 20)
    private String resultado;

    @Column(name = "device_id", nullable = false, length = 255)
    private String deviceId;

    @Column(name = "model_version", nullable = false, length = 100)
    private String modelVersion;

    @Column(name = "capturado_en", nullable = false)
    private LocalDateTime capturadoEn;

    @Column(name = "sincronizado_en")
    private LocalDateTime sincronizadoEn;

    public FaceIntento() {
    }

    public Integer getIdIntento() { return idIntento; }
    public String getClientUuid() { return clientUuid; }
    public void setClientUuid(String clientUuid) { this.clientUuid = clientUuid; }
    public Integer getIdUsuarioEstudiante() { return idUsuarioEstudiante; }
    public void setIdUsuarioEstudiante(Integer idUsuarioEstudiante) { this.idUsuarioEstudiante = idUsuarioEstudiante; }
    public Integer getIdUsuarioOperador() { return idUsuarioOperador; }
    public void setIdUsuarioOperador(Integer idUsuarioOperador) { this.idUsuarioOperador = idUsuarioOperador; }
    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }
    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }
    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }
    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }
    public Double getLivenessScore() { return livenessScore; }
    public void setLivenessScore(Double livenessScore) { this.livenessScore = livenessScore; }
    public String getResultado() { return resultado; }
    public void setResultado(String resultado) { this.resultado = resultado; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public LocalDateTime getCapturadoEn() { return capturadoEn; }
    public void setCapturadoEn(LocalDateTime capturadoEn) { this.capturadoEn = capturadoEn; }
    public LocalDateTime getSincronizadoEn() { return sincronizadoEn; }
    public void setSincronizadoEn(LocalDateTime sincronizadoEn) { this.sincronizadoEn = sincronizadoEn; }
}
