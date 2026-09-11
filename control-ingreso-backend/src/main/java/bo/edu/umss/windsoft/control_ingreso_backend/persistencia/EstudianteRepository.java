package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;

@Repository
public interface EstudianteRepository extends JpaRepository<Estudiante, Integer> {

    Optional<Estudiante> findByCodSisEstudiante(Integer codSisEstudiante);

    Optional<Estudiante> findByCi(String ci);
}
