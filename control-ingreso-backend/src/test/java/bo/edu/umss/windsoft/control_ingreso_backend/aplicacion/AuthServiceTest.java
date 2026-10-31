package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CredencialesInvalidasException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaBloqueadaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaInactivaException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.LoginResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EstudianteRepository estudianteRepository;
    @Mock
    private DocenteRepository docenteRepository;
    @Mock
    private AyudanteRepository ayudanteRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private CloudinaryService cloudinaryService;
    @Mock
    private QrService qrService;
    @Mock
    private AuditoriaService auditoriaService;
    @Mock
    private UsuarioRespuestaMapper usuarioRespuestaMapper;
    @Mock
    private TipoUsuarioResolver tipoUsuarioResolver;
    @Mock
    private UsuarioBloqueoService usuarioBloqueoService;

    @InjectMocks
    private AuthService authService;

    private Usuario usuarioActivo;

    @BeforeEach
    void setUp() {
        usuarioActivo = new Usuario("1234567 CB", "Juan", "Perez", 71234567,
                "admin@umss.edu", "encodedPassword", true);
        usuarioActivo.setIdusuario(1);
    }

    @Test
    void testLoginExitoso() {
        when(usuarioRepository.findByCorreousuario("admin@umss.edu"))
                .thenReturn(Optional.of(usuarioActivo));
        when(passwordEncoder.matches("Password123*", "encodedPassword"))
                .thenReturn(true);
        when(tipoUsuarioResolver.resolver(1)).thenReturn("ADMINISTRADOR");
        when(jwtTokenProvider.generarToken("admin@umss.edu", "ADMINISTRADOR", 1, "Juan"))
                .thenReturn("mock.jwt.token");
        when(jwtTokenProvider.getExpiration()).thenReturn(1800000L);

        UsuarioRespuestaDto usuarioDto = new UsuarioRespuestaDto(
                1, "1234567 CB", "Juan", "Perez", 71234567, "admin@umss.edu",
                true, "ADMINISTRADOR", 0, Collections.emptyList(), null
        );
        when(usuarioRespuestaMapper.mapear(usuarioActivo)).thenReturn(usuarioDto);

        LoginResponseDto response = authService.login("admin@umss.edu", "Password123*", "127.0.0.1");

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getToken());
        assertEquals("Bearer", response.getTipoToken());
        assertEquals(1800000L, response.getExpiresIn());
        assertEquals("ADMINISTRADOR", response.getUsuario().getRol());

        verify(usuarioRepository).save(usuarioActivo);
        verify(auditoriaService).registrar(eq("LOGIN_EXITOSO"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void testLoginUsuarioNoEncontradoLanzaExcepcion() {
        when(usuarioRepository.findByCorreousuario("inexistente@umss.edu"))
                .thenReturn(Optional.empty());

        assertThrows(CredencialesInvalidasException.class, () ->
                authService.login("inexistente@umss.edu", "Password123*", "127.0.0.1")
        );

        verify(auditoriaService).registrar(eq("LOGIN_FALLIDO"), eq("SISTEMA"), eq("inexistente@umss.edu"), anyString(), eq("127.0.0.1"));
    }

    @Test
    void testLoginCuentaInactivaLanzaExcepcion() {
        Usuario usuarioInactivo = new Usuario("8765432 CB", "Carlos", "Mamani", 78945612,
                "carlos@umss.edu", "encodedPassword", false);
        usuarioInactivo.setIdusuario(2);

        when(usuarioRepository.findByCorreousuario("carlos@umss.edu"))
                .thenReturn(Optional.of(usuarioInactivo));

        assertThrows(CuentaInactivaException.class, () ->
                authService.login("carlos@umss.edu", "Password123*", "127.0.0.1")
        );

        verify(auditoriaService).registrar(eq("LOGIN_FALLIDO"), eq("SISTEMA"), eq("carlos@umss.edu"), anyString(), eq("127.0.0.1"));
    }

    @Test
    void testLoginContrasenaIncorrectaIncrementaIntentos() {
        when(usuarioBloqueoService.registrarIntentoFallido(1)).thenAnswer(invocation -> {
            usuarioActivo.registrarIntentoFallido();
            return usuarioActivo;
        });
        when(usuarioRepository.findByCorreousuario("admin@umss.edu"))
                .thenReturn(Optional.of(usuarioActivo));
        when(passwordEncoder.matches("wrongPassword", "encodedPassword"))
                .thenReturn(false);

        CredencialesInvalidasException exception = assertThrows(CredencialesInvalidasException.class, () ->
                authService.login("admin@umss.edu", "wrongPassword", "127.0.0.1")
        );

        assertTrue(exception.getMessage().contains("Intento 1 de 5"));
        assertEquals(1, usuarioActivo.getIntentosFallidos());
        verify(usuarioBloqueoService).registrarIntentoFallido(1);
        verify(usuarioRepository, never()).save(any());
        verify(auditoriaService).registrar(eq("LOGIN_FALLIDO"), eq("SISTEMA"), eq("admin@umss.edu"), anyString(), eq("127.0.0.1"));
    }

    @Test
    void testLoginBloqueoCuentaTrasCincoIntentosFallidos() {
        usuarioActivo.setIntentosFallidos(4);
        when(usuarioBloqueoService.registrarIntentoFallido(1)).thenAnswer(invocation -> {
            usuarioActivo.registrarIntentoFallido();
            return usuarioActivo;
        });

        when(usuarioRepository.findByCorreousuario("admin@umss.edu"))
                .thenReturn(Optional.of(usuarioActivo));
        when(passwordEncoder.matches("wrongPassword", "encodedPassword"))
                .thenReturn(false);

        CuentaBloqueadaException exception = assertThrows(CuentaBloqueadaException.class, () ->
                authService.login("admin@umss.edu", "wrongPassword", "127.0.0.1")
        );

        assertTrue(exception.getMessage().contains("Cuenta bloqueada temporalmente por 5 intentos fallidos"));
        assertEquals(5, usuarioActivo.getIntentosFallidos());
        assertTrue(usuarioActivo.isBloqueado());
        verify(usuarioBloqueoService).registrarIntentoFallido(1);
        verify(usuarioRepository, never()).save(any());
        verify(auditoriaService).registrar(eq("CUENTA_BLOQUEADA"), eq("SISTEMA"), eq("admin@umss.edu"), anyString(), eq("127.0.0.1"));
    }

    @Test
    void testLoginCuentaYaBloqueadaLanzaExcepcionInmediata() {
        usuarioActivo.setIntentosFallidos(5);

        when(usuarioRepository.findByCorreousuario("admin@umss.edu"))
                .thenReturn(Optional.of(usuarioActivo));

        assertThrows(CuentaBloqueadaException.class, () ->
                authService.login("admin@umss.edu", "Password123*", "127.0.0.1")
        );

        verify(auditoriaService).registrar(eq("LOGIN_FALLIDO"), eq("SISTEMA"), eq("admin@umss.edu"), anyString(), eq("127.0.0.1"));
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }
}
