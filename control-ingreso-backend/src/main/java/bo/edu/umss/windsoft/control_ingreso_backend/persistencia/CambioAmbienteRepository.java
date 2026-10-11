package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.CambioAmbiente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CambioAmbienteRepository extends JpaRepository<CambioAmbiente, Integer> {

    /** Reubicaciones de las aulas de un examen, de la más antigua a la más reciente. */
    List<CambioAmbiente> findByIdAmbienteInOrderByFechaHoraCambioAscIdCambioAsc(Collection<Integer> idsAmbiente);
}
