// persistencia/TipoExamenRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoExamen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TipoExamenRepository extends JpaRepository<TipoExamen, Integer> {
    List<TipoExamen> findByEstadoTipoExamenTrue();
}