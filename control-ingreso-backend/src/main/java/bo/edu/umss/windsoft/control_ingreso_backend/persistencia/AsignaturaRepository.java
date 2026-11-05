package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AsignaturaRepository extends JpaRepository<Asignatura, Integer> {
    Optional<Asignatura> findByCodigoOficial(String codigoOficial);
    Optional<Asignatura> findBySiglaAsignatura(String siglaAsignatura);
    Optional<Asignatura> findByNombreAsignatura(String nombreAsignatura);
    Optional<Asignatura> findByNombreAsignaturaIgnoreCase(String nombreAsignatura);
    java.util.List<Asignatura> findAllByNombreAsignaturaIgnoreCase(String nombreAsignatura);
}
