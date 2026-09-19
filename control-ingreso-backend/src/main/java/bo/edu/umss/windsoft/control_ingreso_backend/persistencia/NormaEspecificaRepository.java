// persistencia/NormaEspecificaRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaEspecifica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NormaEspecificaRepository extends JpaRepository<NormaEspecifica, Integer> {
    List<NormaEspecifica> findByIdAsignaturaAndIdExamen(Integer idAsignatura, Integer idExamen);
}