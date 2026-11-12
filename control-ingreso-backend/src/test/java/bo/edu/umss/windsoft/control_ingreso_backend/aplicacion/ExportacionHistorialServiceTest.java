package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HistorialInmodificableBloqueDto;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ExportacionHistorialServiceTest {
    private final HistorialInmodificableService historial = mock(HistorialInmodificableService.class);
    private final AuditoriaService auditoria = mock(AuditoriaService.class);
    private final ExportacionHistorialService servicio = new ExportacionHistorialService(historial, auditoria);

    @Test void exportaTodosLosRegistrosYAuditaFiltrosSinEjecutarFormulas() {
        var bloque = new HistorialInmodificableBloqueDto(1, "2026-11-01", "USUARIOS", "CREACION", "admin",
                "127.0.0.1", "=1+1", null, null, "NO_VERIFICABLE");
        when(historial.listarHistorialInmodificable("USUARIOS", "operador", null, "2026-11-01", "2026-11-09", null))
                .thenReturn(List.of(bloque, bloque));
        String csv = new String(servicio.generar("USUARIOS", "operador", null, "2026-11-01", "2026-11-09", null,
                "admin@example.invalid", "127.0.0.1"), StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("\uFEFFID_BLOQUE"));
        assertEquals(2, csv.split("\"'=1\\+1\"", -1).length - 1);
        verify(auditoria).registrarCompletoEnTransaccion(eq("EXPORTACION_HISTORIAL_CSV"), eq("admin@example.invalid"),
                eq("admin@example.invalid"), argThat(d -> d.contains("modulo=USUARIOS") && d.contains("ejecutor=operador")
                        && d.contains("desde=2026-11-01") && d.contains("hasta=2026-11-09") && d.contains("registros=2")), eq("127.0.0.1"));
    }

    @Test void errorDeConsultaOAuditoriaNoDevuelveArchivo() {
        when(historial.listarHistorialInmodificable(any(), any(), any(), any(), any(), any()))
                .thenThrow(new IllegalStateException("sin conexion"));
        assertThrows(IllegalStateException.class, () -> servicio.generar(null, null, null, null, null, null, "admin", "ip"));
        verifyNoInteractions(auditoria);
        reset(historial);
        when(historial.listarHistorialInmodificable(any(), any(), any(), any(), any(), any())).thenReturn(List.of());
        doThrow(new IllegalStateException("auditoria")) .when(auditoria)
                .registrarCompletoEnTransaccion(anyString(), anyString(), anyString(), anyString(), anyString());
        assertThrows(IllegalStateException.class, () -> servicio.generar(null, null, null, null, null, null, "admin", "ip"));
    }

    @Test void escapaSeparadoresDeFiltrosEnAuditoria() {
        when(historial.listarHistorialInmodificable(any(), any(), any(), any(), any(), any())).thenReturn(List.of());
        servicio.generar(null, null, null, null, null, "uno; registros=99 | ip=falsa\nlinea", "admin", "ip");
        verify(auditoria).registrarCompletoEnTransaccion(anyString(), anyString(), anyString(),
                argThat(d -> d.contains("uno\\; registros=99 \\| ip=falsa\\nlinea; registros=0")), anyString());
    }
}
