package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoExpulsion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Expulsion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpulsionRepository extends JpaRepository<Expulsion, Integer> {

    Optional<Expulsion> findFirstByIdIncidencia(Integer idIncidencia);

    /** HU14: expulsiones de un ingreso dado. */
    List<Expulsion> findByIdIngreso(Integer idIngreso);

    /** HU14: expulsiones pendientes de un ingreso dado. */
    Optional<Expulsion> findByIdIngresoAndEstado(Integer idIngreso, EstadoExpulsion estado);

    /** HU14: existe una expulsión pendiente para este ingreso. */
    boolean existsByIdIngresoAndEstado(Integer idIngreso, EstadoExpulsion estado);

    /** HU14: todas las expulsiones con un estado dado. */
    List<Expulsion> findByEstado(EstadoExpulsion estado);

    /** HU14: expulsiones de un examen (join con ingreso). */
    @Query(value = """
            SELECT e.* FROM expulsion e
            JOIN ingreso i ON i.idingreso = e.idingreso
            WHERE i.idexamen = :idExamen
            ORDER BY e.horaexpulsion DESC
            """, nativeQuery = true)
    List<Expulsion> findByIdExamen(@Param("idExamen") Integer idExamen);

    /** HU14: expulsiones pendientes de un examen (para el badge del docente). */
    @Query(value = """
            SELECT COUNT(*) FROM expulsion e
            JOIN ingreso i ON i.idingreso = e.idingreso
            WHERE i.idexamen = :idExamen
              AND e.estado = 'PENDIENTE'
            """, nativeQuery = true)
    long contarPendientesPorExamen(@Param("idExamen") Integer idExamen);
}
