package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

@Entity
@Table(name = "habilitacion")
public class Habilitacion {

    // Sin IDENTITY/sequence en la base real (ver Usuario.java) — se usa una
    // sequence propia creada a mano.
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "habilitacion_seq")
    @SequenceGenerator(name = "habilitacion_seq", sequenceName = "habilitacion_idhabilitacion_seq", allocationSize = 1)
    @Column(name = "idhabilitacion")
    private Integer idhabilitacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "codsisestudiante", referencedColumnName = "codsisestudiante")
    private Estudiante estudiante;

    // La base nueva (rediseño de sep-2026) quitó la columna "idmotivo": la
    // tabla "habilitacion" ya no referencia a "motivoinhabilitacion", ahora
    // referencia directo a un examen/asignatura/usuario. Se removió el
    // ManyToOne a MotivoInhabilitacion (la columna ya no existe) y se
    // agregaron estas 3 columnas nuevas como campos simples. Esto es lo
    // mínimo para que el backend arranque; el significado real de
    // "habilitación" cambió (antes: estudiante inhabilitado con un motivo;
    // ahora: aparenta ser habilitación por examen) y debe revisarlo quien
    // tenga esa HU.
    @Column(name = "idexamen")
    private Integer idExamen;

    @Column(name = "idasignatura")
    private Integer idAsignatura;

    @Column(name = "idusuario")
    private Integer idUsuario;

    @Column(name = "estadohabilitacion")
    private Boolean estadohabilitacion;

    @Column(name = "observacionhabilitacion")
    private String observacionhabilitacion;

    // La base nueva (rediseño de sep-2026) guarda esta columna como DATE, sin hora.
    @Column(name = "fecharegistro")
    private LocalDate fecharegistro;

    @PrePersist
    public void prePersist() {
        if (this.fecharegistro == null) {
            this.fecharegistro = LocalDate.now();
        }
    }

    public Habilitacion() {
    }

    public Habilitacion(Estudiante estudiante, Boolean estadohabilitacion, String observacionhabilitacion) {
        this.estudiante = estudiante;
        this.estadohabilitacion = estadohabilitacion;
        this.observacionhabilitacion = observacionhabilitacion;
        this.fecharegistro = LocalDate.now();
    }

    public Integer getIdhabilitacion() {
        return idhabilitacion;
    }

    public void setIdhabilitacion(Integer idhabilitacion) {
        this.idhabilitacion = idhabilitacion;
    }

    public Estudiante getEstudiante() {
        return estudiante;
    }

    public void setEstudiante(Estudiante estudiante) {
        this.estudiante = estudiante;
    }

    public Integer getIdExamen() {
        return idExamen;
    }

    public void setIdExamen(Integer idExamen) {
        this.idExamen = idExamen;
    }

    public Integer getIdAsignatura() {
        return idAsignatura;
    }

    public void setIdAsignatura(Integer idAsignatura) {
        this.idAsignatura = idAsignatura;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Boolean getEstadohabilitacion() {
        return estadohabilitacion;
    }

    public void setEstadohabilitacion(Boolean estadohabilitacion) {
        this.estadohabilitacion = estadohabilitacion;
    }

    public String getObservacionhabilitacion() {
        return observacionhabilitacion;
    }

    public void setObservacionhabilitacion(String observacionhabilitacion) {
        this.observacionhabilitacion = observacionhabilitacion;
    }

    public LocalDate getFecharegistro() {
        return fecharegistro;
    }

    public void setFecharegistro(LocalDate fecharegistro) {
        this.fecharegistro = fecharegistro;
    }
}