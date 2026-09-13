package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private static final String SECRET = "WindSoftTIS2026ClaveSecretaParaTokensSuperSegura123456789ABCDEF";
    private static final long EXPIRATION_MS = 1800000; // 30 minutos

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, EXPIRATION_MS);
    }

    @Test
    void testGenerarYValidarTokenExitoso() {
        String correo = "admin@umss.edu";
        String rol = "ADMINISTRADOR";
        Integer idUsuario = 42;
        String nombre = "Admin Sistema";

        String token = jwtTokenProvider.generarToken(correo, rol, idUsuario, nombre);

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validarToken(token));
        assertEquals(correo, jwtTokenProvider.obtenerCorreo(token));
        assertEquals(rol, jwtTokenProvider.obtenerRol(token));
        assertEquals(idUsuario, jwtTokenProvider.obtenerIdUsuario(token));
        assertEquals(nombre, jwtTokenProvider.obtenerNombre(token));
    }

    @Test
    void testTokenInvalidoRetornaFalse() {
        assertFalse(jwtTokenProvider.validarToken("token-falso-invalido-12345"));
    }

    @Test
    void testTokenExpiradoRetornaFalse() {
        // Proveedor con tiempo de expiración negativo (-1 segundo)
        JwtTokenProvider expiredProvider = new JwtTokenProvider(SECRET, -1000);
        String expiredToken = expiredProvider.generarToken("expirado@umss.edu", "ESTUDIANTE", 99, "Estudiante");

        assertFalse(jwtTokenProvider.validarToken(expiredToken));
    }
}
