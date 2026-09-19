package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EstudianteRepository extends JpaRepository<Estudiante, Integer> {

    boolean existsByIdusuario(Integer idusuario);

    Optional<Estudiante> findByIdusuario(Integer idusuario);

    Optional<Estudiante> findByCodsisestudiante(Integer codsisestudiante);
}
