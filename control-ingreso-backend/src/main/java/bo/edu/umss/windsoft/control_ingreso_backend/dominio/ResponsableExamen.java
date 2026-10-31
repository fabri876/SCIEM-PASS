package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "responsable_examen", uniqueConstraints = @UniqueConstraint(
        name = "uq_responsable_examen", columnNames = {"idusuario", "idexamen", "idambiente"}))
public class ResponsableExamen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idresponsable")
    private Integer idresponsable;
    @Column(name = "idusuario", nullable = false) private Integer idusuario;
    @Column(name = "idasignatura", nullable = false) private Integer idasignatura;
    @Column(name = "idexamen", nullable = false) private Integer idexamen;
    @Column(name = "idambiente", nullable = false) private Integer idambiente;
    @Column(name = "rol", nullable = false) private String rol;
    @Column(name = "apellido_desde") private String apellidoDesde;
    @Column(name = "apellido_hasta") private String apellidoHasta;
    @Column(name = "estado", nullable = false) private String estado = "ACTIVO";

    public Integer getIdresponsable() { return idresponsable; }
    public Integer getIdusuario() { return idusuario; }
    public void setIdusuario(Integer v) { idusuario = v; }
    public Integer getIdasignatura() { return idasignatura; }
    public void setIdasignatura(Integer v) { idasignatura = v; }
    public Integer getIdexamen() { return idexamen; }
    public void setIdexamen(Integer v) { idexamen = v; }
    public Integer getIdambiente() { return idambiente; }
    public void setIdambiente(Integer v) { idambiente = v; }
    public String getRol() { return rol; }
    public void setRol(String v) { rol = v; }
    public String getApellidoDesde() { return apellidoDesde; }
    public void setApellidoDesde(String v) { apellidoDesde = v; }
    public String getApellidoHasta() { return apellidoHasta; }
    public void setApellidoHasta(String v) { apellidoHasta = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { estado = v; }
}
