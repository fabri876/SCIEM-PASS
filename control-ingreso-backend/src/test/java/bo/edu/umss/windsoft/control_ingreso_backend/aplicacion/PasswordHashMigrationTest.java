package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CredencialesInvalidasException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.PasswordEncoderConfig;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordHashMigrationTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final UsuarioBloqueoService bloqueo = mock(UsuarioBloqueoService.class);
    private final PasswordEncoder encoder = new PasswordEncoderConfig().passwordEncoder();
    private final AuthService auth = new AuthService(usuarios, mock(DocenteRepository.class),
            mock(AyudanteRepository.class), encoder, mock(JwtTokenProvider.class),
            mock(AuditoriaService.class), mock(UsuarioRespuestaMapper.class),
            mock(TipoUsuarioResolver.class), bloqueo);
    private Usuario usuario;

    @BeforeEach void preparar() {
        usuario = new Usuario("1234567", "Persona", "Prueba", 71234567,
                "prueba@example.test", new BCryptPasswordEncoder().encode("Anterior!"), true);
        usuario.setIdusuario(1);
        when(usuarios.findByCorreousuario("prueba@example.test")).thenReturn(Optional.of(usuario));
    }

    @Test void loginCorrectoMigraUnaVezSinCambiarLaClave() {
        auth.login("prueba@example.test", "Anterior!", "127.0.0.1");
        String migrated = usuario.getContraseniausuario();
        assertTrue(migrated.startsWith("{argon2id}"));
        assertTrue(encoder.matches("Anterior!", migrated));
        verify(usuarios).save(usuario);
        auth.login("prueba@example.test", "Anterior!", "127.0.0.1");
        assertEquals(migrated, usuario.getContraseniausuario());
        verifyNoInteractions(bloqueo);
    }

    @Test void loginIncorrectoNoMigraNiAceptaLaClave() {
        String original = usuario.getContraseniausuario();
        when(bloqueo.registrarIntentoFallido(1)).thenReturn(usuario);
        assertThrows(CredencialesInvalidasException.class,
                () -> auth.login("prueba@example.test", "incorrecta", "127.0.0.1"));
        assertEquals(original, usuario.getContraseniausuario());
        verify(usuarios, never()).save(any());
    }

    @Test void cuentaInactivaNoMigra() {
        usuario.setEstadousuario(false);
        String original = usuario.getContraseniausuario();
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaInactivaException.class,
                () -> auth.login("prueba@example.test", "Anterior!", "127.0.0.1"));
        assertEquals(original, usuario.getContraseniausuario());
        verify(usuarios, never()).save(any());
    }
}
