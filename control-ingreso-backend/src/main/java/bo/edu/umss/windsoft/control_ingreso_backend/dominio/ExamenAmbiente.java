package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "examen_ambiente")
public class ExamenAmbiente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_examen_ambiente")
    private Integer idExamenAmbiente;

    @Column(name = "id_examen", nullable = false)
    private Integer idExamen;

    @Column(name = "id_ambiente", nullable = false)
    private Integer idAmbiente;

    public ExamenAmbiente() {
    }

    public Integer getIdExamenAmbiente() {
        return idExamenAmbiente;
    }

    public void setIdExamenAmbiente(Integer idExamenAmbiente) {
        this.idExamenAmbiente = idExamenAmbiente;
    }

    public Integer getIdExamen() {
        return idExamen;
    }

    public void setIdExamen(Integer idExamen) {
        this.idExamen = idExamen;
    }

    public Integer getIdAmbiente() {
        return idAmbiente;
    }

    public void setIdAmbiente(Integer idAmbiente) {
        this.idAmbiente = idAmbiente;
    }
}