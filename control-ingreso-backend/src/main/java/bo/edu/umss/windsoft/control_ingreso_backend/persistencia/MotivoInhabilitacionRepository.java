package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;

@Repository
public interface MotivoInhabilitacionRepository extends JpaRepository<MotivoInhabilitacion, Integer> {

    Optional<MotivoInhabilitacion> findByNombremotivo(String nombremotivo);
}
