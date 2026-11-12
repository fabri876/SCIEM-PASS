package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaceEnrollmentRepository extends JpaRepository<FaceEnrollment, Integer> {

    Optional<FaceEnrollment> findByIdUsuarioAndEstado(Integer idUsuario, String estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from FaceEnrollment e where e.idUsuario = :idUsuario")
    Optional<FaceEnrollment> findByIdUsuarioForUpdate(@Param("idUsuario") Integer idUsuario);

    List<FaceEnrollment> findByIdUsuarioOrderByFechaRegistroDesc(Integer idUsuario);

    List<FaceEnrollment> findByIdUsuarioInAndEstado(Iterable<Integer> idsUsuario, String estado);

    List<FaceEnrollment> findAllByOrderByFechaRegistroDesc();

    List<FaceEnrollment> findByEstadoOrderByFechaRegistroDesc(String estado);
}
