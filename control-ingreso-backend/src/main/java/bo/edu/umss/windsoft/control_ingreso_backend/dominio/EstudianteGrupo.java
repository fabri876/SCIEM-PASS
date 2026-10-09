package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "estudiantegrupo")
public class EstudianteGrupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idestudiantegrupo")
    private Integer idEstudianteGrupo;

    @Column(name = "idusuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "codsisestudiante", nullable = false)
    private Integer codSisEstudiante;

    @Column(name = "idgrupo", nullable = false)
    private Integer idGrupo;

    // PostgreSQL deriva esta columna del grupo y exige UNIQUE (idusuario, idasignatura).
    @Column(name = "idasignatura", nullable = false, insertable = false, updatable = false)
    private Integer idAsignatura;

    public Integer getIdAsignatura() { return idAsignatura; }

    @Column(name = "fechainscripcion")
    private LocalDateTime fechaInscripcion;

    public EstudianteGrupo() {
        this.fechaInscripcion = LocalDateTime.now();
    }

    public EstudianteGrupo(Integer idUsuario, Integer codSisEstudiante, Integer idGrupo) {
        this.idUsuario = idUsuario;
        this.codSisEstudiante = codSisEstudiante;
        this.idGrupo = idGrupo;
        this.fechaInscripcion = LocalDateTime.now();
    }

    public Integer getIdEstudianteGrupo() { return idEstudianteGrupo; }
    public void setIdEstudianteGrupo(Integer idEstudianteGrupo) { this.idEstudianteGrupo = idEstudianteGrupo; }

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }

    public Integer getCodSisEstudiante() { return codSisEstudiante; }
    public void setCodSisEstudiante(Integer codSisEstudiante) { this.codSisEstudiante = codSisEstudiante; }

    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }

    public LocalDateTime getFechaInscripcion() { return fechaInscripcion; }
    public void setFechaInscripcion(LocalDateTime fechaInscripcion) { this.fechaInscripcion = fechaInscripcion; }
}
