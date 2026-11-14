package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnTransformer;

import java.time.LocalDateTime;

/**
 * Enrolamiento biométrico de un estudiante. La fotografía se conserva fuera del
 * directorio público; photoPath almacena únicamente su ruta relativa.
 */
@Entity
@Table(name = "face_enrollment")
public class FaceEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idenrollment")
    private Integer idEnrollment;

    @Column(name = "idusuario", nullable = false, unique = true)
    private Integer idUsuario;

    @Column(name = "photo_path", nullable = false, length = 500)
    private String photoPath;

    /** JSON serializado del vector biométrico; PostgreSQL lo persiste como jsonb. */
    @Column(name = "embedding", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String embedding;

    @Column(name = "model_version", nullable = false, length = 100)
    private String modelVersion;

    @Column(name = "estado", nullable = false, length = 30)
    private String estado;

    @Column(name = "consentimiento_at", nullable = false)
    private LocalDateTime consentimientoAt;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    public FaceEnrollment() {
    }

    public Integer getIdEnrollment() { return idEnrollment; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public String getPhotoPath() { return photoPath; }
    public void setPhotoPath(String photoPath) { this.photoPath = photoPath; }
    public String getEmbedding() { return embedding; }
    public void setEmbedding(String embedding) { this.embedding = embedding; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getConsentimientoAt() { return consentimientoAt; }
    public void setConsentimientoAt(LocalDateTime consentimientoAt) { this.consentimientoAt = consentimientoAt; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
