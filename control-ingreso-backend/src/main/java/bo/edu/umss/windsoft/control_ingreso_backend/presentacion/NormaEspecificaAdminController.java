package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.NormaEspecificaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaEspecifica;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/normas-particulares")
public class NormaEspecificaAdminController {

    private final NormaEspecificaService normaEspecificaService;

    public NormaEspecificaAdminController(NormaEspecificaService normaEspecificaService) {
        this.normaEspecificaService = normaEspecificaService;
    }

    @GetMapping
    public ResponseEntity<List<NormaEspecifica>> listar(
            @RequestParam(required = false) Integer idAsignatura,
            @RequestParam(required = false) Integer idExamen) {
        return ResponseEntity.ok(normaEspecificaService.listarTodas(idAsignatura, idExamen));
    }
}