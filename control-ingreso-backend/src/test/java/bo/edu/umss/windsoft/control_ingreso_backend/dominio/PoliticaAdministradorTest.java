package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PoliticaAdministradorTest {

    @Test
    void permiteCrearElPrimerAdministrador() {
        assertDoesNotThrow(() -> PoliticaAdministrador.validarPuedeExistirOtro(0));
    }

    @Test
    void bloqueaUnSegundoAdministrador() {
        var error = assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarPuedeExistirOtro(1));
        assertTrue(error.getMessage().contains("Solo se permite un administrador"));
    }

    @Test
    void noPermiteRetirarAlUnicoAdministrador() {
        var error = assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarPuedeRetirarse(1));
        assertTrue(error.getMessage().contains("unico administrador"));
    }

    @Test
    void permiteRetirarCuandoHayMasDeUnAdministrador() {
        assertDoesNotThrow(() -> PoliticaAdministrador.validarPuedeRetirarse(2));
    }
}
