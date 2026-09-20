// presentacion/TipoExamenController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.TipoExamenRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tipos-examen")
public class TipoExamenController {

    private final TipoExamenRepository tipoExamenRepository;

    public TipoExamenController(TipoExamenRepository tipoExamenRepository) {
        this.tipoExamenRepository = tipoExamenRepository;
    }

    @GetMapping
    public ResponseEntity<List<TipoExamen>> listar() {
        return ResponseEntity.ok(tipoExamenRepository.findByEstadoTipoExamenTrue());
    }
}