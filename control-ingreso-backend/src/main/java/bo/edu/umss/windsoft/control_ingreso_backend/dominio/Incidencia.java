package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Incidencia ocurrida durante un examen (HU06). No se edita ni se borra:
 * solo avanza de estado (ABIERTA → EN_REVISION → CERRADA).
 *
 * idambiente ya identifica examen + aula, por eso no hay idexamen aquí.
 */
@Entity
@Table(name = "incidencia")
public class Incidencia {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "incidencia_seq")
    @SequenceGenerator(name = "incidencia_seq", sequenceName = "incidencia_idincidencia_seq", allocationSize = 1)
    @Column(name = "idincidencia")
    private Integer idIncidencia;

    // La genera el formulario: si llega dos veces la misma, es un doble clic.
    @Column(name = "clavesolicitud", nullable = false, unique = true)
    private UUID claveSolicitud;

    @Column(name = "idambiente", nullable = false)
    private Integer idAmbiente;

    @Column(name = "idusuarioreporta", nullable = false)
    private Integer idUsuarioReporta;

    @Column(name = "est_idusuario")
    private Integer idUsuarioEstudiante;

    @Column(name = "codsisestudiante")
    private Integer codsisEstudiante;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipoincidencia", nullable = false)
    private TipoIncidencia tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "severidad", nullable = false)
    private SeveridadIncidencia severidad;

    @Column(name = "descripcion", nullable = false)
    private String descripcion;

    @Column(name = "evidenciaurl")
    private String evidenciaUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "estadoincidencia", nullable = false)
    private EstadoIncidencia estado = EstadoIncidencia.ABIERTA;

    @Column(name = "fechahora", nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "fecharevision")
    private LocalDateTime fechaRevision;

    @Column(name = "idusuariorevisa")
    private Integer idUsuarioRevisa;

    @Column(name = "resolucion")
    private String resolucion;

    @Column(name = "fecharesolucion")
    private LocalDateTime fechaResolucion;

    @Column(name = "idusuarioresuelve")
    private Integer idUsuarioResuelve;

    public Incidencia() {
    }

    /** Código visible para el usuario, por ejemplo INC-014. */
    public String getCodigo() {
        return idIncidencia == null ? null : String.format("INC-%03d", idIncidencia);
    }

    public Integer getIdIncidencia() { return idIncidencia; }
    public UUID getClaveSolicitud() { return claveSolicitud; }
    public void setClaveSolicitud(UUID claveSolicitud) { this.claveSolicitud = claveSolicitud; }
    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }
    public Integer getIdUsuarioReporta() { return idUsuarioReporta; }
    public void setIdUsuarioReporta(Integer idUsuarioReporta) { this.idUsuarioReporta = idUsuarioReporta; }
    public Integer getIdUsuarioEstudiante() { return idUsuarioEstudiante; }
    public void setIdUsuarioEstudiante(Integer idUsuarioEstudiante) { this.idUsuarioEstudiante = idUsuarioEstudiante; }
    public Integer getCodsisEstudiante() { return codsisEstudiante; }
    public void setCodsisEstudiante(Integer codsisEstudiante) { this.codsisEstudiante = codsisEstudiante; }
    public TipoIncidencia getTipo() { return tipo; }
    public void setTipo(TipoIncidencia tipo) { this.tipo = tipo; }
    public SeveridadIncidencia getSeveridad() { return severidad; }
    public void setSeveridad(SeveridadIncidencia severidad) { this.severidad = severidad; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getEvidenciaUrl() { return evidenciaUrl; }
    public void setEvidenciaUrl(String evidenciaUrl) { this.evidenciaUrl = evidenciaUrl; }
    public EstadoIncidencia getEstado() { return estado; }
    public void setEstado(EstadoIncidencia estado) { this.estado = estado; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public LocalDateTime getFechaRevision() { return fechaRevision; }
    public void setFechaRevision(LocalDateTime fechaRevision) { this.fechaRevision = fechaRevision; }
    public Integer getIdUsuarioRevisa() { return idUsuarioRevisa; }
    public void setIdUsuarioRevisa(Integer idUsuarioRevisa) { this.idUsuarioRevisa = idUsuarioRevisa; }
    public String getResolucion() { return resolucion; }
    public void setResolucion(String resolucion) { this.resolucion = resolucion; }
    public LocalDateTime getFechaResolucion() { return fechaResolucion; }
    public void setFechaResolucion(LocalDateTime fechaResolucion) { this.fechaResolucion = fechaResolucion; }
    public Integer getIdUsuarioResuelve() { return idUsuarioResuelve; }
    public void setIdUsuarioResuelve(Integer idUsuarioResuelve) { this.idUsuarioResuelve = idUsuarioResuelve; }
}
