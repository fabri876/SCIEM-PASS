package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroUsuarioRequestDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de RegistroUsuarioService (HU1 - Registro de usuarios).
 * No usan la base de datos: los repositorios y el PasswordEncoder son simulados (mocks).
 */
@ExtendWith(MockitoExtension.class)
class RegistroUsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EstudianteRepository estudianteRepository;
    @Mock
    private DocenteRepository docenteRepository;
    @Mock
    private AyudanteRepository ayudanteRepository;
    @Mock
    private AdminRepository adminRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private GrupoService grupoService;

    @InjectMocks
    private RegistroUsuarioService registroUsuarioService;

    @BeforeEach
    void setUp() {
        // Simula que la base de datos asigna el id 1 al guardar un usuario nuevo.
        // lenient(): no todas las pruebas llegan a guardar al usuario.
        lenient().when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacion -> {
            Usuario usuario = invocacion.getArgument(0);
            usuario.setIdusuario(1);
            return usuario;
        });
    }

    /** Crea una solicitud de registro de estudiante con los datos indicados. */
    private RegistroUsuarioRequestDTO solicitudEstudiante(String correo, String contrasena, String ci) {
        var solicitud = new RegistroUsuarioRequestDTO(
                "QA", null, "Unitaria", null,
                "71234567", correo, contrasena, ci, "202301999",
                List.of("estudiante"));
        solicitud.setIdGrupos(List.of(7));
        return solicitud;
    }

    @Test
    @DisplayName("C17 - La contraseña se guarda cifrada (hash), nunca en texto plano")
    void registrarUsuario_guardaContrasenaConHash() {
        when(passwordEncoder.encode("ClaveSegura2026")).thenReturn("$2a$10$hashSimulado");

        registroUsuarioService.registrarUsuario(
                solicitudEstudiante("qa.unit01@test.com", "ClaveSegura2026", "9800901"));

        ArgumentCaptor<Usuario> usuarioGuardado = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(usuarioGuardado.capture());

        String contrasenaGuardada = usuarioGuardado.getValue().getContraseniausuario();
        assertEquals("$2a$10$hashSimulado", contrasenaGuardada);
        assertNotEquals("ClaveSegura2026", contrasenaGuardada);
    }

    @Test
    @DisplayName("C19 - El correo se normaliza (minúsculas y sin espacios) antes de verificar duplicados")
    void registrarUsuario_normalizaCorreoAntesDeVerificarDuplicado() {
        when(usuarioRepository.existsByCorreousuario("qa.unit02@test.com")).thenReturn(true);

        assertThrows(RuntimeException.class, () ->
                registroUsuarioService.registrarUsuario(
                        solicitudEstudiante("   QA.Unit02@TEST.com   ", "ClaveSegura2026", "9800902")));

        // Buscó el correo ya normalizado y, al estar duplicado, no guardó al usuario.
        verify(usuarioRepository).existsByCorreousuario("qa.unit02@test.com");
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("C30 - Si no se envía contraseña, se usa el carnet de identidad como contraseña inicial")
    void registrarUsuario_sinContrasenaUsaCarnetDeIdentidad() {
        when(passwordEncoder.encode("9800903")).thenReturn("$2a$10$hashDelCarnet");

        registroUsuarioService.registrarUsuario(
                solicitudEstudiante("qa.unit03@test.com", null, "9800903"));

        // Se cifró el CI como contraseña y eso es lo que se guardó.
        verify(passwordEncoder).encode("9800903");

        ArgumentCaptor<Usuario> usuarioGuardado = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(usuarioGuardado.capture());
        assertEquals("$2a$10$hashDelCarnet", usuarioGuardado.getValue().getContraseniausuario());
    }
}
