package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AmbienteRepository extends JpaRepository<Ambiente, Integer> {

    List<Ambiente> findByIdExamen(Integer idExamen);

    List<Ambiente> findByIdAsignatura(Integer idAsignatura);
}