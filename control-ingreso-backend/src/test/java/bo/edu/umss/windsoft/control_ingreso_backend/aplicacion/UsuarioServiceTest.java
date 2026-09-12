package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroUsuarioRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioResponseDTO;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

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

    private UsuarioService usuarioService;

    @BeforeEach
    void setUp() {
        usuarioService = new UsuarioService(
                usuarioRepository,
                estudianteRepository,
                docenteRepository,
                ayudanteRepository,
                adminRepository,
                passwordEncoder
        );
    }

    @Test
    void registrarUsuarioEstudiante_Exitoso() {
        RegistroUsuarioRequestDTO dto = new RegistroUsuarioRequestDTO();
        dto.setCarnetIdentidad("1234567");
        dto.setPrimerNombre("Carlos");
        dto.setApellidoPaterno("Perez");
        dto.setCorreo("carlos@umss.edu");
        dto.setContrasena("secret123");
        dto.setCodigoSis(20260101);
        dto.setRoles(List.of("estudiante"));

        when(usuarioRepository.existsByCiusuario("1234567")).thenReturn(false);
        when(usuarioRepository.existsByCorreousuario("carlos@umss.edu")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashedPassword");

        Usuario usuarioSimulado = new Usuario(
                dto.getCarnetIdentidad(),
                dto.obtenerNombreCompleto(),
                dto.obtenerApellidoCompleto(),
                null,
                dto.getCorreo(),
                "hashedPassword",
                true,
                "ESTUDIANTE"
        );
        usuarioSimulado.setIdusuario(10);

        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuarioSimulado);

        UsuarioResponseDTO resultado = usuarioService.registrarUsuario(dto);

        assertNotNull(resultado);
        assertEquals(10, resultado.getIdusuario());
        assertEquals("1234567", resultado.getCiusuario());
        assertEquals(20260101, resultado.getCodigoSis());
        verify(estudianteRepository).save(any(Estudiante.class));
    }

    @Test
    void registrarUsuario_LanzaExcepcionSiCiYaExiste() {
        RegistroUsuarioRequestDTO dto = new RegistroUsuarioRequestDTO();
        dto.setCarnetIdentidad("1234567");
        dto.setCorreo("carlos@umss.edu");

        when(usuarioRepository.existsByCiusuario("1234567")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> usuarioService.registrarUsuario(dto));
    }
}
