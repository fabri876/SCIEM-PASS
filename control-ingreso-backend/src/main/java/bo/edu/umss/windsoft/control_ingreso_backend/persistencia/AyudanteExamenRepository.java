package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AyudanteExamenRepository extends JpaRepository<AyudanteExamen, AyudanteExamenId> {

    List<AyudanteExamen> findByIdIdayudanteAndEstadoAsignacion(Integer idayudante, String estadoAsignacion);

    List<AyudanteExamen> findByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(
            Integer idasignatura, Integer idexamen, Integer idambiente, String estadoAsignacion);

    int countByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(
            Integer idasignatura, Integer idexamen, Integer idambiente, String estadoAsignacion);

    boolean existsByIdIdayudanteAndEstadoAsignacion(Integer idayudante, String estadoAsignacion);
}
