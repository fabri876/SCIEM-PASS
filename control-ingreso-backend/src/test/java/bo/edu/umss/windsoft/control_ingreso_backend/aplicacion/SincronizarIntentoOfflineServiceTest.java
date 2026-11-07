package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SincronizarIntentoOfflineServiceTest {
    final ControlIngresoAyudanteService control = mock(ControlIngresoAyudanteService.class);
    final IntentoExamenIncorrectoService intentos = mock(IntentoExamenIncorrectoService.class);
    final IntentoExamenIncorrectoRepository repo = mock(IntentoExamenIncorrectoRepository.class);
    final EstudianteRepository estudiantes = mock(EstudianteRepository.class);
    final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    final HabilitacionRepository habilitaciones = mock(HabilitacionRepository.class);
    final ExamenRepository examenes = mock(ExamenRepository.class);
    final AmbienteRepository ambientes = mock(AmbienteRepository.class);
    final CredencialRepository credenciales = mock(CredencialRepository.class);
    final SincronizarIntentoOfflineService servicio = new SincronizarIntentoOfflineService(control, intentos, repo,
            estudiantes, usuarios, habilitaciones, examenes, ambientes, credenciales);
    final SincronizarIntentoOfflineService.Solicitud solicitud = new SincronizarIntentoOfflineService.Solicitud(
            UUID.randomUUID(), 1, 2, 3, 123456, 4, 5, 6, "SIS", null, null, System.currentTimeMillis());

    @Test void sinPermisoNoRegistraNiConsultaEstudiante() {
        doThrow(new AccessDeniedException("sin permiso")).when(control).validarAsignacionDeControl(any(), eq(7));
        assertThrows(AccessDeniedException.class, () -> servicio.sincronizar(solicitud, 7, "ip"));
        verifyNoInteractions(estudiantes, intentos, repo);
    }

    @Test void siYaNoExisteEscenarioPideRevisionSinInsertar() {
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(new Estudiante(10, 123456)));
        var usuario = new Usuario("1", "Ficticio", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        assertThrows(ResponseStatusException.class, () -> servicio.sincronizar(solicitud, 7, "ip"));
        verifyNoInteractions(intentos);
    }

    @Test void unaClaveExistenteNoAceptaOtroDestino() {
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(new Estudiante(10, 123456)));
        var usuario = new Usuario("1", "Ficticio", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        var datos = new IntentoExamenIncorrectoRepository.Datos(solicitud.clientUuid(), 1, 2, 3, 7, 10, 123456, "SIS", 4, 5, 99);
        when(repo.buscar(solicitud.clientUuid())).thenReturn(Optional.of(new IntentoExamenIncorrectoRepository.Guardado(11, datos)));
        assertThrows(ResponseStatusException.class, () -> servicio.sincronizar(solicitud, 7, "ip"));
        verifyNoInteractions(intentos);
    }

    @Test void huellaSinCredencialQrNoAutorizaSincronizacion() {
        var qr = new SincronizarIntentoOfflineService.Solicitud(UUID.randomUUID(), 1, 2, 3, 123456,
                4, 5, 6, "QR", "a".repeat(64), null, System.currentTimeMillis());
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(new Estudiante(10, 123456)));
        var usuario = new Usuario("1", "Ficticio", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        var examen = new bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen();
        examen.setFechaExamen(LocalDate.now(ZoneId.of("America/La_Paz")));
        var ambiente = new bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente();
        ambiente.setHoraInicio(LocalTime.MIN); ambiente.setHoraFin(LocalTime.MAX);
        when(examenes.findById(2)).thenReturn(Optional.of(examen));
        when(ambientes.findById(3)).thenReturn(Optional.of(ambiente));
        when(control.examenesCorrespondientes(eq(123456), eq(2), any())).thenReturn(List.of(
                new bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.OtroExamenDTO("Materia", "Examen", "Aula", "hora", null, null, 4, 5, 6)));
        assertThrows(ResponseStatusException.class, () -> servicio.sincronizar(qr, 7, "ip"));
        verifyNoInteractions(intentos, credenciales);
    }

    @Test void variosDestinosRegistranSinElegirUno() {
        var ambigua = new SincronizarIntentoOfflineService.Solicitud(UUID.randomUUID(), 1, 2, 3, 123456,
                null, null, null, "SIS", null, null, System.currentTimeMillis());
        when(estudiantes.findByCodsisestudiante(123456)).thenReturn(Optional.of(new Estudiante(10, 123456)));
        var usuario = new Usuario("1", "Ficticio", "Prueba", null, "est@example.invalid", "hash", true);
        usuario.setIdusuario(10);
        when(usuarios.findById(10)).thenReturn(Optional.of(usuario));
        var examen = new bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen();
        examen.setFechaExamen(LocalDate.now(ZoneId.of("America/La_Paz")));
        var ambiente = new bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente();
        ambiente.setHoraInicio(LocalTime.MIN); ambiente.setHoraFin(LocalTime.MAX);
        when(examenes.findById(2)).thenReturn(Optional.of(examen));
        when(ambientes.findById(3)).thenReturn(Optional.of(ambiente));
        when(control.examenesCorrespondientes(eq(123456), eq(2), any())).thenReturn(List.of(
                new bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.OtroExamenDTO("Materia A", "Examen", "Aula", "hora", null, null, 4, 5, 6),
                new bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.OtroExamenDTO("Materia B", "Examen", "Aula", "hora", null, null, 7, 8, 9)));
        when(intentos.registrar(any(), any(), any(), any(), any(), any())).thenAnswer(i ->
                new IntentoExamenIncorrectoRepository.Guardado(11, i.getArgument(0)));
        assertEquals(11, servicio.sincronizar(ambigua, 7, "ip"));
        verify(intentos).registrar(argThat(d -> d.asignaturaDestino() == null && d.examenDestino() == null && d.ambienteDestino() == null),
                any(), any(), any(), any(), any());
    }

    @Test void destinoParcialSeRechazaAntesDeAccederADatos() {
        var parcial = new SincronizarIntentoOfflineService.Solicitud(UUID.randomUUID(), 1, 2, 3, 123456,
                4, null, null, "SIS", null, null, System.currentTimeMillis());
        assertThrows(ResponseStatusException.class, () -> servicio.sincronizar(parcial, 7, "ip"));
        verifyNoInteractions(control, estudiantes, intentos);
    }
}
