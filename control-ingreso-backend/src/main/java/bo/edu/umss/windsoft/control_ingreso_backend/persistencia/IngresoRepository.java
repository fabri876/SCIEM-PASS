package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
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

    boolean existsByCodsisEstudianteAndIdAsignaturaAndIdExamen(Integer codsisEstudiante,
                                                               Integer idAsignatura,
                                                               Integer idExamen);

    Optional<Ingreso> findByClientUuid(String clientUuid);

    @Modifying
    @Query("UPDATE Ingreso i SET i.auditFlag = true WHERE i.idIngreso = :idIngreso")
    int marcarAuditoria(@Param("idIngreso") Integer idIngreso);

    List<Ingreso> findByAuditFlagTrueOrderBySincronizadoEnDescHoraIngresoDesc();

    /** HU10: todos los ingresos de un examen, incluidos los retirados (lista del aula). */
    List<Ingreso> findByIdAsignaturaAndIdExamen(Integer idAsignatura, Integer idExamen);

    /** HU10: ingresos vigentes (sin retiro) de un examen, para el dashboard. */
    List<Ingreso> findByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(Integer idAsignatura, Integer idExamen);

    /** Presentes en el aula: los retirados (con expulsión) ya no cuentan. */
    long countByIdAmbienteAndIdExpulsionIsNull(Integer idAmbiente);

    long countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(Integer idAsignatura, Integer idExamen, Integer idAmbiente);

    long countByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(Integer idAsignatura, Integer idExamen);

    /**
     * Ingresos de un aula que ya no cuentan como presentes porque el
     * estudiante fue expulsado. Se informa aparte para que "ausente" no los
     * incluya: el estudiante sí ingresó, se lo retiró.
     */
    long countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNotNull(Integer idAsignatura, Integer idExamen,
            Integer idAmbiente);

    List<Ingreso> findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByIdIngresoDesc(Integer idAsignatura, Integer idExamen, Integer idAmbiente);
    List<Ingreso> findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByHoraIngresoDesc(Integer idAsignatura, Integer idExamen, Integer idAmbiente);

    List<Ingreso> findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteAndIdUsuarioRegistraOrderByHoraIngresoDesc(
            Integer idAsignatura, Integer idExamen, Integer idAmbiente, Integer idUsuarioRegistra);

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

    /**
     * Bloquea la fila del ingreso hasta que termine la transacción.
     *
     * BUG-001: sin este lock, dos expulsiones simultáneas del mismo estudiante pasaban
     * las dos la comprobación "no está retirado" y las dos creaban una expulsión
     * (la segunda machacaba la referencia del ingreso). Con el lock, la segunda espera
     * y luego ve la expulsión de la primera, así que responde 409 en vez de duplicar.
     */
    @Query(value = "SELECT idingreso FROM ingreso WHERE idingreso = :idIngreso FOR UPDATE",
           nativeQuery = true)
    Integer bloquearIngreso(@Param("idIngreso") Integer idIngreso);

    /**
     * Bloquea el ingreso de un estudiante en un examen (usado cuando la expulsión se
     * registra desde una incidencia, donde el ingreso se busca por código SIS).
     */
    @Query(value = "SELECT idingreso FROM ingreso "
                   + "WHERE codsisestudiante = :codSis AND idasignatura = :idAsignatura AND idexamen = :idExamen "
                   + "FOR UPDATE",
           nativeQuery = true)
    Integer bloquearIngresoPorEstudiante(@Param("codSis") Integer codSis,
                                          @Param("idAsignatura") Integer idAsignatura,
                                          @Param("idExamen") Integer idExamen);
}
