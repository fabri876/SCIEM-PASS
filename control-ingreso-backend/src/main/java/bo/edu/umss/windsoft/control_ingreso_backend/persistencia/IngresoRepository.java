package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface IngresoRepository extends JpaRepository<Ingreso, Integer> {

    Optional<Ingreso> findByCodsisEstudianteAndIdAsignaturaAndIdExamen(Integer codsisEstudiante,
                                                                       Integer idAsignatura,
                                                                       Integer idExamen);

    Optional<Ingreso> findByClientUuid(String clientUuid);

    /** HU10: todos los ingresos de un examen, incluidos los retirados (lista del aula). */
    List<Ingreso> findByIdAsignaturaAndIdExamen(Integer idAsignatura, Integer idExamen);

    /** HU10: ingresos vigentes (sin retiro) de un examen, para el dashboard. */
    List<Ingreso> findByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(Integer idAsignatura, Integer idExamen);

    /** Presentes en el aula: los retirados (con expulsión) ya no cuentan. */
    long countByIdAmbienteAndIdExpulsionIsNull(Integer idAmbiente);

    long countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(Integer idAsignatura, Integer idExamen, Integer idAmbiente);

    long countByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(Integer idAsignatura, Integer idExamen);

    List<Ingreso> findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByIdIngresoDesc(Integer idAsignatura, Integer idExamen, Integer idAmbiente);

    List<Ingreso> findByIdUsuarioRegistraOrderByHoraIngresoDesc(Integer idUsuarioRegistra);

    List<Ingreso> findByTipoIngresoAndIdAmbienteInOrderByHoraIngresoDesc(TipoIngreso tipoIngreso,
                                                                         Collection<Integer> idsAmbiente);

    List<Ingreso> findByTipoIngresoOrderByHoraIngresoDesc(TipoIngreso tipoIngreso);

    /**
     * Capacidad del aula donde se toma el examen (aula.capacidadaula).
     * OJO: la BD real NO tiene ambiente.capacidadambiente aunque figure en
     * docs/consult-bd-new.md (verificado el 09/10/2026); usarla rompía el aforo.
     */
    @Query(value = "SELECT au.capacidadaula " +
                   "FROM ambiente am JOIN aula au ON au.idaula = am.idaula " +
                   "WHERE am.idambiente = :idAmbiente", nativeQuery = true)
    Integer obtenerCapacidadAmbiente(@Param("idAmbiente") Integer idAmbiente);

    /**
     * Bloquea la fila del ambiente hasta que termine la transacción, para que
     * dos ingresos excepcionales simultáneos no superen juntos la capacidad.
     */
    @Query(value = "SELECT idambiente FROM ambiente WHERE idambiente = :idAmbiente FOR UPDATE",
           nativeQuery = true)
    Integer bloquearAmbiente(@Param("idAmbiente") Integer idAmbiente);
}
