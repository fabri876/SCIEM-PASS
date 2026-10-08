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

    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante e WHERE h.idhabilitacion = :idHabilitacion")
    Optional<Habilitacion> findByIdConDetalles(@Param("idHabilitacion") Integer idHabilitacion);

    @Query("SELECT h FROM Habilitacion h LEFT JOIN FETCH h.estudiante e")
    List<Habilitacion> findAllConDetalles();

    @Query("SELECT h FROM Habilitacion h LEFT JOIN FETCH h.estudiante e WHERE h.idAsignatura = :idAsignatura")
    List<Habilitacion> findByIdAsignaturaConDetalles(@Param("idAsignatura") Integer idAsignatura);

    long countByIdAsignaturaAndEstadohabilitacionTrue(Integer idAsignatura);
    long countByIdAsignaturaAndEstadohabilitacionFalse(Integer idAsignatura);
    long countByIdAsignatura(Integer idAsignatura);

    long countByIdAsignaturaAndIdExamenAndEstadohabilitacionTrue(Integer idAsignatura, Integer idExamen);
    long countByIdAsignaturaAndIdExamenAndEstadohabilitacionFalse(Integer idAsignatura, Integer idExamen);
    long countByIdAsignaturaAndIdExamen(Integer idAsignatura, Integer idExamen);

    Optional<Habilitacion> findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(Integer idAsignatura, Integer idExamen, Integer codsisestudiante);
    Optional<Habilitacion> findByIdAsignaturaAndIdExamenAndIdUsuario(Integer idAsignatura, Integer idExamen, Integer idUsuario);

    @Query("SELECT h.idAsignatura, h.estadohabilitacion, COUNT(h) FROM Habilitacion h WHERE h.idAsignatura IS NOT NULL GROUP BY h.idAsignatura, h.estadohabilitacion")
    List<Object[]> countHabilitacionesGroupedByAsignatura();
}

