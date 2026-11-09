package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceIntento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaceIntentoRepository extends JpaRepository<FaceIntento, Integer> {

    Optional<FaceIntento> findByClientUuid(String clientUuid);

    List<FaceIntento> findByIdAsignaturaAndIdExamenOrderByCapturadoEnDesc(Integer idAsignatura, Integer idExamen);

    List<FaceIntento> findAllByOrderByCapturadoEnDesc();
    List<FaceIntento> findByIdExamenOrderByCapturadoEnDesc(Integer idExamen);
    List<FaceIntento> findByIdAmbienteOrderByCapturadoEnDesc(Integer idAmbiente);
    List<FaceIntento> findByIdExamenAndIdAmbienteOrderByCapturadoEnDesc(Integer idExamen, Integer idAmbiente);
}
