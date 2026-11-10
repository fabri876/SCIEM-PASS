package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Reubicación de un estudiante a otra aula del mismo examen ("Reubicar y
 * Autorizar" de la HU10). Tiene prioridad sobre el reparto automático por
 * apellido; si hay varias, vale la más reciente.
 */
@Entity
@Table(name = "cambioambiente")
public class CambioAmbiente {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "cambioambiente_seq")
    @SequenceGenerator(name = "cambioambiente_seq", sequenceName = "cambioambiente_idcambio_seq", allocationSize = 1)
    @Column(name = "idcambio")
    private Integer idCambio;

    // Aula nueva (el ambiente ya identifica el examen).
    @Column(name = "idambiente", nullable = false)
    private Integer idAmbiente;

    @Column(name = "idambienteorigen")
    private Integer idAmbienteOrigen;

    // idusuario del ESTUDIANTE (FK a estudiante junto con codsisestudiante).
    @Column(name = "idusuario")
    private Integer idUsuarioEstudiante;

    @Column(name = "codsisestudiante")
    private Integer codsisEstudiante;

    @Column(name = "motivocambio")
    private String motivoCambio;

    @Column(name = "fechacambio")
    private LocalDate fechaCambio;

    @Column(name = "fechahoracambio", nullable = false)
    private LocalDateTime fechaHoraCambio;

    // Docente que autorizó la reubicación.
    @Column(name = "idusuarioautoriza")
    private Integer idUsuarioAutoriza;

    @Column(name = "idintento_origen")
    private Integer idIntentoOrigen;

    public CambioAmbiente() {
    }

    public Integer getIdCambio() { return idCambio; }
    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }
    public Integer getIdAmbienteOrigen() { return idAmbienteOrigen; }
    public void setIdAmbienteOrigen(Integer idAmbienteOrigen) { this.idAmbienteOrigen = idAmbienteOrigen; }
    public Integer getIdUsuarioEstudiante() { return idUsuarioEstudiante; }
    public void setIdUsuarioEstudiante(Integer idUsuarioEstudiante) { this.idUsuarioEstudiante = idUsuarioEstudiante; }
    public Integer getCodsisEstudiante() { return codsisEstudiante; }
    public void setCodsisEstudiante(Integer codsisEstudiante) { this.codsisEstudiante = codsisEstudiante; }
    public String getMotivoCambio() { return motivoCambio; }
    public void setMotivoCambio(String motivoCambio) { this.motivoCambio = motivoCambio; }
    public LocalDate getFechaCambio() { return fechaCambio; }
    public void setFechaCambio(LocalDate fechaCambio) { this.fechaCambio = fechaCambio; }
    public LocalDateTime getFechaHoraCambio() { return fechaHoraCambio; }
    public void setFechaHoraCambio(LocalDateTime fechaHoraCambio) { this.fechaHoraCambio = fechaHoraCambio; }
    public Integer getIdUsuarioAutoriza() { return idUsuarioAutoriza; }
    public void setIdUsuarioAutoriza(Integer idUsuarioAutoriza) { this.idUsuarioAutoriza = idUsuarioAutoriza; }
    public Integer getIdIntentoOrigen() { return idIntentoOrigen; }
    public void setIdIntentoOrigen(Integer idIntentoOrigen) { this.idIntentoOrigen = idIntentoOrigen; }
}
