package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Permiso;

@Repository
public interface PermisoRepository extends JpaRepository<Permiso, Integer> {

    Optional<Permiso> findByNombrePermiso(String nombrePermiso);

    boolean existsByNombrePermiso(String nombrePermiso);
}
