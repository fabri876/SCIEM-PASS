package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CorsConfigTest {

    private final CorsConfig corsConfig = new CorsConfig();

    @Test
    @DisplayName("Debe resolver un solo origen configurado y preservar los defaults")
    void testUnSoloOrigen() {
        List<String> origenes = corsConfig.resolverOrigenesPermitidos("https://sciem.umss.edu.bo");

        assertEquals(3, origenes.size());
        assertTrue(origenes.contains("https://sciem.umss.edu.bo"));
        assertTrue(origenes.contains("http://localhost:5173"));
        assertTrue(origenes.contains("http://localhost:4173"));
    }

    @Test
    @DisplayName("Debe resolver múltiples orígenes con espacios y recortarlos")
    void testMultiplesOrigenesConEspacios() {
        List<String> origenes = corsConfig.resolverOrigenesPermitidos(" https://sciem.umss.edu.bo , http://localhost , https://localhost ");

        assertEquals(5, origenes.size());
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

        assertEquals(2, origenesVacio.size());
        assertTrue(origenesVacio.contains("http://localhost:5173"));
        assertTrue(origenesVacio.contains("http://localhost:4173"));

        assertEquals(2, origenesNulo.size());
        assertTrue(origenesNulo.contains("http://localhost:5173"));
        assertTrue(origenesNulo.contains("http://localhost:4173"));
    }

    @Test
    @DisplayName("Debe tolerar comas finales o elementos vacíos (error típico en YAML)")
    void testComaFinal() {
        List<String> origenes = corsConfig.resolverOrigenesPermitidos("https://sciem.umss.edu.bo,http://localhost,");

        assertEquals(4, origenes.size());
        assertTrue(origenes.contains("https://sciem.umss.edu.bo"));
        assertTrue(origenes.contains("http://localhost"));
        assertTrue(origenes.contains("http://localhost:5173"));
        assertTrue(origenes.contains("http://localhost:4173"));
        assertFalse(origenes.contains(""));
    }
}

