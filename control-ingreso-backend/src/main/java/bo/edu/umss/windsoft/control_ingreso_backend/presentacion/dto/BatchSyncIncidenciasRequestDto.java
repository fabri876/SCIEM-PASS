package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.OffsetDateTime;
import java.util.List;

/** Solicitud de sincronización offline de incidencias del docente. */
public record BatchSyncIncidenciasRequestDto(
        String batchId,
        String deviceId,
        OffsetDateTime enviadoEn,
        List<ItemDto> items
) {
    public record ItemDto(
            String clientUuid,
            Integer idAmbiente,
            String tipo,
            String severidad,
            String descripcion,
            Integer codSisEstudiante,
            Boolean retirarEstudiante,
            OffsetDateTime registradoEn
    ) {}
}
