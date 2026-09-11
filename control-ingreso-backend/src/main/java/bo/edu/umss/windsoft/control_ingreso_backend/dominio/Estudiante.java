package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "estudiante")
public class Estudiante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estudiante")
    private Integer idEstudiante;

    @Column(name = "ci")
    private String ci;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "apellido")
    private String apellido;

    @Column(name = "cod_sis_estudiante")
    private Integer codSisEstudiante;

    @Column(name = "id_usuario")
    private Integer idUsuario;

    public Estudiante() {
    }

    public Estudiante(Integer idEstudiante, String ci, String nombre, String apellido, Integer codSisEstudiante, Integer idUsuario) {
        this.idEstudiante = idEstudiante;
        this.ci = ci;
        this.nombre = nombre;
        this.apellido = apellido;
        this.codSisEstudiante = codSisEstudiante;
        this.idUsuario = idUsuario;
    }

    public Integer getIdEstudiante() {
        return idEstudiante;
    }

    public void setIdEstudiante(Integer idEstudiante) {
        this.idEstudiante = idEstudiante;
    }

    public String getCi() {
        return ci;
    }

    public void setCi(String ci) {
        this.ci = ci;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public Integer getCodSisEstudiante() {
        return codSisEstudiante;
    }

    public void setCodSisEstudiante(Integer codSisEstudiante) {
        this.codSisEstudiante = codSisEstudiante;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }
}
