package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrupoRepository extends JpaRepository<Grupo, Integer> {
    List<Grupo> findByIdAsignatura(Integer idAsignatura);
    List<Grupo> findByIdAsignaturaIn(List<Integer> idsAsignatura);
    Optional<Grupo> findByIdAsignaturaAndNombreGrupo(Integer idAsignatura, String nombreGrupo);
    Optional<Grupo> findByIdAsignaturaAndNombreGrupoIgnoreCase(Integer idAsignatura, String nombreGrupo);
}
