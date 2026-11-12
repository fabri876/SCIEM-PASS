package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HistorialInmodificableService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExportacionHistorialService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HistorialInmodificableBloqueDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IntegridadCadenaResultadoDto;
import org.springframework.http.HttpHeaders;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Controlador REST para la HU-15: "Historial Inmodificable de las Operaciones del Sistema".
 * Todos los endpoints requieren que el usuario tenga rol ADMINISTRADOR.
 *
 * Endpoints:
 * - GET /api/admin/historial-inmodificable: Lista paginada/filtrada con encadenamiento SHA-256.
 * - GET /api/admin/historial-inmodificable/verificar: Auditoría forense de la cadena completa.
 * - GET /api/admin/historial-inmodificable/exportar: Genera y descarga el CSV oficial.
 */
@RestController
@RequestMapping("/api/admin/historial-inmodificable")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class HistorialInmodificableController {

    private final HistorialInmodificableService historialInmodificableService;
    private final ExportacionHistorialService exportacion;

    public HistorialInmodificableController(HistorialInmodificableService historialInmodificableService,
                                           ExportacionHistorialService exportacion) {
        this.historialInmodificableService = historialInmodificableService;
        this.exportacion = exportacion;
    }

    /**
     * Consulta el historial forense inmodificable con filtros combinados (Criterios 1, 2, 3, 4, 5, 22, 23, 24).
     */
    @GetMapping
    public ResponseEntity<List<HistorialInmodificableBloqueDto>> listar(
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String ejecutor,
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(required = false) String busqueda) {

        List<HistorialInmodificableBloqueDto> lista = historialInmodificableService.listarHistorialInmodificable(
                modulo, ejecutor, fecha, fechaInicio, fechaFin, busqueda
        );

        if (lista.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        return ResponseEntity.ok(lista);
    }

    /**
     * Comprueba la integridad criptográfica de la cadena WORM completa (Criterios 17, 18, 19, 38).
     */
    @GetMapping("/verificar")
    public ResponseEntity<IntegridadCadenaResultadoDto> verificarIntegridad() {
        IntegridadCadenaResultadoDto resultado = historialInmodificableService.verificarIntegridadCadena();
        return ResponseEntity.ok(resultado);
    }

    /**
     * Exporta el registro completo filtrado a formato CSV UTF-8 con BOM (Criterios 26, 27, 28, 36, 37).
     */
    @GetMapping("/exportar")
    public ResponseEntity<byte[]> exportarCsv(
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String ejecutor,
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(required = false) String busqueda,
            Authentication autenticacion, HttpServletRequest request) {

        byte[] contenido = exportacion.generar(modulo, ejecutor, fecha, fechaInicio, fechaFin, busqueda,
                autenticacion.getName(), ClientIpResolver.resolver(request));

        String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmm"));
        String nombreArchivo = "SCIEM_PASS_Historial_Inmodificable_" + stamp + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(contenido);
    }

}
