package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrupoRepository extends JpaRepository<Grupo, Integer> {
    @Query(value="SELECT idcarrera FROM usuario_carrera_plan WHERE idusuario=:usuario",nativeQuery=true)
    List<Integer> carrerasUsuario(@Param("usuario") Integer usuario);
    @Query(value="SELECT DISTINCT c.idcarrera FROM grupo g JOIN asignatura_carrera_nivel c ON c.idasignatura=g.idasignatura AND c.idsemestre=g.idsemestre WHERE g.idgrupo IN (:grupos) AND g.idsemestre=semestre_actual_id()",nativeQuery=true)
    List<Integer> carrerasDeGrupos(@Param("grupos") List<Integer> grupos);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value="INSERT INTO usuario_carrera_plan(idusuario,idcarrera,origen) VALUES(:usuario,:carrera,'REGISTRO') ON CONFLICT(idusuario,idcarrera) DO UPDATE SET origen='REGISTRO'",nativeQuery=true)
    void vincularCarrera(@Param("usuario") Integer usuario,@Param("carrera") Integer carrera);
    @Query("SELECT e FROM Grupo e WHERE e.idGrupo IN :ids AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Grupo> findAllById(@Param("ids") Iterable<Integer> ids);

    @Query("SELECT g FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Grupo> findAll();
    @Query("SELECT g FROM Grupo g WHERE g.idGrupo=:id AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    Optional<Grupo> findById(@Param("id") Integer id);
    @Query("SELECT g FROM Grupo g WHERE g.idAsignatura=:idAsignatura AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Grupo> findByIdAsignatura(Integer idAsignatura);
    @Query("SELECT g FROM Grupo g WHERE g.idAsignatura IN :idsAsignatura AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<Grupo> findByIdAsignaturaIn(List<Integer> idsAsignatura);
    @Query("SELECT g FROM Grupo g WHERE g.idAsignatura=:idAsignatura AND g.nombreGrupo=:nombreGrupo AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    Optional<Grupo> findByIdAsignaturaAndNombreGrupo(Integer idAsignatura, String nombreGrupo);
    @Query("SELECT g FROM Grupo g WHERE g.idAsignatura=:idAsignatura AND upper(g.nombreGrupo)=upper(:nombreGrupo) AND g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    Optional<Grupo> findByIdAsignaturaAndNombreGrupoIgnoreCase(Integer idAsignatura, String nombreGrupo);
}
