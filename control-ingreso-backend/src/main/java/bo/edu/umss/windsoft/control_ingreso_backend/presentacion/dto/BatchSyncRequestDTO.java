package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record BatchSyncRequestDTO(
        String batchId,
        String deviceId,
        OffsetDateTime enviadoEn,
        List<ItemSyncDTO> items
) {
    public record ItemSyncDTO(
            String clientUuid,
            Integer examenId,
            Integer asignaturaId,
            Integer ambienteId,
            String codigoSis,
            String metodo,
            OffsetDateTime marcadoEn,
            Long clockOffsetMs,
            String rol,
            Boolean verificacionVisual,
            String qrToken
    ) {}
}
