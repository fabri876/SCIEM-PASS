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

    /** Presentes en el aula: los retirados (con expulsión) ya no cuentan. */
    long countByIdAmbienteAndIdExpulsionIsNull(Integer idAmbiente);

    long countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(Integer idAsignatura, Integer idExamen, Integer idAmbiente);

    List<Ingreso> findByTipoIngresoAndIdAmbienteInOrderByHoraIngresoDesc(TipoIngreso tipoIngreso,
                                                                         Collection<Integer> idsAmbiente);

    List<Ingreso> findByTipoIngresoOrderByHoraIngresoDesc(TipoIngreso tipoIngreso);

    /**
     * Capacidad del aula para ese examen: la del ambiente si se definió,
     * si no la capacidad general del aula. (La entidad Ambiente no mapea
     * capacidadambiente, por eso se lee con SQL nativo.)
     */
    @Query(value = "SELECT COALESCE(am.capacidadambiente, au.capacidadaula) " +
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
