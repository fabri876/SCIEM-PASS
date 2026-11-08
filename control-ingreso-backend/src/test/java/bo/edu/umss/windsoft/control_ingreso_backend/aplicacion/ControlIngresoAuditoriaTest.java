package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControlIngresoAuditoriaTest {
    @Mock AyudanteExamenRepository ayudanteExamenRepository;
    @Mock AsignaturaRepository asignaturaRepository;
    @Mock ExamenRepository examenRepository;
    @Mock AmbienteRepository ambienteRepository;
    @Mock AulaRepository aulaRepository;
    @Mock TipoExamenRepository tipoExamenRepository;
    @Mock HabilitacionRepository habilitacionRepository;
    @Mock IngresoRepository ingresoRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock EstudianteRepository estudianteRepository;
    @Mock GrupoRepository grupoRepository;
    @Mock CredencialRepository credencialRepository;
    @Mock CarreraEstudianteRepository carreraEstudianteRepository;
    @Mock AsignacionAulaService asignacionAulaService;
    @Mock IntentoIngresoService intentoIngresoService;
    @Mock AuditoriaService auditoriaService;
    @Mock IntentoExamenIncorrectoService intentoExamenIncorrectoService;
    @InjectMocks ControlIngresoAyudanteService service;

    @BeforeEach
    void preparar() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "admin@umss.edu", null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
        Examen examen = new Examen();
        examen.setIdExamen(2); examen.setIdAsignatura(1); examen.setIdUsuario(20);
        Ambiente ambiente = new Ambiente();
        ambiente.setIdAmbiente(3); ambiente.setIdExamen(2); ambiente.setIdAsignatura(1);
        lenient().when(examenRepository.findById(2)).thenReturn(Optional.of(examen));
        lenient().when(ambienteRepository.findById(3)).thenReturn(Optional.of(ambiente));
        Estudiante estudiante = new Estudiante(10, 12345);
        Usuario usuario = new Usuario("123456", "Ana", "Perez", 70000000, "ana@umss.edu", "hash", true);
        usuario.setIdusuario(10);
        Usuario operador = new Usuario("456789", "Operador", "Prueba", 70000001, "op@umss.edu", "hash", true);
        operador.setIdusuario(20);
        Habilitacion habilitacion = new Habilitacion(estudiante, true, null);
        when(estudianteRepository.findByCodsisestudiante(12345)).thenReturn(Optional.of(estudiante));
        when(usuarioRepository.findById(10)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.findById(20)).thenReturn(Optional.of(operador));
        when(habilitacionRepository.findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(1, 2, 12345))
                .thenReturn(Optional.of(habilitacion));
    }

    @AfterEach
    void limpiar() { SecurityContextHolder.clearContext(); }

    @Test
    void ingresoOfflineExitosoSeAuditaConOperadorEIp() {
        var dto = new VerificarIngresoRequestDTO("12345", 1, 2, 3, MetodoIngreso.MANUAL);
        var respuesta = service.registrarIngreso(dto, 20, LocalDateTime.of(2026, 11, 4, 9, 0), "uuid", "10.0.0.1");
        assertEquals(201, respuesta.getStatusCode().value());
        verify(ingresoRepository).saveAndFlush(any(Ingreso.class));
        verify(auditoriaService).registrarEnTransaccion(eq("REGISTRO_INGRESO"), eq("op@umss.edu"),
                eq("ana@umss.edu"), contains("examen=2, ambiente=3"), eq("10.0.0.1"));
    }

    @Test
    void ingresoOnlineExitosoSeAudita() {
        var dto = new VerificarIngresoRequestDTO("12345", 1, 2, 3, MetodoIngreso.MANUAL);
        var respuesta = service.registrarIngreso(dto, 20, "10.0.0.2");
        assertEquals(201, respuesta.getStatusCode().value());
        verify(auditoriaService).registrarEnTransaccion(eq("REGISTRO_INGRESO"), eq("op@umss.edu"),
                eq("ana@umss.edu"), contains("examen=2, ambiente=3"), eq("10.0.0.2"));
    }

    @Test
    void falloDeAuditoriaNoSeConfirmaComoExito() {
        doThrow(new IllegalStateException("auditoria no disponible")).when(auditoriaService)
                .registrarEnTransaccion(eq("REGISTRO_INGRESO"), anyString(), anyString(), anyString(), anyString());
        var dto = new VerificarIngresoRequestDTO("12345", 1, 2, 3, MetodoIngreso.MANUAL);
        assertThrows(IllegalStateException.class, () -> service.registrarIngreso(
                dto, 20, LocalDateTime.of(2026, 11, 4, 9, 0), "uuid", "10.0.0.1"));
    }
}
