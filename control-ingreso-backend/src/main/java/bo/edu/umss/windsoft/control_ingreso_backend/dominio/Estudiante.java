package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Mapea la tabla "estudiante" del rediseño de base de datos de sep-2026.
 * Ya no tiene ci/nombre/apellido/foto/QR propios (esos datos personales
 * ahora solo viven en "usuario"; el código QR se generará más adelante,
 * por examen, en otra HU — no en el registro del estudiante).
 */
@Entity
@Table(name = "estudiante")
public class Estudiante {

    // PK real de la tabla (usada también por Habilitacion.estudiante vía
    // @JoinColumn(name = "codsisestudiante")): es el código SIS del estudiante,
    // no un id autogenerado.
    @Id
    @Column(name = "codsisestudiante")
    private Integer codsisestudiante;

    // NOT NULL en la base nueva. Para estudiantes registrados por el
    // administrador (HU16) es el id real del usuario. Para los registrados
    // por el flujo genérico de RegistroUsuarioService, el constructor de 1
    // parámetro pone el mismo valor acá y en codsisestudiante (mismo patrón
    // que admin/docente/ayudante), así que ese código no se rompe.
    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    public Estudiante() {
    }

    public Estudiante(Integer idusuario) {
        this.codsisestudiante = idusuario;
        this.idUsuario = idusuario;
    }

    public Estudiante(Integer codsisestudiante, Integer idUsuario) {
        this.codsisestudiante = codsisestudiante;
        this.idUsuario = idUsuario;
    }

    public Integer getCodsisestudiante() {
        return codsisestudiante;
    }

    public void setCodsisestudiante(Integer codsisestudiante) {
        this.codsisestudiante = codsisestudiante;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }
}
