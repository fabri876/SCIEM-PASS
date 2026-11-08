package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaceEnrollmentRepository extends JpaRepository<FaceEnrollment, Integer> {

    Optional<FaceEnrollment> findByIdUsuarioAndEstado(Integer idUsuario, String estado);

    List<FaceEnrollment> findByIdUsuarioOrderByFechaRegistroDesc(Integer idUsuario);

    List<FaceEnrollment> findByIdUsuarioInAndEstado(Iterable<Integer> idsUsuario, String estado);

    List<FaceEnrollment> findAllByOrderByFechaRegistroDesc();

    List<FaceEnrollment> findByEstadoOrderByFechaRegistroDesc(String estado);
}
