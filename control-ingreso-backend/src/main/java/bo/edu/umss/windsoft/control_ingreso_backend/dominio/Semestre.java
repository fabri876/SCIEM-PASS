package bo.edu.umss.windsoft.control_ingreso_backend.dominio;
import jakarta.persistence.*;
@Entity @Table(name="semestre")
public class Semestre {
 @Id @Column(name="idsemestre") private Integer id;
 @Column(name="estado") private String estado;
 public Integer getId(){return id;} public String getEstado(){return estado;}
}
