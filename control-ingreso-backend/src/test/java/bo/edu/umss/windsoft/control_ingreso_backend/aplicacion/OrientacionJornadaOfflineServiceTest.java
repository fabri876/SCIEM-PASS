package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Credencial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CarreraEstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OrientacionJornadaOfflineServiceTest {
    private final ControlIngresoAyudanteService control = mock(ControlIngresoAyudanteService.class);
    private final ExamenRepository examenes = mock(ExamenRepository.class);
    private final AsignaturaRepository asignaturas = mock(AsignaturaRepository.class);
    private final AsignacionAulaService aulas = mock(AsignacionAulaService.class);
    private final CredencialRepository credenciales = mock(CredencialRepository.class);
    private final CarreraEstudianteRepository carreras = mock(CarreraEstudianteRepository.class);
    private final OrientacionJornadaOfflineService servicio = new OrientacionJornadaOfflineService(control, examenes, asignaturas, aulas, credenciales, carreras);

    @Test void sinAsignacionNoConsultaOtrosExamenes() {
        doThrow(new AccessDeniedException("sin acceso")).when(control).validarAsignacionDeControl(any(), eq(3));
        assertThrows(AccessDeniedException.class, () -> servicio.descargar(3, 1, 2, 4));
        verifyNoInteractions(examenes, asignaturas, aulas, credenciales);
    }

    @Test void incluyeSoloJornadaYNoEntregaTokenQr() {
        LocalDate hoy = LocalDate.now(ZoneId.of("America/La_Paz"));
        var examen = new Examen(); examen.setIdExamen(6); examen.setIdAsignatura(5); examen.setFechaExamen(hoy);
        var ayer = new Examen(); ayer.setIdExamen(9); ayer.setIdAsignatura(5); ayer.setFechaExamen(hoy.minusDays(1));
        when(examenes.findAll()).thenReturn(List.of(examen, ayer));
        var ambiente = new Ambiente(); ambiente.setIdAmbiente(7); ambiente.setHoraInicio(LocalTime.of(8, 0)); ambiente.setHoraFin(LocalTime.of(10, 0));
        var aula = new AsignacionAulaService.AulaExamen(ambiente, "Aula", "Edificio", 50);
        var estudiante = new AsignacionAulaService.EstudianteHabilitado(10, 12345, "654321", "Persona ficticia");
        when(aulas.repartir(5, 6)).thenReturn(new AsignacionAulaService.Reparto(List.of(aula), Map.of(12345, estudiante), Map.of(12345, 7)));
        var qr = new Credencial(10, 6, "token-ficticio", hoy.atTime(7, 0), hoy.atTime(11, 0));
        when(credenciales.findAllByIdExamen(6)).thenReturn(List.of(qr));
        when(carreras.nombres(10, 12345)).thenReturn(List.of("Ingenieria de Sistemas"));
        var jornada = servicio.descargar(3, 1, 2, 4);
        assertEquals(1, jornada.candidatos().size());
        assertNotEquals("token-ficticio", jornada.candidatos().get(0).qrHash());
        assertEquals(64, jornada.candidatos().get(0).qrHash().length());
        assertEquals(7, jornada.candidatos().get(0).idAmbiente());
        assertEquals("Ingenieria de Sistemas", jornada.candidatos().get(0).carrera());
        verify(aulas, never()).repartir(5, 9);
    }
}
