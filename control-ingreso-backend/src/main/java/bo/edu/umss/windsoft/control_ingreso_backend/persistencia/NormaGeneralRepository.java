// persistencia/NormaGeneralRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaGeneral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NormaGeneralRepository extends JpaRepository<NormaGeneral, Integer> {
    List<NormaGeneral> findByEstadoNormaTrue();


}