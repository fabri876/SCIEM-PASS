package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PoliticaContrasenaTest {

    @Test
    void aceptaContrasenaDeNivelOcho() {
        assertTrue(PoliticaContrasena.validarNivelOcho("Roca!Verde2026#").isEmpty());
    }

    @Test
    void exigeDoceCaracteresAunqueCumplaLosOtrosCriterios() {
        assertTrue(PoliticaContrasena.validarNivelOcho("Vela!Roca7#").orElseThrow().contains("12 caracteres"));
        assertTrue(PoliticaContrasena.validarNivelOcho("Vela!Roca7#Q").isEmpty());
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

    @Test void administradorNoPuedeUsarDatosDeSuIdentidad() {
        assertTrue(PoliticaContrasena.validarAdministrador("Persona!Nube49", "7592468", "persona@example.invalid").isPresent());
        assertTrue(PoliticaContrasena.validarAdministrador("Vela!7592468Nube", "7592468", "persona@example.invalid").isPresent());
        assertTrue(PoliticaContrasena.validarAdministrador("Password!2026#", "7592468", "persona@example.invalid").isPresent());
        assertTrue(PoliticaContrasena.validarAdministrador("Vela$8Nube!49", "7592468", "persona@example.invalid").isEmpty());
    }

    @Test void rechazaPalabraComunAdminYPartesDelCorreoEnCambio() {
        assertTrue(PoliticaContrasena.validarCambio("ClaveVieja!99", "admin#\"!#\"#!\"!\"#!A1", "carlos.mendoza@umss.edu.bo").isPresent());
        assertTrue(PoliticaContrasena.validarCambio("ClaveVieja!99", "Carlos!Nube2026#", "carlos.mendoza@umss.edu.bo").isPresent());
        assertTrue(PoliticaContrasena.validarCambio("ClaveVieja!99", "Mendoza!Nube2026#", "carlos.mendoza@umss.edu.bo").isPresent());
        assertTrue(PoliticaContrasena.validarCambio("ClaveVieja!99", "Nombre!Nube2026#", "nombre@gmail.com").isPresent());
        assertTrue(PoliticaContrasena.validarCambio("ClaveVieja!99", "Vela$8Nube!49", "carlos.mendoza@umss.edu.bo").isEmpty());
    }
}
