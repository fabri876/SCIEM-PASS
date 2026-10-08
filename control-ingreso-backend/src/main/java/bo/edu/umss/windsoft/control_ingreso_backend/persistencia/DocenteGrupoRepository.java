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
    List<DocenteGrupo> findByIdUsuario(Integer idUsuario);
    List<DocenteGrupo> findByIdGrupo(Integer idGrupo);
    boolean existsByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);
    void deleteByIdUsuarioAndIdGrupo(Integer idUsuario, Integer idGrupo);

    @Query("SELECT g FROM Grupo g JOIN DocenteGrupo dg ON g.idGrupo = dg.idGrupo WHERE g.idAsignatura = :idAsignatura AND dg.idUsuario = :idUsuario")
    List<Grupo> findGruposByAsignaturaAndDocente(@Param("idAsignatura") Integer idAsignatura, @Param("idUsuario") Integer idUsuario);

    @Query("SELECT DISTINCT dg.idUsuario FROM DocenteGrupo dg JOIN Grupo g ON dg.idGrupo = g.idGrupo WHERE g.idAsignatura = :idAsignatura")
    List<Integer> findIdUsuariosDocentesByAsignatura(@Param("idAsignatura") Integer idAsignatura);
}
