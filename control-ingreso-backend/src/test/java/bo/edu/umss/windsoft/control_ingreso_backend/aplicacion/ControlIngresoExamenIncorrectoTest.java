package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository.Guardado;
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
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControlIngresoExamenIncorrectoTest {
    @Mock AyudanteExamenRepository asignaciones;
    @Mock AsignaturaRepository asignaturas;
    @Mock ExamenRepository examenes;
    @Mock AmbienteRepository ambientes;
    @Mock AulaRepository aulas;
    @Mock TipoExamenRepository tipos;
    @Mock HabilitacionRepository habilitaciones;
    @Mock IngresoRepository ingresos;
    @Mock UsuarioRepository usuarios;
    @Mock EstudianteRepository estudiantes;
    @Mock GrupoRepository grupos;
    @Mock CredencialRepository credenciales;
    @Mock CarreraEstudianteRepository carreras;
    @Mock AsignacionAulaService reparto;
    @Mock IntentoIngresoService intentos;
    @Mock AuditoriaService auditoria;
    @Mock IntentoExamenIncorrectoService incorrectos;
    @InjectMocks ControlIngresoAyudanteService servicio;
    private final UUID solicitud = UUID.randomUUID();

    @BeforeEach void preparar() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
        Examen examen = new Examen(); examen.setIdExamen(2); examen.setIdAsignatura(1);
        Ambiente ambiente = new Ambiente(); ambiente.setIdAmbiente(3); ambiente.setIdExamen(2); ambiente.setIdAsignatura(1);
        when(examenes.findById(2)).thenReturn(Optional.of(examen));
        when(ambientes.findById(3)).thenReturn(Optional.of(ambiente));
    }
    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }

    @Test void estudianteSinProgramacionRegistraIntentoYDeniega() {
        var estudiante = new Estudiante(10, 123456);
        var usuario = new Usuario("1234567", "Ana", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(estudiante));
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        when(carreras.nombres(10, 123456)).thenReturn(List.of("Ingenieria de Sistemas"));
        when(incorrectos.registrar(any(), any(), any(), any())).thenAnswer(i -> new Guardado(55, i.getArgument(0)));
        var dto = new VerificarIngresoRequestDTO("123456", 1, 2, 3, MetodoIngreso.MANUAL, solicitud);
        var respuesta = servicio.registrarIngreso(dto, 20, "ip");
        assertEquals(409, respuesta.getStatusCode().value());
        assertEquals("EXAMEN_INCORRECTO", respuesta.getBody().estado());
        assertTrue(respuesta.getBody().intentoRegistrado());
        assertEquals("Ingenieria de Sistemas", respuesta.getBody().estudiante().carrera());
        assertNull(respuesta.getBody().otroExamen());
        verify(incorrectos).registrar(argThat(d -> d.solicitud().equals(solicitud) && d.metodo().equals("SIS")),
                any(), eq("est@example.invalid"), eq("ip"));
        verify(ingresos, never()).saveAndFlush(any());
    }

    @Test void sisInexistenteNoRegistraIntentoIncorrecto() {
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.empty());
        when(usuarios.findByCiusuario("123456")).thenReturn(Optional.empty());
        var dto = new VerificarIngresoRequestDTO("123456", 1, 2, 3, MetodoIngreso.MANUAL, solicitud);
        assertEquals(404, servicio.registrarIngreso(dto, 20, "ip").getStatusCode().value());
        verifyNoInteractions(incorrectos);
    }

    @Test void qrInvalidoNoRegistraIntentoIncorrecto() {
        var dto = new VerificarIngresoRequestDTO("no-es-qr", 1, 2, 3, MetodoIngreso.ESCANEO, solicitud);
        assertEquals(400, servicio.registrarIngreso(dto, 20, "ip").getStatusCode().value());
        verifyNoInteractions(incorrectos);
    }

    @Test void marcaOfflineSinInscripcionNoAfirmaRegistroHu09() {
        var estudiante = new Estudiante(10, 123456);
        var usuario = new Usuario("1234567", "Ana", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(estudiante));
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        var dto = new VerificarIngresoRequestDTO("123456", 1, 2, 3, MetodoIngreso.MANUAL, solicitud);
        var respuesta = servicio.registrarIngreso(dto, 20, LocalDateTime.now(), "sync", "ip");
        assertEquals(403, respuesta.getStatusCode().value());
        assertFalse(respuesta.getBody().intentoRegistrado());
        verifyNoInteractions(incorrectos);
    }

    @Test void orientaAlExamenDeLaFechaYHoraYNoAlPrimerRegistroHistorico() {
        var estudiante = new Estudiante(10, 123456);
        var usuario = new Usuario("1234567", "Ana", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(estudiante));
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        var anterior = new Habilitacion(); anterior.setIdExamen(40);
        var actual = new Habilitacion(); actual.setIdExamen(50);
        when(habilitaciones.findByEstudianteCodsisestudiante(123456)).thenReturn(List.of(anterior, actual));
        LocalDate hoy = LocalDate.now(ZoneId.of("America/La_Paz"));
        var examenAnterior = new Examen(); examenAnterior.setIdExamen(40); examenAnterior.setFechaExamen(hoy.minusDays(1));
        var examenActual = new Examen(); examenActual.setIdExamen(50); examenActual.setIdAsignatura(7);
        examenActual.setFechaExamen(hoy); examenActual.setDetalleTipoExamen("Primer Parcial");
        when(examenes.findById(40)).thenReturn(Optional.of(examenAnterior));
        when(examenes.findById(50)).thenReturn(Optional.of(examenActual));
        var aulaCorrecta = new Ambiente(); aulaCorrecta.setIdAmbiente(9); aulaCorrecta.setHoraInicio(LocalTime.MIN);
        aulaCorrecta.setHoraFin(LocalTime.MAX);
        when(ambientes.findByIdExamen(50)).thenReturn(List.of(aulaCorrecta));
        when(reparto.aulaAsignada(7, 50, 123456))
                .thenReturn(Optional.of(new AsignacionAulaService.AulaExamen(aulaCorrecta, "Aula 9", "Edificio A", 40)));
        var asignatura = new Asignatura(); asignatura.setNombreAsignatura("Materia correcta");
        when(asignaturas.findById(7)).thenReturn(Optional.of(asignatura));
        when(incorrectos.registrar(any(), any(), any(), any())).thenAnswer(i -> new Guardado(55, i.getArgument(0)));
        var dto = new VerificarIngresoRequestDTO("123456", 1, 2, 3, MetodoIngreso.MANUAL, solicitud);
        var resultado = servicio.registrarIngreso(dto, 20, "ip").getBody();
        assertEquals("Materia correcta", resultado.otroExamen().asignatura());
        assertEquals("Aula 9", resultado.otroExamen().aula());
        assertEquals("Edificio A", resultado.otroExamen().edificio());
        assertEquals(50, resultado.otroExamen().idExamen());
        verify(incorrectos).registrar(argThat(d -> Integer.valueOf(50).equals(d.examenDestino())), any(), any(), any());
    }

    @Test void variosExamenesSimultaneosNoEligenDestinoArbitrario() {
        var estudiante = new Estudiante(10, 123456);
        var usuario = new Usuario("1234567", "Ana", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(estudiante));
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        var primera = new Habilitacion(); primera.setIdExamen(50);
        var segunda = new Habilitacion(); segunda.setIdExamen(51);
        when(habilitaciones.findByEstudianteCodsisestudiante(123456)).thenReturn(List.of(primera, segunda));
        LocalDate hoy = LocalDate.now(ZoneId.of("America/La_Paz"));
        for (int id : List.of(50, 51)) {
            var examen = new Examen(); examen.setIdExamen(id); examen.setIdAsignatura(id); examen.setFechaExamen(hoy);
            when(examenes.findById(id)).thenReturn(Optional.of(examen));
            var ambiente = new Ambiente(); ambiente.setIdAmbiente(id); ambiente.setHoraInicio(LocalTime.MIN); ambiente.setHoraFin(LocalTime.MAX);
            when(ambientes.findByIdExamen(id)).thenReturn(List.of(ambiente));
        }
        when(incorrectos.registrar(any(), any(), any(), any())).thenAnswer(i -> new Guardado(55, i.getArgument(0)));
        var resultado = servicio.registrarIngreso(new VerificarIngresoRequestDTO("123456", 1, 2, 3, MetodoIngreso.MANUAL, solicitud), 20, "ip").getBody();
        assertNull(resultado.otroExamen());
        assertTrue(resultado.mensaje().contains("varios examenes"));
        verify(incorrectos).registrar(argThat(d -> d.examenDestino() == null), any(), any(), any());
    }
}
