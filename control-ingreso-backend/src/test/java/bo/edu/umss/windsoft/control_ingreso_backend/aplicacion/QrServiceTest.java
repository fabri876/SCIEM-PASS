package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class QrServiceTest {

    private QrService qrService;

    @BeforeEach
    void setUp() {
        qrService = new QrService();
    }

    @Test
    void testGenerarQrBase64() throws Exception {
        String contenido = "ESTUDIANTE:1234567:20230001";
        String qrBase64 = qrService.generarQrBase64(contenido);

        assertNotNull(qrBase64);
        assertTrue(qrBase64.startsWith("data:image/png;base64,"));
        assertTrue(qrBase64.length() > 100);
    }

    @Test
    void testGenerarQrBytes() throws Exception {
        String contenido = "CODIGO-EXAMEN-TIS-2026";
        byte[] bytes = qrService.generarQrBytes(contenido, 200, 200);

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);

        // Validar firma de archivo PNG (primeros 4 bytes: 0x89, 'P', 'N', 'G')
        assertEquals((byte) 0x89, bytes[0]);
        assertEquals((byte) 'P', bytes[1]);
        assertEquals((byte) 'N', bytes[2]);
        assertEquals((byte) 'G', bytes[3]);
    }
}
