package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Los origins por defecto son: localhost:5173, localhost:4173, localhost, https://localhost
 * y capacitor://localhost (la app móvil). Los configurados se suman y se deduplican.
 */
class CorsConfigTest {

    private final CorsConfig corsConfig = new CorsConfig();

    private static final int ORIGENES_POR_DEFECTO = 5;

    @Test
    @DisplayName("Debe resolver un solo origen configurado y preservar los defaults")
    void testUnSoloOrigen() {
        List<String> origenes = corsConfig.resolverOrigenesPermitidos("https://sciem.umss.edu.bo");

        assertEquals(ORIGENES_POR_DEFECTO + 1, origenes.size());
        assertTrue(origenes.contains("https://sciem.umss.edu.bo"));
        assertTrue(origenes.contains("http://localhost:5173"));
        assertTrue(origenes.contains("http://localhost:4173"));
        assertTrue(origenes.contains("capacitor://localhost"));
    }

    @Test
    @DisplayName("Debe resolver múltiples orígenes con espacios y recortarlos")
    void testMultiplesOrigenesConEspacios() {
        List<String> origenes = corsConfig.resolverOrigenesPermitidos(" https://sciem.umss.edu.bo , http://localhost , https://localhost ");

        // "http://localhost" y "https://localhost" ya vienen por defecto: no se duplican.
        assertEquals(ORIGENES_POR_DEFECTO + 1, origenes.size());
        assertTrue(origenes.contains("https://sciem.umss.edu.bo"));
        assertTrue(origenes.contains("http://localhost"));
        assertTrue(origenes.contains("https://localhost"));
        assertTrue(origenes.contains("http://localhost:5173"));
        assertTrue(origenes.contains("http://localhost:4173"));
    }

    @Test
    @DisplayName("Debe manejar valor nulo o vacío sin generar orígenes en blanco")
    void testValorVacioONulo() {
        List<String> origenesVacio = corsConfig.resolverOrigenesPermitidos("   ");
        List<String> origenesNulo = corsConfig.resolverOrigenesPermitidos(null);

        assertEquals(ORIGENES_POR_DEFECTO, origenesVacio.size());
        assertTrue(origenesVacio.contains("http://localhost:5173"));
        assertTrue(origenesVacio.contains("http://localhost:4173"));

        assertEquals(ORIGENES_POR_DEFECTO, origenesNulo.size());
        assertTrue(origenesNulo.contains("http://localhost:5173"));
        assertTrue(origenesNulo.contains("http://localhost:4173"));
    }

    @Test
    @DisplayName("Debe tolerar comas finales o elementos vacíos (error típico en YAML)")
    void testComaFinal() {
        List<String> origenes = corsConfig.resolverOrigenesPermitidos("https://sciem.umss.edu.bo,http://localhost,");

        // "http://localhost" ya viene por defecto: no se duplica.
        assertEquals(ORIGENES_POR_DEFECTO + 1, origenes.size());
        assertTrue(origenes.contains("https://sciem.umss.edu.bo"));
        assertTrue(origenes.contains("http://localhost"));
        assertTrue(origenes.contains("http://localhost:5173"));
        assertTrue(origenes.contains("http://localhost:4173"));
        assertFalse(origenes.contains(""));
    }
}
