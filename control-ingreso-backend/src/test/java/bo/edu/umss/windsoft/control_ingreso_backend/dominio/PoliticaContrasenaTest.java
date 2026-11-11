package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PoliticaContrasenaTest {

    @Test
    void aceptaContrasenaDeNivelOcho() {
        assertTrue(PoliticaContrasena.validarNivelOcho("Roca!Verde2026#").isEmpty());
    }

    @Test
    void rechazaRepeticionYSecuencias() {
        assertTrue(PoliticaContrasena.validarNivelOcho("Roca!!!Verde2026").orElseThrow().contains("repetir"));
        assertTrue(PoliticaContrasena.validarNivelOcho("Clave!Abc2026#").orElseThrow().contains("secuencias"));
        assertTrue(PoliticaContrasena.validarNivelOcho("Clave!3212026#").orElseThrow().contains("secuencias"));
    }

    @Test
    void rechazaContrasenaActualOContenidoDeLaActual() {
        assertTrue(PoliticaContrasena.validarCambio("MiClave!2025", "MiClave!2025").orElseThrow().contains("distinta"));
        assertTrue(PoliticaContrasena.validarCambio("MiClave!2025", "Roca!MiClave!2025#").orElseThrow().contains("contener"));
    }
}
