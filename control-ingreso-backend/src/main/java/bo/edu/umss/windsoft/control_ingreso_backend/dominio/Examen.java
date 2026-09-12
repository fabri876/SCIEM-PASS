package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "examenes")
public class Examen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_examen")
    private Long idExamen;

    @Column(name = "asignatura", nullable = false)
    private String asignatura;

    @Column(name = "fecha_hora_inicio", nullable = false)
    private LocalDateTime fechaHoraInicio;

    @Column(name = "duracion_minutos", nullable = false)
    private Integer duracionMinutos;

    @Column(name = "ambiente", nullable = false)
    private String ambiente;

    @Column(name = "normas", columnDefinition = "TEXT")
    private String normas;

    @Column(name = "estado", nullable = false)
    private String estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_docente", nullable = false)
    private Usuario docente;

    public Examen() {
    }

    public Examen(String asignatura, LocalDateTime fechaHoraInicio, Integer duracionMinutos,
                  String ambiente, String normas, String estado, Usuario docente) {
        this.asignatura = asignatura;
        this.fechaHoraInicio = fechaHoraInicio;
        this.duracionMinutos = duracionMinutos;
        this.ambiente = ambiente;
        this.normas = normas;
        this.estado = estado;
        this.docente = docente;
    }

    public Examen(Long idExamen, String asignatura, LocalDateTime fechaHoraInicio, Integer duracionMinutos,
                  String ambiente, String normas, String estado, Usuario docente) {
        this.idExamen = idExamen;
        this.asignatura = asignatura;
        this.fechaHoraInicio = fechaHoraInicio;
        this.duracionMinutos = duracionMinutos;
        this.ambiente = ambiente;
        this.normas = normas;
        this.estado = estado;
        this.docente = docente;
    }

    public Long getIdExamen() {
        return idExamen;
    }

    public void setIdExamen(Long idExamen) {
        this.idExamen = idExamen;
    }

    public String getAsignatura() {
        return asignatura;
    }

    public void setAsignatura(String asignatura) {
        this.asignatura = asignatura;
    }

    public LocalDateTime getFechaHoraInicio() {
        return fechaHoraInicio;
    }

    public void setFechaHoraInicio(LocalDateTime fechaHoraInicio) {
        this.fechaHoraInicio = fechaHoraInicio;
    }

    public Integer getDuracionMinutos() {
        return duracionMinutos;
    }

    public void setDuracionMinutos(Integer duracionMinutos) {
        this.duracionMinutos = duracionMinutos;
    }

    public String getAmbiente() {
        return ambiente;
    }

    public void setAmbiente(String ambiente) {
        this.ambiente = ambiente;
    }

    public String getNormas() {
        return normas;
    }

    public void setNormas(String normas) {
        this.normas = normas;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public Usuario getDocente() {
        return docente;
    }

    public void setDocente(Usuario docente) {
        this.docente = docente;
    }
}
