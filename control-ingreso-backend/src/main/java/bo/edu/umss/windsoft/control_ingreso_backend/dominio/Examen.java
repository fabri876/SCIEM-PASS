package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "examen")
public class Examen {
    @Column(name="idsemestre", insertable=false, updatable=false)
    private Integer idSemestre;
    public Integer getIdSemestre() { return idSemestre; }


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

    @Column(name = "cancelado", nullable = false)
    private Boolean cancelado = false;

    @Column(name = "motivocancelacion", length = 200)
    private String motivoCancelacion;

    @Column(name = "fechacancelacion")
    private LocalDateTime fechaCancelacion;

    @Column(name = "idusuariocancelacion")
    private Integer idUsuarioCancelacion;

    @Column(name = "idasignatura")
    private Integer idAsignatura;

    // Opcional mientras se migran los exámenes existentes a un grupo.
    @Column(name = "idgrupo")
    private Integer idGrupo;

    @Column(name = "idtipoexamen", nullable = false)
    private Integer idTipoExamen;

    @Column(name = "detalletipoexamen")
    private String detalleTipoExamen;

    @Column(name = "idusuario")
    private Integer idUsuario;

    @Column(name = "codsisdocente")
    private Integer codsisDocente;
        
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

    public Boolean getCancelado() { return cancelado; }
    public void setCancelado(Boolean cancelado) { this.cancelado = cancelado; }
    public String getMotivoCancelacion() { return motivoCancelacion; }
    public void setMotivoCancelacion(String motivoCancelacion) { this.motivoCancelacion = motivoCancelacion; }
    public LocalDateTime getFechaCancelacion() { return fechaCancelacion; }
    public void setFechaCancelacion(LocalDateTime fechaCancelacion) { this.fechaCancelacion = fechaCancelacion; }
    public Integer getIdUsuarioCancelacion() { return idUsuarioCancelacion; }
    public void setIdUsuarioCancelacion(Integer idUsuarioCancelacion) { this.idUsuarioCancelacion = idUsuarioCancelacion; }

    public Integer getIdAsignatura() {
        return idAsignatura;
    }

    public void setIdAsignatura(Integer idAsignatura) {
        this.idAsignatura = idAsignatura;
    }
    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }
    public Integer getIdTipoExamen() { return idTipoExamen; }
    public void setIdTipoExamen(Integer idTipoExamen) { this.idTipoExamen = idTipoExamen; }
    public String getDetalleTipoExamen() { return detalleTipoExamen; }
    public void setDetalleTipoExamen(String detalleTipoExamen) { this.detalleTipoExamen = detalleTipoExamen; }

    public Integer getIdUsuario() {
    return idUsuario;
    }
    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }
    public Integer getCodsisDocente() {
        return codsisDocente;
    }
    public void setCodsisDocente(Integer codsisDocente) {
        this.codsisDocente = codsisDocente;
    }

}
