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
    @Query("SELECT h FROM Habilitacion h LEFT JOIN h.estudiante e "
            + "WHERE COALESCE(e.idusuario, h.idUsuario) = :usuario AND h.estadohabilitacion = true")
    List<Habilitacion> vigentesPorEstudiante(@Param("usuario") Integer usuario);

    @Query("SELECT DISTINCT COALESCE(e.idusuario, h.idUsuario) FROM Habilitacion h LEFT JOIN h.estudiante e "
            + "WHERE h.idExamen = :examen AND h.estadohabilitacion = true "
            + "AND COALESCE(e.idusuario, h.idUsuario) IS NOT NULL ORDER BY COALESCE(e.idusuario, h.idUsuario)")
    List<Integer> cuentasConHabilitacionVigente(@Param("examen") Integer examen);

    @Query("SELECT h FROM Habilitacion h LEFT JOIN h.estudiante e WHERE h.idExamen = :examen "
            + "AND COALESCE(e.idusuario, h.idUsuario) = :usuario AND h.estadohabilitacion = true")
    List<Habilitacion> vigentesPorExamenYEstudiante(@Param("examen") Integer examen, @Param("usuario") Integer usuario);

    @Query("SELECT COALESCE(e.idusuario, h.idUsuario) FROM Habilitacion h LEFT JOIN h.estudiante e "
            + "WHERE h.idhabilitacion = :habilitacion")
    Optional<Integer> idCuentaDeHabilitacion(@Param("habilitacion") Integer habilitacion);


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

    /** HU10: habilitados de un examen con su estudiante (para el reparto por aulas). */
    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante " +
           "WHERE h.idAsignatura = :idAsignatura AND h.idExamen = :idExamen AND h.estadohabilitacion = true")
    List<Habilitacion> findHabilitadosConEstudiante(@Param("idAsignatura") Integer idAsignatura,
                                                    @Param("idExamen") Integer idExamen);
    long countByIdAsignaturaAndIdExamenAndEstadohabilitacionFalse(Integer idAsignatura, Integer idExamen);
    long countByIdAsignaturaAndIdExamen(Integer idAsignatura, Integer idExamen);

    Optional<Habilitacion> findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(Integer idAsignatura, Integer idExamen, Integer codsisestudiante);
    Optional<Habilitacion> findByIdAsignaturaAndIdExamenAndIdUsuario(Integer idAsignatura, Integer idExamen, Integer idUsuario);

    boolean existsByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(Integer idAsignatura, Integer idExamen, Integer codsisestudiante);

    @Query("SELECT CASE WHEN COUNT(h) > 0 THEN true ELSE false END FROM Habilitacion h "
            + "WHERE h.observacionhabilitacion IS NOT NULL "
            + "AND LOWER(TRIM(h.observacionhabilitacion)) = LOWER(TRIM(:nombreMotivo))")
    boolean existsByNombreMotivoUsado(@Param("nombreMotivo") String nombreMotivo);

    @Query("SELECT h FROM Habilitacion h JOIN FETCH h.estudiante " +
           "WHERE h.idAsignatura = :idAsignatura AND h.idExamen = :idExamen")
    List<Habilitacion> findHabilitacionesConEstudiante(@Param("idAsignatura") Integer idAsignatura,
                                                        @Param("idExamen") Integer idExamen);

    @Query("SELECT h.idAsignatura, h.estadohabilitacion, COUNT(h) FROM Habilitacion h WHERE h.idAsignatura IS NOT NULL GROUP BY h.idAsignatura, h.estadohabilitacion")
    List<Object[]> countHabilitacionesGroupedByAsignatura();
}

