package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "motivoinhabilitacion")
public class MotivoInhabilitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idmotivo")
    private Integer idmotivo;

    @Column(name = "nombremotivo", nullable = false, columnDefinition = "TEXT")
    private String nombremotivo;

    @Column(name = "descripcionmotivo", columnDefinition = "TEXT")
    private String descripcionmotivo;

    public MotivoInhabilitacion() {
    }

    public MotivoInhabilitacion(String nombremotivo, String descripcionmotivo) {
        this.nombremotivo = nombremotivo;
        this.descripcionmotivo = descripcionmotivo;
    }

    public MotivoInhabilitacion(Integer idmotivo, String nombremotivo, String descripcionmotivo) {
        this.idmotivo = idmotivo;
        this.nombremotivo = nombremotivo;
        this.descripcionmotivo = descripcionmotivo;
    }

    public Integer getIdmotivo() {
        return idmotivo;
    }

    public void setIdmotivo(Integer idmotivo) {
        this.idmotivo = idmotivo;
    }

    public String getNombremotivo() {
        return nombremotivo;
    }

    public void setNombremotivo(String nombremotivo) {
        this.nombremotivo = nombremotivo;
    }

    public String getDescripcionmotivo() {
        return descripcionmotivo;
    }

    public void setDescripcionmotivo(String descripcionmotivo) {
        this.descripcionmotivo = descripcionmotivo;
    }
}
