package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ControlIngresoAyudanteService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.BatchSyncRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ResultadoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/v1/asistencias")
public class BatchSyncController {
    private final ControlIngresoAyudanteService service;
    private final ContextoUsuarioService contexto;
    private final IngresoRepository ingresoRepository;

    public BatchSyncController(ControlIngresoAyudanteService service, ContextoUsuarioService contexto,
                               IngresoRepository ingresoRepository) {
        this.service = service;
        this.contexto = contexto;
        this.ingresoRepository = ingresoRepository;
    }

    @PostMapping("/batch-sync")
    @PreAuthorize("hasAnyRole('OPERADOR','DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<Map<String, Object>> sincronizar(@RequestBody BatchSyncRequestDTO request) {
        Integer usuario = contexto.actual().idUsuario();
        List<Map<String, Object>> resultados = new ArrayList<>();
        if (request == null || request.items() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El lote debe contener items"));
        }
        for (BatchSyncRequestDTO.ItemSyncDTO item : request.items()) {
            Map<String, Object> salida = new LinkedHashMap<>();
            salida.put("clientUuid", item == null ? null : item.clientUuid());
            try {
                if (item == null || item.examenId() == null || item.asignaturaId() == null
                        || item.ambienteId() == null || item.codigoSis() == null) {
                    throw new IllegalArgumentException("Faltan examenId, asignaturaId, ambienteId o codigoSis");
                }
                if (item.clientUuid() != null && ingresoRepository.findByClientUuid(item.clientUuid()).isPresent()) {
                    salida.put("estado", "DUPLICADO");
                    salida.put("mensaje", "La marcación ya fue procesada anteriormente");
                    resultados.add(salida);
                    continue;
                }
                MetodoIngreso metodo = "QR".equalsIgnoreCase(item.metodo())
                        ? MetodoIngreso.ESCANEO : MetodoIngreso.MANUAL;
                var dto = new bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO(
                        item.codigoSis(), item.asignaturaId(), item.examenId(), item.ambienteId(), metodo);
                LocalDateTime horaMarcacion = item.marcadoEn() == null ? null
                        : item.marcadoEn().atZoneSameInstant(ZoneId.of("America/La_Paz")).toLocalDateTime();
                ResponseEntity<ResultadoIngresoDTO> respuesta = service.registrarIngreso(
                        dto, usuario, horaMarcacion, item.clientUuid());
                ResultadoIngresoDTO cuerpo = respuesta.getBody();
                String estado = respuesta.getStatusCode().value() == 403 ? "NO_AUTORIZADO"
                        : respuesta.getStatusCode().value() == 409 ? "DUPLICADO"
                        : respuesta.getStatusCode().is2xxSuccessful() ? "PROCESADO" : "ERROR";
                salida.put("estado", estado);
                salida.put("resultado", cuerpo);
            } catch (IllegalArgumentException ex) {
                salida.put("estado", "ERROR_VALIDACION");
                salida.put("mensaje", ex.getMessage());
            } catch (Exception ex) {
                salida.put("estado", "ERROR");
                salida.put("mensaje", "No se pudo procesar la marcación");
            }
            resultados.add(salida);
        }
        return ResponseEntity.ok(Map.of("batchId", request.batchId(), "items", resultados));
    }
}
