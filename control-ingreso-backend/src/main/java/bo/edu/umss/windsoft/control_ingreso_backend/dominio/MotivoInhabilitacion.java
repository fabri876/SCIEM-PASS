package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

@Entity
@Table(name = "motivoinhabilitacion")
public class MotivoInhabilitacion {

    // Sin IDENTITY/sequence en la base real (ver Usuario.java) — se usa una
    // sequence propia creada a mano.
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "motivoinhabilitacion_seq")
    @SequenceGenerator(name = "motivoinhabilitacion_seq", sequenceName = "motivoinhabilitacion_idmotivo_seq", allocationSize = 1)
    @Column(name = "idmotivo")
    private Integer idmotivo;

    @Column(name = "nombremotivo")
    private String nombremotivo;

    // La base nueva (rediseño de sep-2026) le puso este nombre a la columna
    // por error/typo aparente (la tabla es motivoinhabilitacion, no
    // habilitacion), pero es el que existe físicamente.
    @Column(name = "descripcionhabilitacion")
    private String descripcionmotivo;

    public MotivoInhabilitacion() {
    }

    public MotivoInhabilitacion(Integer idmotivo, String nombremotivo, String descripcionmotivo) {
        this.idmotivo = idmotivo;
        this.nombremotivo = nombremotivo;
        this.descripcionmotivo = descripcionmotivo;
    }

    public MotivoInhabilitacion(String nombremotivo, String descripcionmotivo) {
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
