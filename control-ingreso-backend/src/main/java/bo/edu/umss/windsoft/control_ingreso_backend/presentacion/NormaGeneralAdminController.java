package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.NormaGeneralService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.NormaGeneralRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaGeneral;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/normas-generales")
public class NormaGeneralAdminController {

    private final NormaGeneralService normaGeneralService;

    public NormaGeneralAdminController(NormaGeneralService normaGeneralService) {
        this.normaGeneralService = normaGeneralService;
    }

    @PostMapping
    public ResponseEntity<NormaGeneral> crear(@Valid @RequestBody NormaGeneralRequest request) {
        NormaGeneral creada = normaGeneralService.crear(request.getDescripcionNorma());
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NormaGeneral> actualizar(@PathVariable Integer id,
                                                     @Valid @RequestBody NormaGeneralRequest request) {
        return ResponseEntity.ok(normaGeneralService.actualizar(id, request.getDescripcionNorma()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> darDeBaja(@PathVariable Integer id) {
        normaGeneralService.darDeBaja(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/promover/{idNormaEspecifica}")
    public ResponseEntity<NormaGeneral> promover(@PathVariable Integer idNormaEspecifica) {
        NormaGeneral creada = normaGeneralService.promoverDesdeEspecifica(idNormaEspecifica);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }
}