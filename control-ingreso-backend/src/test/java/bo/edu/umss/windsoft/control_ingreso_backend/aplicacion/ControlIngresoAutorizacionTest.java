package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControlIngresoAutorizacionTest {
    @Mock ExamenRepository examenes;
    @Mock AmbienteRepository ambientes;
    @Mock AyudanteExamenRepository asignaciones;
    @Mock EstudianteRepository estudiantes;
    @Mock UsuarioRepository usuarios;
    @InjectMocks ControlIngresoAyudanteService servicio;
    final VerificarIngresoRequestDTO dto = new VerificarIngresoRequestDTO("123456", 1, 2, 3, MetodoIngreso.MANUAL);

    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }
    void rol(String rol) { SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            "usuario", null, List.of(new SimpleGrantedAuthority("ROLE_" + rol)))); }
    void examenYAula(int docente, int examenAula) {
        Examen examen = new Examen(); examen.setIdAsignatura(1); examen.setIdExamen(2); examen.setIdUsuario(docente);
        Ambiente ambiente = new Ambiente(); ambiente.setIdAsignatura(1); ambiente.setIdExamen(examenAula); ambiente.setIdAmbiente(3);
        when(examenes.findById(2)).thenReturn(Optional.of(examen));
        when(ambientes.findById(3)).thenReturn(Optional.of(ambiente));
    }
    @Test void docenteDeOtroExamenNoPuedeVerificar() {
        rol("DOCENTE"); examenYAula(99, 2);
        assertThrows(AccessDeniedException.class, () -> servicio.registrarIngreso(dto, 10, "ip"));
        verifyNoInteractions(estudiantes);
    }
    @Test void adminNoPuedeCombinarAulaDeOtroExamen() {
        rol("ADMINISTRADOR"); examenYAula(99, 7);
        assertThrows(AccessDeniedException.class, () -> servicio.registrarIngreso(dto, 10, "ip"));
        verifyNoInteractions(estudiantes);
    }
    @Test void docenteResponsablePuedeVerificarSinInventarEstudiante() {
        rol("DOCENTE"); examenYAula(10, 2);
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.empty());
        when(usuarios.findByCiusuario("123456")).thenReturn(Optional.empty());
        assertEquals(404, servicio.registrarIngreso(dto, 10, "ip").getStatusCode().value());
    }
    @Test void operadorSinAsignacionNoPuedeVerificar() {
        rol("OPERADOR"); examenYAula(99, 2);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> servicio.registrarIngreso(dto, 10, "ip"));
        verifyNoInteractions(estudiantes);
    }
}
