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

    @Test
    void aceptaCorreoInstitucionalValidoDeAdministrador() {
        assertDoesNotThrow(() -> PoliticaAdministrador.validarCorreoInstitucional("carlos.mendoza@umss.edu.bo"));
        assertDoesNotThrow(() -> PoliticaAdministrador.validarCorreoInstitucional("Carlos.Mendoza.Rojas@umss.edu.bo"));
    }

    @Test
    void rechazaCorreosGenericosONoInstitucionalesParaAdministrador() {
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("admin@gmail.com"));
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("carlos.mendoza@gmail.com"));
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("carlos@umss.edu.bo"));
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("admin.sistema@umss.edu.bo"));
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("administrador.umss@umss.edu.bo"));
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("root.cuenta@umss.edu.bo"));
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("test.cuenta@umss.edu.bo"));
        assertThrows(SolicitudInvalidaException.class,
                () -> PoliticaAdministrador.validarCorreoInstitucional("usuario.uno@umss.edu.bo"));
    }
}
