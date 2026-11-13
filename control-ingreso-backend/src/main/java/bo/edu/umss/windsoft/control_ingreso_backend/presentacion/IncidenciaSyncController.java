package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ReintentarSincronizacionException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.BatchSyncIncidenciasRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.Optional;
import java.util.UUID;

/** Endpoint idempotente para sincronizar incidencias almacenadas offline. */
@RestController
@RequestMapping("/api/sync/incidencias")
public class IncidenciaSyncController {

    private static final Logger logger = LoggerFactory.getLogger(IncidenciaSyncController.class);

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
                    throw new SolicitudInvalidaException("Falta clientUuid.");
                }
                UUID.fromString(item.clientUuid());
                Optional<Integer> idExistente = incidenciaService.idPorClaveSolicitud(item.clientUuid());
                if (idExistente.isPresent()) {
                    resultado.put("estado", "DUPLICADO");
                    // El id de la incidencia que YA está en el servidor: el
                    // dispositivo lo necesita para subir la evidencia que quedó
                    // guardada en la cola local. Sin este dato la foto se
                    // perdía en silencio.
                    resultado.put("idIncidencia", idExistente.get());
                    resultados.add(resultado);
                    continue;
                }

                IncidenciaDetalleDto incidencia = incidenciaService.registrar(
                        item.clientUuid(), item.idAmbiente(), item.tipo(), item.severidad(), item.descripcion(),
                        item.codSisEstudiante(), Boolean.TRUE.equals(item.retirarEstudiante()), null,
                        item.registradoEn(), ip);
                resultado.put("estado", "PROCESADO");
                resultado.put("idIncidencia", incidencia.idIncidencia());

                // Una expulsión registrada offline debe cerrarse igual que en el
                // flujo online (la incidencia queda ABIERTA tras registrar()).
                if (Boolean.TRUE.equals(item.retirarEstudiante()) && incidencia.idIncidencia() != null) {
                    try {
                        String resolucion = item.descripcion();
                        if (resolucion == null || resolucion.isBlank()) {
                            resolucion = incidencia.descripcion();
                        }
                        if (resolucion == null || resolucion.isBlank()) {
                            resolucion = "Expulsión registrada offline.";
                        }
                        incidenciaService.cerrar(incidencia.idIncidencia(), recortarResolucion(resolucion), ip);
                    } catch (RuntimeException exCerrar) {
                        // La incidencia ya quedó registrada y la expulsión aplicada:
                        // no se interrumpe la sincronización. Se avisa al dispositivo
                        // para que el docente pueda cerrarla desde la sección de
                        // incidencias en vez de perder el registro en silencio.
                        logger.warn("La incidencia {} (expulsión offline) no se pudo cerrar: {}",
                                incidencia.idIncidencia(), exCerrar.getMessage());
                        resultado.put("advertencia", "La incidencia se registró pero no se pudo cerrar: "
                                + exCerrar.getMessage());
                    }
                }
            } catch (IllegalArgumentException ex) {
                // Error de formato de los datos (UUID inválido, enum desconocido...).
                resultado.put("estado", "ERROR_VALIDACION");
                resultado.put("mensaje", ex.getMessage());
            } catch (ReintentarSincronizacionException ex) {
                // Error transitorio (por ejemplo, el ingreso del estudiante aún no
                // se ha sincronizado): el dispositivo lo reintentará más tarde.
                resultado.put("estado", "ERROR");
                resultado.put("mensaje", ex.getMessage());
            } catch (SolicitudInvalidaException | ConflictoEstadoException | RecursoNoEncontradoException
                    | AccesoDenegadoException ex) {
                // Errores de datos o de estado: reintentar no cambiaría el resultado,
                // así que el dispositivo no debe volver a encolar el ítem.
                resultado.put("estado", "ERROR_VALIDACION");
                resultado.put("mensaje", ex.getMessage());
            } catch (Exception ex) {
                // Fallo inesperado del servidor: sí conviene reintentar.
                logger.error("Error sincronizando la incidencia {}: {}", item == null ? null : item.clientUuid(),
                        ex.getMessage(), ex);
                resultado.put("estado", "ERROR");
                resultado.put("mensaje", ex.getMessage() == null ? ex.toString() : ex.getMessage());
            }
            resultados.add(resultado);
        }
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("batchId", solicitud.batchId());
        cuerpo.put("items", resultados);
        return ResponseEntity.ok(cuerpo);
    }

    /**
     * La columna "incidencia.resolucion" es varchar(255): la descripción de la
     * incidencia puede ser más larga, así que se recorta antes de usarla como
     * resolución del cierre.
     */
    private static String recortarResolucion(String texto) {
        String limpio = texto == null ? "" : texto.trim();
        return limpio.length() <= 255 ? limpio : limpio.substring(0, 252) + "...";
    }
}
