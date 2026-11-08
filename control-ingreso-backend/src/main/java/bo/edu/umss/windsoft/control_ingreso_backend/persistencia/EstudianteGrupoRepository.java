package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstudianteGrupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EstudianteGrupoRepository extends JpaRepository<EstudianteGrupo, Integer> {
    @Query("SELECT v FROM EstudianteGrupo v WHERE v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<EstudianteGrupo> findAll();

    @Query("SELECT v FROM EstudianteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<EstudianteGrupo> findByIdUsuario(Integer idUsuario);
    @Query("SELECT v FROM EstudianteGrupo v WHERE v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<EstudianteGrupo> findByIdGrupo(Integer idGrupo);
    @Query("SELECT count(v)>0 FROM EstudianteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    boolean existsByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    @Query("SELECT COUNT(eg) > 0 FROM EstudianteGrupo eg JOIN Grupo g ON eg.idGrupo = g.idGrupo WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') AND eg.idUsuario = :idUsuario AND g.idAsignatura = :idAsignatura AND g.idGrupo <> :idGrupo")
    boolean existeOtroGrupoEnAsignatura(@Param("idUsuario") Integer idUsuario, @Param("idAsignatura") Integer idAsignatura, @Param("idGrupo") Integer idGrupo);
    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM EstudianteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    void deleteByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);

    @Query("SELECT g FROM Grupo g JOIN EstudianteGrupo eg ON g.idGrupo = eg.idGrupo WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') AND eg.idUsuario = :idUsuario")
    List<Grupo> findGruposByEstudiante(@Param("idUsuario") Integer idUsuario);

    /** ¿El estudiante está inscrito en algún grupo de la asignatura en el semestre actual? */
    @Query("SELECT COUNT(eg) > 0 FROM EstudianteGrupo eg JOIN Grupo g ON eg.idGrupo = g.idGrupo " +
           "WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') " +
           "AND eg.codSisEstudiante = :codSis AND g.idAsignatura = :idAsignatura")
    boolean existeInscripcionEnAsignatura(@Param("codSis") Integer codSis,
                                          @Param("idAsignatura") Integer idAsignatura);
}
