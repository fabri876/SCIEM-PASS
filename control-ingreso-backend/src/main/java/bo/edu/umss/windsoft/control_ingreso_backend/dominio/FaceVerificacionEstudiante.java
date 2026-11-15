package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Intento de verificacion previo a emitir el QR del examen. */
@Entity
@Table(name = "face_verificacion_estudiante")
public class FaceVerificacionEstudiante {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idverificacion") private Integer id;
    @Column(name = "idusuario", nullable = false) private Integer idUsuario;
    @Column(name = "idexamen", nullable = false) private Integer idExamen;
    @Column(nullable = false, length = 20) private String resultado;
    @Column private Double score;
    @Column(name = "liveness_score") private Double livenessScore;
    @Column(name = "verificado_en", nullable = false) private LocalDateTime verificadoEn;
    @Column(name = "vence_en") private LocalDateTime venceEn;
    public Integer getId() { return id; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }
    public String getResultado() { return resultado; }
    public void setResultado(String resultado) { this.resultado = resultado; }
    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }
    public Double getLivenessScore() { return livenessScore; }
    public void setLivenessScore(Double livenessScore) { this.livenessScore = livenessScore; }
    public LocalDateTime getVerificadoEn() { return verificadoEn; }
    public void setVerificadoEn(LocalDateTime verificadoEn) { this.verificadoEn = verificadoEn; }
    public LocalDateTime getVenceEn() { return venceEn; }
    public void setVenceEn(LocalDateTime venceEn) { this.venceEn = venceEn; }
}
