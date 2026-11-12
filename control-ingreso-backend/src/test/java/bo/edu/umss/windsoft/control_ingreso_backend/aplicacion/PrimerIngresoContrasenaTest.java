package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrimerIngresoContrasenaTest {

    @Mock private UsuarioRepository usuarios;
    @Mock private DocenteRepository docentes;
    @Mock private AyudanteRepository ayudantes;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwt;
    @Mock private AuditoriaService auditoria;
    @Mock private UsuarioRespuestaMapper mapper;
    @Mock private TipoUsuarioResolver roles;
    @Mock private UsuarioBloqueoService bloqueo;
    @InjectMocks private AuthService authService;

    @Test
    void cambioValidoQuitaMarcaDePrimerIngresoYGeneraNuevoHash() {
        Usuario usuario = usuarioPendiente();
        when(usuarios.findByCorreousuario("usuario@umss.edu")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("1234567", "hash-ci")).thenReturn(true);
        when(passwordEncoder.encode("Roca!Verde2026#")).thenReturn("hash-nuevo");

        authService.cambiarContrasena("usuario@umss.edu", "1234567", "Roca!Verde2026#", "127.0.0.1");

        assertFalse(usuario.getDebeCambiarContrasena());
        assertEquals("hash-nuevo", usuario.getContraseniausuario());
        verify(usuarios).save(usuario);
    }

    @Test
    void cambioRechazaClaveQueContieneLaActualSinActualizarHash() {
        Usuario usuario = usuarioPendiente();
        when(usuarios.findByCorreousuario("usuario@umss.edu")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("ClaveVieja!", "hash-ci")).thenReturn(true);

        SolicitudInvalidaException error = assertThrows(SolicitudInvalidaException.class,
                () -> authService.cambiarContrasena("usuario@umss.edu", "ClaveVieja!", "Roca!ClaveVieja!2026#", "127.0.0.1"));

        assertTrue(error.getMessage().contains("contener"));
        assertTrue(usuario.getDebeCambiarContrasena());
        verify(passwordEncoder, never()).encode(anyString());
        verify(usuarios, never()).save(any());
    }

    private Usuario usuarioPendiente() {
        Usuario usuario = new Usuario("1234567", "Ana", "Prueba", null,
                "usuario@umss.edu", "hash-ci", true);
        usuario.setIdusuario(7);
        usuario.setDebeCambiarContrasena(true);
        return usuario;
    }

    @Test
    void ningunaClaveInferiorANivelOchoSeGuardaNiQuitaElAviso() {
        Usuario usuario=usuarioPendiente();
        when(usuarios.findByCorreousuario("usuario@umss.edu")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("1234567","hash-ci")).thenReturn(true);
        for(String clave:java.util.List.of("Roca!7", "ROCAVERDE2026!", "rocaverde2026!",
                "Roca!VerdeMenta", "Roca Verde2026", "Roca!AaAVerde7", "Roca!AbcVerde7")) {
            assertThrows(SolicitudInvalidaException.class,
                ()->authService.cambiarContrasena("usuario@umss.edu","1234567",clave,"127.0.0.1"));
            assertTrue(usuario.getDebeCambiarContrasena());
            assertEquals("hash-ci",usuario.getContraseniausuario());
        }
        verify(passwordEncoder,never()).encode(anyString());
        verify(usuarios,never()).save(any());
    }
}
