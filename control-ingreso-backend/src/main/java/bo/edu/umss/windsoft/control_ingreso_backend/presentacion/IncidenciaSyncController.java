package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.BatchSyncIncidenciasRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Endpoint idempotente para sincronizar incidencias almacenadas offline. */
@RestController
@RequestMapping("/api/sync/incidencias")
public class IncidenciaSyncController {

    private final IncidenciaService incidenciaService;

    public IncidenciaSyncController(IncidenciaService incidenciaService) {
        this.incidenciaService = incidenciaService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<Map<String, Object>> sincronizar(
            @RequestBody BatchSyncIncidenciasRequestDto solicitud,
            HttpServletRequest request) {
        if (solicitud == null || solicitud.items() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El lote debe contener items"));
        }

        List<Map<String, Object>> resultados = new ArrayList<>();
        String ip = ClientIpResolver.resolver(request);
        for (BatchSyncIncidenciasRequestDto.ItemDto item : solicitud.items()) {
            Map<String, Object> resultado = new LinkedHashMap<>();
            resultado.put("clientUuid", item == null ? null : item.clientUuid());
            try {
                if (item == null || item.clientUuid() == null || item.clientUuid().isBlank()) {
                    throw new IllegalArgumentException("Falta clientUuid");
                }
                UUID.fromString(item.clientUuid());
                if (incidenciaService.existeClaveSolicitud(item.clientUuid())) {
                    resultado.put("estado", "DUPLICADO");
                    resultados.add(resultado);
                    continue;
                }

                IncidenciaDetalleDto incidencia = incidenciaService.registrar(
                        item.clientUuid(), item.idAmbiente(), item.tipo(), item.severidad(), item.descripcion(),
                        item.codSisEstudiante(), Boolean.TRUE.equals(item.retirarEstudiante()), null, ip);
                resultado.put("estado", "PROCESADO");
                resultado.put("idIncidencia", incidencia.idIncidencia());
            } catch (IllegalArgumentException ex) {
                resultado.put("estado", "ERROR_VALIDACION");
                resultado.put("mensaje", ex.getMessage());
            } catch (Exception ex) {
                resultado.put("estado", "ERROR");
                resultado.put("mensaje", ex.getMessage() == null ? ex.toString() : ex.getMessage());
            }
            resultados.add(resultado);
        }
        return ResponseEntity.ok(Map.of("batchId", solicitud.batchId(), "items", resultados));
    }
}
