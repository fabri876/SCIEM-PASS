package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Incidencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IncidenciaRepository extends JpaRepository<Incidencia, Integer> {

    Optional<Incidencia> findByClaveSolicitud(UUID claveSolicitud);

    List<Incidencia> findByIdAmbienteInOrderByFechaHoraDesc(Collection<Integer> idsAmbiente);

    List<Incidencia> findAllByOrderByFechaHoraDesc();
}
