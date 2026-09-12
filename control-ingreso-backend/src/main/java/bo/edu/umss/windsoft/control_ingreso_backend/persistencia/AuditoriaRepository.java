package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;

@Repository
public interface AuditoriaRepository extends JpaRepository<Auditoria, Integer> {

    List<Auditoria> findByUsuarioEjecutor(String usuarioEjecutor);

    List<Auditoria> findByUsuarioAfectado(String usuarioAfectado);

    List<Auditoria> findByTipoOperacion(String tipoOperacion);
}
