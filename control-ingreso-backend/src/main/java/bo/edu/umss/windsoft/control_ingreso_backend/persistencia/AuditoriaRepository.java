package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditoriaRepository extends JpaRepository<Auditoria, Integer> {

    // "fechaaccion" es DATE (sin hora), así que para tener el más reciente
    // primero de verdad se ordena por el id (autoincremental) en vez de la fecha.
    List<Auditoria> findAllByOrderByIdAuditoriaDesc();
}
