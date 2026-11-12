package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint3.hu17examenespasados;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenArchivadoService;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenArchivadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import org.apache.pdfbox.pdfwriter.compress.CompressParameters;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDStream;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * HU17 · Sección de Exámenes Pasados · Pruebas de validación del servidor
 * (TC-286, TC-287, TC-290 y TC-292). La base de datos está simulada: no se conecta
 * a Supabase ni guarda nada, aunque el documento se acepte.
 */
@DisplayName("HU17 Exámenes pasados · Validación en el servidor")
class ExamenesPasadosValidacionTest {

    private static final long DIEZ_MB = 10L * 1024 * 1024;

    private ExamenArchivadoRepository repositorio;
    private ExamenArchivadoService servicio;

    @BeforeEach
    void preparar() {
        repositorio = mock(ExamenArchivadoRepository.class);
        when(repositorio.guardar(any(), any(), anyString())).thenReturn(7L);
        servicio = new ExamenArchivadoService(repositorio);
    }

    /** Gestión del semestre actual, por ejemplo "2-2026". */
    private static String gestionActual(LocalDate hoy) {
        return (hoy.getMonthValue() <= 6 ? 1 : 2) + "-" + hoy.getYear();
    }

    private static ExamenArchivadoRequest datos(String gestion, LocalDate fecha, String observaciones) {
        return new ExamenArchivadoRequest("Examen de ingreso de prueba", gestion, fecha, observaciones);
    }

    /** Un PDF real de una página, generado en memoria. */
    private static byte[] pdfValido() throws Exception {
        try (PDDocument documento = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            documento.addPage(new PDPage());
            documento.save(salida);
            return salida.toByteArray();
        }
    }

    /** PDF real cuyo contenido de página se rellena con espacios para que pese exactamente los bytes indicados. */
    private static byte[] pdfDeTamano(long bytesObjetivo) throws Exception {
        long relleno = bytesObjetivo - 2_000;
        for (int intento = 0; intento < 5; intento++) {
            byte[] pdf;
            try (PDDocument documento = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
                PDPage pagina = new PDPage();
                PDStream contenido = new PDStream(documento);
                try (OutputStream escritura = contenido.createOutputStream()) {
                    byte[] espacios = new byte[64 * 1024];
                    Arrays.fill(espacios, (byte) ' ');
                    long pendiente = relleno;
                    while (pendiente > 0) {
                        int n = (int) Math.min(espacios.length, pendiente);
                        escritura.write(espacios, 0, n);
                        pendiente -= n;
                    }
                }
                pagina.setContents(contenido);
                documento.addPage(pagina);
                documento.save(salida, CompressParameters.NO_COMPRESSION);
                pdf = salida.toByteArray();
            }
            if (pdf.length == bytesObjetivo) return pdf;
            relleno += bytesObjetivo - pdf.length;
        }
        throw new IllegalStateException("No se pudo generar un PDF de " + bytesObjetivo + " bytes");
    }

    /** PDF protegido con contraseña. Si conUsuario es false, se abre sin contraseña pero sigue protegido. */
    private static byte[] pdfProtegido(boolean conUsuario) throws Exception {
        try (PDDocument documento = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            documento.addPage(new PDPage());
            StandardProtectionPolicy politica = new StandardProtectionPolicy("dueno123", conUsuario ? "usuario123" : "",
                    new AccessPermission());
            politica.setEncryptionKeyLength(128);
            documento.protect(politica);
            documento.save(salida);
            return salida.toByteArray();
        }
    }

    private static MockMultipartFile archivo(byte[] bytes) {
        return new MockMultipartFile("archivoPdf", "examen.pdf", "application/pdf", bytes);
    }

    @Test
    @DisplayName("TC-286 · La fecha de hoy se acepta como fecha de un examen ya realizado")
    void fechaDeHoySeAcepta() throws Exception {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/La_Paz"));
        long id = servicio.guardar(datos(gestionActual(hoy), hoy, "Fuente de prueba"), archivo(pdfValido()));

        System.out.println("[EVIDENCIA] TC-286 · Fecha " + hoy + " con gestión " + gestionActual(hoy)
                + " -> aceptado y enviado a guardar (id simulado " + id + ")");
        assertEquals(7L, id);
        verify(repositorio, times(1)).guardar(any(), any(), anyString());
    }

    @Test
    @DisplayName("TC-287 · Un PDF protegido con contraseña no se guarda e indica que debe ser legible")
    void pdfProtegidoSeRechaza() throws Exception {
        for (boolean conUsuario : new boolean[]{true, false}) {
            String caso = conUsuario ? "PDF que pide contraseña para abrirse" : "PDF protegido que se abre sin contraseña";
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> servicio.guardar(datos("1-2025", null, null), archivo(pdfProtegido(conUsuario))),
                    caso + " debía rechazarse");
            System.out.println("[EVIDENCIA] TC-287 · " + caso + " -> rechazado (" + error.getStatusCode().value()
                    + "): " + error.getReason());
            assertEquals(400, error.getStatusCode().value());
            assertTrue(error.getReason().contains("legible"), "El mensaje debe indicar que el PDF debe ser legible");
        }
        verify(repositorio, never()).guardar(any(), any(), anyString());
    }

    @Test
    @DisplayName("TC-290 · Un PDF de 10 MB exactos se acepta en el servidor")
    void pdfDeDiezMegasSeAcepta() throws Exception {
        byte[] pdf = pdfDeTamano(DIEZ_MB);
        long id = servicio.guardar(datos("1-2025", null, null), archivo(pdf));

        System.out.println("[EVIDENCIA] TC-290 · PDF de " + pdf.length + " bytes (10 MB exactos) -> aceptado (id simulado " + id + ")");
        assertEquals(DIEZ_MB, pdf.length);
        assertEquals(7L, id);
    }

    @Test
    @DisplayName("TC-292 · Con observaciones vacías el examen pasado se guarda igual")
    void sinObservacionesSeGuarda() throws Exception {
        long idNulo = servicio.guardar(datos("1-2025", null, null), archivo(pdfValido()));
        long idVacio = servicio.guardar(datos("1-2025", null, ""), archivo(pdfValido()));

        System.out.println("[EVIDENCIA] TC-292 · Sin observaciones -> aceptado (id simulado " + idNulo + ")");
        System.out.println("[EVIDENCIA] TC-292 · Observaciones en blanco -> aceptado (id simulado " + idVacio + ")");
        assertEquals(7L, idNulo);
        assertEquals(7L, idVacio);
        verify(repositorio, times(2)).guardar(any(), any(), anyString());
    }
}