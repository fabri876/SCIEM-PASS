// persistencia/ExamenNormaGeneralRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ExamenNormaGeneral;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ExamenNormaGeneralId;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamenNormaGeneralRepository extends JpaRepository<ExamenNormaGeneral, ExamenNormaGeneralId> {

    List<ExamenNormaGeneral> findByIdIdExamen(Integer idExamen);

    List<ExamenNormaGeneral> findByIdIdExamenIn(List<Integer> idsExamen);
}