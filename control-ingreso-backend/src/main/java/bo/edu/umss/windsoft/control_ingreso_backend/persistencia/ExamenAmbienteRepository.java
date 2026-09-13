package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ExamenAmbiente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamenAmbienteRepository extends JpaRepository<ExamenAmbiente, Integer> {

    List<ExamenAmbiente> findByIdExamen(Integer idExamen);
}