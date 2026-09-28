// persistencia/AsignaturaRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AsignaturaRepository extends JpaRepository<Asignatura, Integer> {
}