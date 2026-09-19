// persistencia/DocenteAsignaturaRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignaturaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List; 

@Repository
public interface DocenteAsignaturaRepository extends JpaRepository<DocenteAsignatura, DocenteAsignaturaId> {
    List<DocenteAsignatura> findByIdIdusuarioAndIdCodsisdocente(Integer idusuario, Integer codsisdocente);
}