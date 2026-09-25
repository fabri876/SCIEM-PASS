package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamenRepository extends JpaRepository<Examen, Integer> {

    List<Examen> findByIdUsuarioAndCodsisDocente(Integer idUsuario, Integer codsisDocente);

    /** Tipos de examen ya registrados por un docente en una asignatura. */
    @Query("SELECT DISTINCT e.idTipoExamen FROM Examen e " +
           "WHERE e.idAsignatura = :idAsignatura AND e.codsisDocente = :codsisDocente")
    List<Integer> findTiposUsadosByAsignaturaAndDocente(
            @Param("idAsignatura") Integer idAsignatura,
            @Param("codsisDocente") Integer codsisDocente);
}