package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HistorialInmodificableService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HistorialInmodificableBloqueDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IntegridadCadenaResultadoDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HistorialInmodificableControllerTest {

    @Mock
    private HistorialInmodificableService historialInmodificableService;

    @InjectMocks
    private HistorialInmodificableController controller;

    @Test
    @DisplayName("GET /api/admin/historial-inmodificable retorna 200 con la lista de bloques")
    void listar_retornaLista200() {
        HistorialInmodificableBloqueDto b = new HistorialInmodificableBloqueDto(
                1482, "2026-10-28 08:36:12.184 BOT", "CONTROL_INGRESO",
                "INTENTO_EXAMEN_INCORRECTO (HU-09)", "jperez (OPERADOR)", "192.168.1.25",
                "Detalles", "51eeb235...", "e3b0c442...", "VALIDO"
        );

        when(historialInmodificableService.listarHistorialInmodificable(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(b));

        ResponseEntity<List<HistorialInmodificableBloqueDto>> respuesta = controller.listar(
                null, null, null, null, null, null
        );

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals(1, respuesta.getBody().size());
        assertEquals(1482, respuesta.getBody().get(0).getIdBloque());
    }

    @Test
    @DisplayName("GET /api/admin/historial-inmodificable/verificar retorna resultado de verificación íntegra")
    void verificarIntegridad_retorna200() {
        IntegridadCadenaResultadoDto resultado = new IntegridadCadenaResultadoDto(
                true, 10, "SELLO CRIPTOGRÁFICO VÁLIDO"
        );

        when(historialInmodificableService.verificarIntegridadCadena()).thenReturn(resultado);

        ResponseEntity<IntegridadCadenaResultadoDto> respuesta = controller.verificarIntegridad();

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertTrue(respuesta.getBody().isEsValido());
        assertEquals(10, respuesta.getBody().getTotalBloques());
    }

    @Test
    @DisplayName("GET /api/admin/historial-inmodificable/exportar descarga CSV UTF-8 con BOM y cabeceras oficiales")
    void exportarCsv_descargaArchivoConHeaders() {
        HistorialInmodificableBloqueDto b = new HistorialInmodificableBloqueDto(
                1, "2026-10-28 08:00:00.000 BOT", "USUARIOS",
                "CREACION_USUARIO", "admin@umss.edu", "127.0.0.1",
                "Alta usuario", "hash1", "hash0", "VALIDO"
        );

        when(historialInmodificableService.listarHistorialInmodificable(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(b));

        ResponseEntity<byte[]> respuesta = controller.exportarCsv(null, null, null, null, null, null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());

        String contenido = new String(respuesta.getBody(), StandardCharsets.UTF_8);
        assertTrue(contenido.startsWith("\uFEFFID_BLOQUE"), "Debe comenzar con BOM UTF-8 y cabecera ID_BLOQUE");
        assertTrue(contenido.contains("CREACION_USUARIO"));
        assertTrue(contenido.contains("admin@umss.edu"));
        assertTrue(respuesta.getHeaders().getFirst("Content-Disposition").contains("SCIEM_PASS_Historial_Inmodificable_"));
    }

    @Test
    @DisplayName("El CSV no interpreta datos auditados como formulas de hoja de calculo")
    void exportarCsv_neutralizaFormulas() {
        HistorialInmodificableBloqueDto bloque = new HistorialInmodificableBloqueDto(
                1, "2026-10-28 08:00:00", "USUARIOS", "CREACION", "admin", "127.0.0.1",
                "=1+1", null, null, "NO_VERIFICABLE");
        when(historialInmodificableService.listarHistorialInmodificable(any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(bloque));
        String csv = new String(controller.exportarCsv(null, null, null, null, null, null).getBody(), StandardCharsets.UTF_8);
        assertTrue(csv.contains("\"'=1+1\""));
    }
}
