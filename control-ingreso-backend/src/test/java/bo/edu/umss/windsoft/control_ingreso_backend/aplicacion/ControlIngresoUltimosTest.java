package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControlIngresoUltimosTest {
    @Mock ExamenRepository examenes;
    @Mock AmbienteRepository ambientes;
    @Mock IngresoRepository ingresos;
    @Mock IntentoNoAutorizadoRepository intentos;
    @Mock UsuarioRepository usuarios;
    @Mock EstudianteRepository estudiantes;
    @Mock CarreraEstudianteRepository carreras;
    @Mock FaceEnrollmentRepository faceEnrollmentRepository;
    @InjectMocks ControlIngresoAyudanteService servicio;

    @BeforeEach void preparar() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
        Examen ex = new Examen(); ex.setIdExamen(2); ex.setIdAsignatura(1);
        Ambiente amb = new Ambiente(); amb.setIdAmbiente(3); amb.setIdExamen(2); amb.setIdAsignatura(1);
        when(examenes.findById(2)).thenReturn(Optional.of(ex));
        when(ambientes.findById(3)).thenReturn(Optional.of(amb));
    }
    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }

    @Test void combinaIngresoYRechazoEnOrdenDeHora() {
        var ingreso = mock(Ingreso.class);
        when(ingreso.getIdUsuarioEstudiante()).thenReturn(10);
        when(ingreso.getCodsisEstudiante()).thenReturn(123);
        when(ingreso.getHoraIngreso()).thenReturn(LocalDateTime.of(2026, 11, 6, 8, 0));
        var intento = mock(IntentoNoAutorizado.class);
        when(intento.getIdUsuarioEstudiante()).thenReturn(10);
        when(intento.getCodsisEstudiante()).thenReturn(123);
        when(intento.getIdUsuarioRegistra()).thenReturn(20);
        when(intento.getHoraIntento()).thenReturn(LocalDateTime.of(2026, 11, 6, 8, 5));
        when(intento.getMotivo()).thenReturn(MotivoIntento.EXAMEN_INCORRECTO);
        when(intento.getMetodoVerificacion()).thenReturn("SIS");
        when(carreras.nombres(10, 123)).thenReturn(List.of("Ingenieria de Sistemas"));
        when(ingresos.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByHoraIngresoDesc(1, 2, 3)).thenReturn(List.of(ingreso));
        when(intentos.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByHoraIntentoDesc(1, 2, 3)).thenReturn(List.of(intento));
        var resultado = servicio.obtenerUltimosIngresos(1, 2, 3, 5, 20, false);
        assertEquals(2, resultado.size());
        assertEquals("EXAMEN_INCORRECTO", resultado.get(0).estado());
        assertEquals("SIS", resultado.get(0).metodoIngreso());
        assertEquals("PERMITIDO", resultado.get(1).estado());
        assertEquals("Ingenieria de Sistemas", resultado.get(0).estudiante().carrera());
        assertEquals("Ingenieria de Sistemas", resultado.get(1).estudiante().carrera());
    }
}
