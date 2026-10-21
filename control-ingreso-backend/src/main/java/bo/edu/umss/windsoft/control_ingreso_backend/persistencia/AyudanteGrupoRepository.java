package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteGrupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AyudanteGrupoRepository extends JpaRepository<AyudanteGrupo, Integer> {
    @Query("SELECT v FROM AyudanteGrupo v WHERE v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<AyudanteGrupo> findAll();

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM AyudanteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    void deleteByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    @Query("SELECT count(v)>0 FROM AyudanteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo=:idGrupo AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    boolean existsByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    @Query("SELECT v FROM AyudanteGrupo v WHERE v.idUsuario=:idUsuario AND v.idGrupo IN (SELECT g.idGrupo FROM Grupo g WHERE g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<AyudanteGrupo> findByIdUsuario(Integer idUsuario);

    @Query("select g from Grupo g join AyudanteGrupo ag on ag.idGrupo = g.idGrupo " +
           "where g.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL') and ag.idUsuario = :idUsuario")
    List<Grupo> findGruposByAyudante(@Param("idUsuario") Integer idUsuario);

    @Query(value = "SELECT DISTINCT ag.idusuario FROM ayudantegrupo ag " +
            "JOIN grupo g ON g.idgrupo = ag.idgrupo " +
            "JOIN ambiente am ON am.idasignatura = g.idasignatura " +
            "WHERE g.idsemestre=(SELECT idsemestre FROM semestre WHERE estado='ACTUAL') AND am.idexamen = :idExamen AND COALESCE(g.estadogrupo, true) = true",
            nativeQuery = true)
    List<Integer> findUsuariosPorExamen(@Param("idExamen") Integer idExamen);
}
