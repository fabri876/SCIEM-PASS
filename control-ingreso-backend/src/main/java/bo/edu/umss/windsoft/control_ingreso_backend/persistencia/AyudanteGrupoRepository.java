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
    List<AyudanteGrupo> findByIdUsuario(Integer idUsuario);
    List<AyudanteGrupo> findByIdGrupo(Integer idGrupo);
    boolean existsByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    void deleteByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);

    @Query("SELECT g FROM Grupo g JOIN AyudanteGrupo ag ON g.idGrupo = ag.idGrupo WHERE ag.idUsuario = :idUsuario")
    List<Grupo> findGruposByAyudante(@Param("idUsuario") Integer idUsuario);
}
