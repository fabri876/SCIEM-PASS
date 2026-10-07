package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

@Repository
public interface EstudianteRepository extends JpaRepository<Estudiante, Integer> {
    @org.springframework.data.jpa.repository.Query("SELECT e.codsisestudiante FROM Estudiante e WHERE e.codsisestudiante IN :valores")
    List<Integer> buscarCodigosExistentes(@org.springframework.data.repository.query.Param("valores") List<Integer> valores);

    boolean existsByIdusuario(Integer idusuario);

    Optional<Estudiante> findByIdusuario(Integer idusuario);

    List<Estudiante> findByIdusuarioIn(List<Integer> idsUsuario);

    List<Estudiante> findByIdusuarioIn(Collection<Integer> ids);

    Optional<Estudiante> findByCodsisestudiante(Integer codsisestudiante);
}
