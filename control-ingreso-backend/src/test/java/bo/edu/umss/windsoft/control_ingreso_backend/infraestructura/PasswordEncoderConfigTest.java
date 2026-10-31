package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;

class PasswordEncoderConfigTest {
    private final PasswordEncoder encoder = new PasswordEncoderConfig().passwordEncoder();

    @Test void nuevosHashesUsanArgon2idConSaltIndividual() {
        String first = encoder.encode("Clave-de-prueba-2026!");
        String second = encoder.encode("Clave-de-prueba-2026!");
        assertTrue(first.startsWith("{argon2id}$argon2id$v=19$m=19456,t=2,p=1$"));
        assertNotEquals(first, second);
        assertTrue(encoder.matches("Clave-de-prueba-2026!", first));
        assertFalse(encoder.matches("incorrecta", first));
        assertFalse(encoder.upgradeEncoding(first));
        assertTrue(first.length() <= 255);
    }

    @Test void cuentasBcryptHistoricasSiguenAccediendoYRequierenMigracion() {
        String hash = new BCryptPasswordEncoder().encode("Clave-anterior!");
        for (String stored : new String[]{hash, "{bcrypt}" + hash}) {
            assertTrue(encoder.matches("Clave-anterior!", stored));
            assertFalse(encoder.matches("incorrecta", stored));
            assertTrue(encoder.upgradeEncoding(stored));
        }
    }

    @Test void nuncaAceptaTextoPlanoNiHashVacio() {
        assertFalse(encoder.matches("clave", "clave"));
        assertFalse(encoder.matches("clave", ""));
        assertFalse(encoder.matches("clave", null));
        assertFalse(encoder.matches("clave", "{desconocido}clave"));
    }
}
