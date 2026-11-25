package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface ExamenRepository extends JpaRepository<Examen, Integer> {
    @Query("SELECT e FROM Examen e WHERE e.idExamen IN :ids AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Examen> findAllById(@Param("ids") Iterable<Integer> ids);

    @Query("SELECT e FROM Examen e WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Examen> findAll();
    @Query("SELECT e FROM Examen e WHERE e.idExamen=:id AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    java.util.Optional<Examen> findById(@Param("id") Integer id);

    @Query("SELECT e FROM Examen e WHERE e.idAsignatura=:idAsignatura AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Examen> findByIdAsignatura(Integer idAsignatura);

    @Query("SELECT e FROM Examen e WHERE e.idUsuario=:idUsuario AND e.codsisDocente=:codsisDocente AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Examen> findByIdUsuarioAndCodsisDocente(Integer idUsuario, Integer codsisDocente);

    /** HU06: exámenes de los que el docente es responsable. */
    @Query("SELECT e FROM Examen e WHERE e.idUsuario=:idUsuario AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Examen> findByIdUsuario(Integer idUsuario);

    @Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM Examen e "
            + "WHERE e.idGrupo = :idGrupo AND e.estadoExamen = true AND e.cancelado = false "
            + "AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    boolean existsActivoNoCanceladoByIdGrupo(@Param("idGrupo") Integer idGrupo);

    /** Tipos de examen ya registrados por un docente en una asignatura. */
    @Query("SELECT DISTINCT e.idTipoExamen FROM Examen e " +
           "WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') AND e.cancelado = false AND e.idAsignatura = :idAsignatura AND e.codsisDocente = :codsisDocente")
    List<Integer> findTiposUsadosByAsignaturaAndDocente(
            @Param("idAsignatura") Integer idAsignatura,
            @Param("codsisDocente") Integer codsisDocente);

    /** Tipos usados dentro de un grupo específico. */
    @Query("SELECT DISTINCT e.idTipoExamen FROM Examen e " +
           "WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') " +
           "AND e.cancelado = false AND e.idAsignatura = :idAsignatura AND e.codsisDocente = :codsisDocente " +
           "AND e.idGrupo = :idGrupo")
    List<Integer> findTiposUsadosByGrupo(
            @Param("idAsignatura") Integer idAsignatura,
            @Param("codsisDocente") Integer codsisDocente,
            @Param("idGrupo") Integer idGrupo);
}
