package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint3.hu17examenespasados;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenArchivadoService;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenArchivadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * HU17 · Sección de Exámenes Pasados · TC-036 (prueba unitaria).
 * Prueba solo la validación del archivo en el servicio. La base de datos está simulada:
 * no se conecta a Supabase ni guarda nada.
 */
@DisplayName("HU17 Exámenes pasados · TC-036 · Validación del archivo PDF")
class ExamenesPasadosArchivoTest {

    private ExamenArchivadoRepository repositorio;
    private ExamenArchivadoService servicio;
    private final ExamenArchivadoRequest datos = new ExamenArchivadoRequest(
            "Primer examen de ingreso FCyT 1-2025", "1-2025", LocalDate.of(2025, 1, 23), "Fuente de prueba");

    @BeforeEach
    void preparar() {
        repositorio = mock(ExamenArchivadoRepository.class);
        servicio = new ExamenArchivadoService(repositorio);
    }

    /** Un PDF real de una página, generado en memoria. */
    private static byte[] pdfValido() throws Exception {
        try (PDDocument documento = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            documento.addPage(new PDPage());
            documento.save(salida);
            return salida.toByteArray();
        }
    }

    /** Intenta guardar el archivo y devuelve el error del servidor; falla si el archivo se acepta. */
    private ResponseStatusException rechazo(String caso, MockMultipartFile archivo) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> servicio.guardar(datos, archivo), caso + " debía rechazarse");
        System.out.println("[EVIDENCIA] TC-036 · " + caso + " -> rechazado (" + error.getStatusCode().value()
                + "): " + error.getReason());
        assertEquals(400, error.getStatusCode().value(), caso + " debe responder 400");
        verify(repositorio, never()).guardar(any(), any(), anyString());
        return error;
    }

    @Test
    @DisplayName("TC-036 · Un archivo de texto renombrado a .pdf se rechaza")
    void textoConExtensionPdfSeRechaza() {
        MockMultipartFile archivo = new MockMultipartFile("archivoPdf", "examen.pdf", "application/pdf",
                "Esto es un texto, no un PDF".getBytes(StandardCharsets.UTF_8));
        ResponseStatusException error = rechazo("Texto con extensión .pdf", archivo);
        assertTrue(error.getReason().contains("PDF"), "El mensaje debe indicar que no es un PDF válido");
    }

    @Test
    @DisplayName("TC-036 · Una imagen .jpg se rechaza")
    void imagenJpgSeRechaza() {
        byte[] jpg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0};
        rechazo("Imagen .jpg", new MockMultipartFile("archivoPdf", "foto.jpg", "image/jpeg", jpg));
    }

    @Test
    @DisplayName("TC-036 · Un documento .docx se rechaza")
    void documentoDocxSeRechaza() {
        byte[] docx = {'P', 'K', 3, 4, 20, 0, 6, 0, 8, 0};
        rechazo("Documento .docx", new MockMultipartFile("archivoPdf", "examen.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docx));
    }

    @Test
    @DisplayName("TC-036 · Un PDF válido se acepta y se guarda")
    void pdfValidoSeAcepta() throws Exception {
        when(repositorio.guardar(any(), any(), anyString())).thenReturn(7L);
        MockMultipartFile archivo = new MockMultipartFile("archivoPdf", "examen.pdf", "application/pdf", pdfValido());

        long id = servicio.guardar(datos, archivo);

        System.out.println("[EVIDENCIA] TC-036 · PDF válido -> aceptado y enviado a guardar (id simulado " + id + ")");
        assertEquals(7L, id);
        verify(repositorio, times(1)).guardar(eq(datos), any(), anyString());
    }
}