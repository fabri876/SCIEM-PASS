package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "motivo_inhabilitacion")
public class MotivoInhabilitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_motivo")
    private Integer idMotivo;

    @Column(name = "nombre_motivo", nullable = false, length = 100)
    private String nombreMotivo;

    @Column(name = "descripcion_motivo", columnDefinition = "TEXT")
    private String descripcionMotivo;

    public MotivoInhabilitacion() {
    }

    public MotivoInhabilitacion(Integer idMotivo, String nombreMotivo, String descripcionMotivo) {
        this.idMotivo = idMotivo;
        this.nombreMotivo = nombreMotivo;
        this.descripcionMotivo = descripcionMotivo;
    }

    public MotivoInhabilitacion(String nombreMotivo, String descripcionMotivo) {
        this.nombreMotivo = nombreMotivo;
        this.descripcionMotivo = descripcionMotivo;
    }

    public Integer getIdMotivo() {
        return idMotivo;
    }

    public void setIdMotivo(Integer idMotivo) {
        this.idMotivo = idMotivo;
    }

    public String getNombreMotivo() {
        return nombreMotivo;
    }

    public void setNombreMotivo(String nombreMotivo) {
        this.nombreMotivo = nombreMotivo;
    }

    public String getDescripcionMotivo() {
        return descripcionMotivo;
    }

    public void setDescripcionMotivo(String descripcionMotivo) {
        this.descripcionMotivo = descripcionMotivo;
    }
}
