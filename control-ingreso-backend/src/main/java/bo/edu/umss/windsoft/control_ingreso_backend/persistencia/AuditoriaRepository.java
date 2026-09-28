package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditoriaRepository extends JpaRepository<Auditoria, Integer> {

    List<Auditoria> findAllByOrderByIdAuditoriaDesc();

    @Query("SELECT COALESCE(MAX(a.idAuditoria), 0) FROM Auditoria a")
    Integer findMaxIdAuditoria();
}
