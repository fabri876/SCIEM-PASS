package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

/**
 * OJO (sep-2026): la tabla "examen_ambiente" (junction table) ya no existe en
 * el rediseño de base de datos. Lo más parecido ahora es "ambiente", que trae
 * idexamen/idasignatura directo en vez de una tabla de enlace aparte. Este
 * mapeo es lo mínimo para que el backend compile y arranque — la lógica de
 * ExamenService que arma un ExamenAmbiente por cada idAmbiente elegido sigue
 * asumiendo el modelo viejo (un idAmbiente que ya existe) y probablemente
 * falle en tiempo de ejecución (violación de PK) contra la tabla real, que
 * ahora es la entidad primaria del ambiente, no un enlace. Eso hay que
 * rediseñarlo con quien tenga esa HU.
 */
@Entity
@Table(name = "ambiente")
public class ExamenAmbiente {

    @Id
    @Column(name = "idambiente")
    private Integer idAmbiente;

    @Column(name = "idexamen")
    private Integer idExamen;

    @Column(name = "idasignatura")
    private Integer idAsignatura;

    @Column(name = "nombreambiente")
    private String nombreAmbiente;

    @Column(name = "ubicacionambiente")
    private String ubicacionAmbiente;

    @Column(name = "capacidadambiente")
    private Integer capacidadAmbiente;

    public ExamenAmbiente() {
    }

    public Integer getIdAmbiente() {
        return idAmbiente;
    }

    public void setIdAmbiente(Integer idAmbiente) {
        this.idAmbiente = idAmbiente;
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

    public String getNombreAmbiente() {
        return nombreAmbiente;
    }

    public void setNombreAmbiente(String nombreAmbiente) {
        this.nombreAmbiente = nombreAmbiente;
    }

    public String getUbicacionAmbiente() {
        return ubicacionAmbiente;
    }

    public void setUbicacionAmbiente(String ubicacionAmbiente) {
        this.ubicacionAmbiente = ubicacionAmbiente;
    }

    public Integer getCapacidadAmbiente() {
        return capacidadAmbiente;
    }

    public void setCapacidadAmbiente(Integer capacidadAmbiente) {
        this.capacidadAmbiente = capacidadAmbiente;
    }
}
