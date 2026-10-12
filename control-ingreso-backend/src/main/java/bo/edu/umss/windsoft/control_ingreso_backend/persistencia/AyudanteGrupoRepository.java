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
    void deleteByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    boolean existsByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    List<AyudanteGrupo> findByIdUsuario(Integer idUsuario);

    @Query("select g from Grupo g join AyudanteGrupo ag on ag.idGrupo = g.idGrupo " +
           "where ag.idUsuario = :idUsuario")
    List<Grupo> findGruposByAyudante(@Param("idUsuario") Integer idUsuario);

    @Query(value = "SELECT DISTINCT ag.idusuario FROM ayudantegrupo ag " +
            "JOIN grupo g ON g.idgrupo = ag.idgrupo " +
            "JOIN ambiente am ON am.idasignatura = g.idasignatura " +
            "WHERE am.idexamen = :idExamen AND COALESCE(g.estadogrupo, true) = true",
            nativeQuery = true)
    List<Integer> findUsuariosPorExamen(@Param("idExamen") Integer idExamen);
}
