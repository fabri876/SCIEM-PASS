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

    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante e JOIN FETCH h.motivo m WHERE h.idhabilitacion = :idHabilitacion")
    Optional<Habilitacion> findByIdConDetalles(@Param("idHabilitacion") Integer idHabilitacion);

    @Query("SELECT h FROM Habilitacion h LEFT JOIN FETCH h.estudiante e LEFT JOIN FETCH h.motivo m")
    List<Habilitacion> findAllConDetalles();
}
