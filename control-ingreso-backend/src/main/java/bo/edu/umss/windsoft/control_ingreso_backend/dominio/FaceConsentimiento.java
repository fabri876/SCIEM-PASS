package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Consentimiento previo e independiente de la captura biometrica. */
@Entity
@Table(name = "face_consentimiento")
public class FaceConsentimiento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idconsentimiento") private Integer id;
    @Column(name = "idusuario", nullable = false) private Integer idUsuario;
    @Column(name = "aceptado_en", nullable = false) private LocalDateTime aceptadoEn;
    @Column(name = "version_terminos", nullable = false, length = 40) private String versionTerminos;
    public Integer getId() { return id; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public LocalDateTime getAceptadoEn() { return aceptadoEn; }
    public void setAceptadoEn(LocalDateTime aceptadoEn) { this.aceptadoEn = aceptadoEn; }
    public String getVersionTerminos() { return versionTerminos; }
    public void setVersionTerminos(String versionTerminos) { this.versionTerminos = versionTerminos; }
}
