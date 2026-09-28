// aplicacion/AulaService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AulaService {

    private final AulaRepository aulaRepository;

    public AulaService(AulaRepository aulaRepository) {
        this.aulaRepository = aulaRepository;
    }

    public List<Aula> obtenerAulasActivas() {
        return aulaRepository.findByEstadoAulaTrue();
    }
}