// presentacion/NormaGeneralController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.NormaGeneralService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaGeneral;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/normas-generales")
public class NormaGeneralController {

    private final NormaGeneralService normaGeneralService;

    public NormaGeneralController(NormaGeneralService normaGeneralService) {
        this.normaGeneralService = normaGeneralService;
    }

    @GetMapping
    public ResponseEntity<List<NormaGeneral>> listarNormasGenerales() {
        return ResponseEntity.ok(normaGeneralService.obtenerNormasActivas());
    }
}