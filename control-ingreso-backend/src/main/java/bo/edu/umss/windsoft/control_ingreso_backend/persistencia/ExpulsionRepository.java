package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Expulsion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExpulsionRepository extends JpaRepository<Expulsion, Integer> {

    Optional<Expulsion> findFirstByIdIncidencia(Integer idIncidencia);
}
