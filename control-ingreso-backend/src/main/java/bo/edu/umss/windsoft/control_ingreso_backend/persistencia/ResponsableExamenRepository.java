package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ResponsableExamen;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ResponsableExamenRepository extends JpaRepository<ResponsableExamen, Integer> {
    List<ResponsableExamen> findByIdexamenAndIdambienteAndEstado(Integer idexamen, Integer idambiente, String estado);
    Optional<ResponsableExamen> findByIdusuarioAndIdexamenAndIdambiente(Integer idusuario, Integer idexamen, Integer idambiente);
    List<ResponsableExamen> findByIdexamenAndEstado(Integer idexamen, String estado);
}
