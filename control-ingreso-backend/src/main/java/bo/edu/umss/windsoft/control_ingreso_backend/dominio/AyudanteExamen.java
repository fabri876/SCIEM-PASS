package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ayudante_examen")
public class AyudanteExamen {

    @EmbeddedId
    private AyudanteExamenId id;

    @Column(name = "fecha_asignacion", nullable = false)
    private OffsetDateTime fechaAsignacion = OffsetDateTime.now();

    @Column(name = "estado_asignacion", nullable = false, length = 10)
    private String estadoAsignacion = "ACTIVO";

    @Column(name = "modo_asignacion", nullable = false, length = 15)
    private String modoAsignacion = "SUBDIVISION";

    @Column(name = "apellido_desde", length = 1)
    private String apellidoDesde;

    @Column(name = "apellido_hasta", length = 1)
    private String apellidoHasta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idayudante", insertable = false, updatable = false)
    private Usuario ayudante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idasignatura", insertable = false, updatable = false)
    private Asignatura asignatura;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "idasignatura", referencedColumnName = "idasignatura", insertable = false, updatable = false),
        @JoinColumn(name = "idexamen", referencedColumnName = "idexamen", insertable = false, updatable = false)
    })
    private Examen examen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idambiente", insertable = false, updatable = false)
    private Ambiente ambiente;

    public AyudanteExamen() {
    }

    public AyudanteExamen(AyudanteExamenId id, String estadoAsignacion) {
        this.id = id;
        this.estadoAsignacion = estadoAsignacion;
    }

    public AyudanteExamenId getId() {
        return id;
    }

    public void setId(AyudanteExamenId id) {
        this.id = id;
    }

    public OffsetDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }

    public void setFechaAsignacion(OffsetDateTime fechaAsignacion) {
        this.fechaAsignacion = fechaAsignacion;
    }

    public String getEstadoAsignacion() {
        return estadoAsignacion;
    }

    public void setEstadoAsignacion(String estadoAsignacion) {
        this.estadoAsignacion = estadoAsignacion;
    }

    public String getModoAsignacion() {
        return modoAsignacion;
    }

    public void setModoAsignacion(String modoAsignacion) {
        this.modoAsignacion = modoAsignacion;
    }

    public String getApellidoDesde() {
        return apellidoDesde;
    }

    public void setApellidoDesde(String apellidoDesde) {
        this.apellidoDesde = apellidoDesde;
    }

    public String getApellidoHasta() {
        return apellidoHasta;
    }

    public void setApellidoHasta(String apellidoHasta) {
        this.apellidoHasta = apellidoHasta;
    }

    public Usuario getAyudante() {
        return ayudante;
    }

    public void setAyudante(Usuario ayudante) {
        this.ayudante = ayudante;
    }

    public Asignatura getAsignatura() {
        return asignatura;
    }

    public void setAsignatura(Asignatura asignatura) {
        this.asignatura = asignatura;
    }

    public Examen getExamen() {
        return examen;
    }

    public void setExamen(Examen examen) {
        this.examen = examen;
    }

    public Ambiente getAmbiente() {
        return ambiente;
    }

    public void setAmbiente(Ambiente ambiente) {
        this.ambiente = ambiente;
    }
}
