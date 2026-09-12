package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;

@Repository
public interface HabilitacionRepository extends JpaRepository<Habilitacion, Integer> {

    List<Habilitacion> findByEstudianteCodsisestudiante(Integer codsisestudiante);

    Optional<Habilitacion> findTopByEstudianteCodsisestudianteOrderByFecharegistroDesc(Integer codsisestudiante);

    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante e JOIN FETCH e.usuario u LEFT JOIN FETCH h.motivo m WHERE h.idhabilitacion = :idhabilitacion")
    Optional<Habilitacion> findByIdConDetalles(@Param("idhabilitacion") Integer idhabilitacion);

    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante e JOIN FETCH e.usuario u LEFT JOIN FETCH h.motivo m ORDER BY u.apellidousuario ASC, u.nombreusuario ASC")
    List<Habilitacion> findAllConDetalles();
}
