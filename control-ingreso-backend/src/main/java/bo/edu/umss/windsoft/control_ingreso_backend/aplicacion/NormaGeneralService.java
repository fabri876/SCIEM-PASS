// aplicacion/NormaGeneralService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaGeneral;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.NormaGeneralRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NormaGeneralService {

    private final NormaGeneralRepository normaGeneralRepository;

    public NormaGeneralService(NormaGeneralRepository normaGeneralRepository) {
        this.normaGeneralRepository = normaGeneralRepository;
    }

    public List<NormaGeneral> obtenerNormasActivas() {
        return normaGeneralRepository.findByEstadoNormaTrue();
    }
}