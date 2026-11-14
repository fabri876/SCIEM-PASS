package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.LimpiezaFotoBiometrica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LimpiezaFotoBiometricaRepository extends JpaRepository<LimpiezaFotoBiometrica, Long> {
    List<LimpiezaFotoBiometrica> findTop100ByOrderByCreadoEnAsc();
}
