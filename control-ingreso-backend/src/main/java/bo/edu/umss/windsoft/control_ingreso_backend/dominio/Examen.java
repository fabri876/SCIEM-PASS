package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "examen")
public class Examen {

    // Sin IDENTITY/sequence en la base real (ver Usuario.java) — se usa una
    // sequence propia creada a mano.
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "examen_seq")
    @SequenceGenerator(name = "examen_seq", sequenceName = "examen_idexamen_seq", allocationSize = 1)
    @Column(name = "idexamen")
    private Integer idExamen;

    // La base nueva (rediseño de sep-2026) usa DATE (sin hora) para estas dos
    // columnas, y sin guion bajo en el nombre (antes: id_examen, fecha_examen, etc.).
    @Column(name = "fechaexamen")
    private LocalDate fechaExamen;

    @Column(name = "duracionexamen")
    private LocalTime duracionExamen;

    @Column(name = "fechacreacionexamen")
    private LocalDate fechaCreacionExamen;

    @Column(name = "normasexamen", columnDefinition = "TEXT")
    private String normasExamen;

    @Column(name = "estadoexamen")
    private Boolean estadoExamen;

    @Column(name = "idasignatura")
    private Integer idAsignatura;

    @Column(name = "idtipoexamen", nullable = false)
    private Integer idTipoExamen;

    @Column(name = "detalletipoexamen")
    private String detalleTipoExamen;
    public Examen() {
    }

    public Integer getIdExamen() {
        return idExamen;
    }

    public void setIdExamen(Integer idExamen) {
        this.idExamen = idExamen;
    }

    public LocalDate getFechaExamen() {
        return fechaExamen;
    }

    public void setFechaExamen(LocalDate fechaExamen) {
        this.fechaExamen = fechaExamen;
    }

    public LocalTime getDuracionExamen() {
        return duracionExamen;
    }

    public void setDuracionExamen(LocalTime duracionExamen) {
        this.duracionExamen = duracionExamen;
    }

    public LocalDate getFechaCreacionExamen() {
        return fechaCreacionExamen;
    }

    public void setFechaCreacionExamen(LocalDate fechaCreacionExamen) {
        this.fechaCreacionExamen = fechaCreacionExamen;
    }

    public String getNormasExamen() {
        return normasExamen;
    }

    public void setNormasExamen(String normasExamen) {
        this.normasExamen = normasExamen;
    }

    public Boolean getEstadoExamen() {
        return estadoExamen;
    }

    public void setEstadoExamen(Boolean estadoExamen) {
        this.estadoExamen = estadoExamen;
    }

    public Integer getIdAsignatura() {
        return idAsignatura;
    }

    public void setIdAsignatura(Integer idAsignatura) {
        this.idAsignatura = idAsignatura;
    }
    public Integer getIdTipoExamen() { return idTipoExamen; }
public void setIdTipoExamen(Integer idTipoExamen) { this.idTipoExamen = idTipoExamen; }
public String getDetalleTipoExamen() { return detalleTipoExamen; }
public void setDetalleTipoExamen(String detalleTipoExamen) { this.detalleTipoExamen = detalleTipoExamen; }

}
