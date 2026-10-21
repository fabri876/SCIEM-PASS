// persistencia/DocenteAsignaturaRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignaturaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List; 

@Repository
public interface DocenteAsignaturaRepository extends JpaRepository<DocenteAsignatura, DocenteAsignaturaId> {
    @Query("SELECT d FROM DocenteAsignatura d WHERE d.id=:id AND EXISTS (SELECT dg FROM DocenteGrupo dg JOIN Grupo g ON g.idGrupo=dg.idGrupo WHERE dg.idUsuario=d.id.idusuario AND g.idAsignatura=d.id.idasignatura AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    java.util.Optional<DocenteAsignatura> findById(@Param("id") DocenteAsignaturaId id);
    @Query("SELECT d FROM DocenteAsignatura d WHERE d.id.idusuario=:idusuario AND d.id.codsisdocente=:codsisdocente AND EXISTS (SELECT dg FROM DocenteGrupo dg JOIN Grupo g ON g.idGrupo=dg.idGrupo WHERE dg.idUsuario=d.id.idusuario AND g.idAsignatura=d.id.idasignatura AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<DocenteAsignatura> findByIdIdusuarioAndIdCodsisdocente(Integer idusuario, Integer codsisdocente);
    // BUG-004 (QA): "codsisdocente" está duplicado en esta tabla intermedia y
    // desincronizado del valor real en la tabla "docente" para varios
    // docentes, así que filtrar por los dos campos a la vez perdía filas.
    // idusuario solo ya identifica al docente sin ambigüedad.
    @Query("SELECT d FROM DocenteAsignatura d WHERE d.id.idusuario=:idusuario AND EXISTS (SELECT dg FROM DocenteGrupo dg JOIN Grupo g ON g.idGrupo=dg.idGrupo WHERE dg.idUsuario=d.id.idusuario AND g.idAsignatura=d.id.idasignatura AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<DocenteAsignatura> findByIdIdusuario(Integer idusuario);
    @Query("SELECT d FROM DocenteAsignatura d WHERE d.id.idasignatura=:idasignatura AND EXISTS (SELECT dg FROM DocenteGrupo dg JOIN Grupo g ON g.idGrupo=dg.idGrupo WHERE dg.idUsuario=d.id.idusuario AND g.idAsignatura=d.id.idasignatura AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<DocenteAsignatura> findByIdIdasignatura(Integer idasignatura);
    @Query(value = "SELECT EXISTS(SELECT 1 FROM examen WHERE idusuario = :idUsuario AND idasignatura = :idAsignatura) OR EXISTS(SELECT 1 FROM horarioregular WHERE idusuario = :idUsuario AND idasignatura = :idAsignatura)", nativeQuery = true)
    boolean tieneRegistrosVinculados(@Param("idUsuario") Integer idUsuario, @Param("idAsignatura") Integer idAsignatura);
}
