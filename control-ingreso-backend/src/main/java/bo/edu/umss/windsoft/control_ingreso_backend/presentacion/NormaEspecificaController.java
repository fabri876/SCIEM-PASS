// presentacion/NormaEspecificaController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaEspecifica;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.NormaEspecificaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/normas-especificas")
public class NormaEspecificaController {

    private final NormaEspecificaRepository normaEspecificaRepository;

    public NormaEspecificaController(NormaEspecificaRepository normaEspecificaRepository) {
        this.normaEspecificaRepository = normaEspecificaRepository;
    }

    @GetMapping
    public ResponseEntity<List<NormaEspecifica>> porExamen(
            @RequestParam Integer idAsignatura, @RequestParam Integer idExamen) {
        return ResponseEntity.ok(
                normaEspecificaRepository.findByIdAsignaturaAndIdExamen(idAsignatura, idExamen));
    }
}
