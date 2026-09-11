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

    boolean existsByEstudianteIdEstudianteAndExamenIdExamen(Integer idEstudiante, Integer idExamen);

    Optional<Habilitacion> findByEstudianteIdEstudianteAndExamenIdExamen(Integer idEstudiante, Integer idExamen);

    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante e JOIN FETCH h.examen x LEFT JOIN FETCH h.motivo m WHERE x.idExamen = :idExamen ORDER BY e.apellido ASC, e.nombre ASC")
    List<Habilitacion> findByExamenIdExamenConDetalles(@Param("idExamen") Integer idExamen);

    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante e JOIN FETCH h.examen x LEFT JOIN FETCH h.motivo m WHERE h.idHabilitacion = :idHabilitacion")
    Optional<Habilitacion> findByIdConDetalles(@Param("idHabilitacion") Integer idHabilitacion);
}
