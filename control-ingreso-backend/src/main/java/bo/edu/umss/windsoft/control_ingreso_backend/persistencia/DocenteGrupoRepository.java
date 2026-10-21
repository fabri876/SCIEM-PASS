package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteGrupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocenteGrupoRepository extends JpaRepository<DocenteGrupo, Integer> {
    @Query("SELECT v FROM DocenteGrupo v WHERE v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<DocenteGrupo> findAll();

    @Query("SELECT v FROM DocenteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<DocenteGrupo> findByIdUsuario(Integer idUsuario);
    @Query("SELECT v FROM DocenteGrupo v WHERE v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<DocenteGrupo> findByIdGrupo(Integer idGrupo);
    @Query("SELECT count(v)>0 FROM DocenteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    boolean existsByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM DocenteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    void deleteByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);

    @Query("SELECT g FROM Grupo g JOIN DocenteGrupo dg ON g.idGrupo = dg.idGrupo WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') AND g.idAsignatura = :idAsignatura AND dg.idUsuario = :idUsuario")
    List<Grupo> findGruposByAsignaturaAndDocente(@Param("idAsignatura") Integer idAsignatura, @Param("idUsuario") Integer idUsuario);

    @Query("SELECT DISTINCT dg.idUsuario FROM DocenteGrupo dg JOIN Grupo g ON dg.idGrupo = g.idGrupo WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') AND g.idAsignatura = :idAsignatura")
    List<Integer> findIdUsuariosDocentesByAsignatura(@Param("idAsignatura") Integer idAsignatura);
}
