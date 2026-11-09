package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

public record FaceSyncResponseDto(List<ItemResultadoDto> intentos, List<ItemResultadoDto> ingresos) {
    public record ItemResultadoDto(String clientUuid, String estado, String mensaje) {
    }
}
