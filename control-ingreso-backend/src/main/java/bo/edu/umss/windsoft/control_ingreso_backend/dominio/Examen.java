package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "examen")
public class Examen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_examen")
    private Integer idExamen;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "fecha_examen")
    private LocalDateTime fecha;

    public Examen() {
    }

    public Examen(Integer idExamen, String nombre, LocalDateTime fecha) {
        this.idExamen = idExamen;
        this.nombre = nombre;
        this.fecha = fecha;
    }

    public Examen(String nombre, LocalDateTime fecha) {
        this.nombre = nombre;
        this.fecha = fecha;
    }

    public Integer getIdExamen() {
        return idExamen;
    }

    public void setIdExamen(Integer idExamen) {
        this.idExamen = idExamen;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
}
