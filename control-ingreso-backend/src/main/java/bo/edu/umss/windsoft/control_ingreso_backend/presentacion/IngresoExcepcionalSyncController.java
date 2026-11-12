package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Sincronización idempotente de ingresos excepcionales registrados offline
 * (HU21). El respaldo fotográfico viaja en la misma petición multipart.
 *
 * Se envía un registro por petición. La idempotencia la garantiza el
 * {@code clientUuid} que genera el dispositivo: se guarda en el ingreso
 * (columna {@code client_uuid}, única), así que si el dispositivo reintenta
 * después de un timeout el servicio devuelve DUPLICADO en lugar de crear otro
 * ingreso.
 */
@RestController
@RequestMapping("/api/sync/ingresos-excepcionales")
public class IngresoExcepcionalSyncController {

    private final IngresoExcepcionalService ingresoExcepcionalService;

    public IngresoExcepcionalSyncController(IngresoExcepcionalService ingresoExcepcionalService) {
        this.ingresoExcepcionalService = ingresoExcepcionalService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('DOCENTE','ADMINISTRADOR','OPERADOR')")
    public ResponseEntity<Map<String, Object>> sincronizar(
            @RequestParam Integer idAmbiente,
            @RequestParam Integer codSis,
            @RequestParam String motivo,
            @RequestParam String observacion,
            @RequestParam(required = false) MultipartFile respaldo,
            @RequestParam(required = false) OffsetDateTime registradoEn,
            @RequestParam(required = false) String clientUuid,
            HttpServletRequest request) {
        Map<String, Object> resultado = new LinkedHashMap<>();
        try {
            IngresoExcepcionalService.AutorizacionExcepcional autorizacion =
                    ingresoExcepcionalService.autorizarConDetalle(idAmbiente, codSis, motivo, observacion,
                            respaldo, registradoEn, clientUuid, ClientIpResolver.resolver(request));
            resultado.put("estado", autorizacion.yaExistia() ? "DUPLICADO" : "PROCESADO");
            resultado.put("idIngreso", autorizacion.ingreso().idIngreso());
            return ResponseEntity.ok(resultado);
        } catch (IllegalArgumentException ex) {
            // Dato mal formado (por ejemplo, un clientUuid que no es UUID).
            resultado.put("estado", "ERROR_VALIDACION");
            resultado.put("mensaje", ex.getMessage());
            return ResponseEntity.ok(resultado);
        } catch (SolicitudInvalidaException | ConflictoEstadoException | RecursoNoEncontradoException
                | AccesoDenegadoException e) {
            // Errores de datos o de estado: reintentar no cambiaría el resultado.
            resultado.put("estado", "ERROR_VALIDACION");
            resultado.put("mensaje", e.getMessage());
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            resultado.put("estado", "ERROR");
            resultado.put("mensaje", e.getMessage() == null ? e.toString() : e.getMessage());
            return ResponseEntity.ok(resultado);
        }
    }
}
