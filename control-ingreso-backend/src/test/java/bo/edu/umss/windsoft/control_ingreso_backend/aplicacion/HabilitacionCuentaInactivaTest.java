package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import java.time.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HabilitacionCuentaInactivaTest {
    private static final LocalDate HOY = LocalDate.of(2026, 11, 28);
    private final AmbienteRepository ambientes = mock(AmbienteRepository.class);
    private final ExamenRepository examenes = mock(ExamenRepository.class);
    private final HabilitacionRepository habilitaciones = mock(HabilitacionRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final HabilitacionCuentaInactiva regla = new HabilitacionCuentaInactiva(
            usuarios, examenes, ambientes, habilitaciones,
            Clock.fixed(Instant.parse("2026-11-28T14:00:00Z"), ZoneOffset.UTC));

    @Test
    void desactivarSoloCambiaHabilitacionesDeExamenesVigentesFuturos() {
        var hoy = examen(1, HOY, false, LocalTime.of(12, 0), LocalTime.of(11, 0));
        var manana = examen(2, HOY.plusDays(1), false, LocalTime.of(8, 0));
        var iniciado = examen(3, HOY, false, LocalTime.of(13, 0), LocalTime.of(10, 0));
        var pasado = examen(4, HOY.minusDays(1), false, LocalTime.of(12, 0));
        var cancelado = examen(5, HOY.plusDays(1), true, LocalTime.of(12, 0));
        var sinHorario = examen(6, HOY.plusDays(1), false);
        var filas = List.of(fila(hoy), fila(manana), fila(iniciado), fila(pasado), fila(cancelado), fila(sinHorario));
        when(habilitaciones.vigentesPorEstudiante(20)).thenReturn(filas);
        for (var e : List.of(hoy, manana, iniciado, pasado, cancelado, sinHorario))
            when(examenes.findById(e.getIdExamen())).thenReturn(Optional.of(e));

        regla.alDesactivar(20);

        for (var h : filas.subList(0, 2)) {
            assertFalse(h.getEstadohabilitacion());
            assertEquals("Usuario desactivado", h.getObservacionhabilitacion());
        }
        for (var h : filas.subList(2, filas.size())) {
            assertTrue(h.getEstadohabilitacion());
            assertNull(h.getObservacionhabilitacion());
        }
    }

    @Test
    void generarRespetaLaCuentaYUnMotivoPrevio() {
        var futuro = examen(1, HOY.plusDays(1), false, LocalTime.NOON);
        var cuenta = new Usuario();
        var nueva = fila(futuro);
        regla.aplicarAlCrear(nueva, cuenta, futuro);
        assertTrue(nueva.getEstadohabilitacion());
        cuenta.setEstadousuario(false);
        regla.aplicarAlCrear(nueva, cuenta, futuro);
        assertFalse(nueva.getEstadohabilitacion());
        nueva.setObservacionhabilitacion("Otro motivo");
        regla.aplicarAlCrear(nueva, cuenta, futuro);
        assertEquals("Otro motivo", nueva.getObservacionhabilitacion());
    }

    @Test
    void reactivarExamenFuturoSoloInhabilitaCuentasInactivas() {
        var futuro = examen(1, HOY, false, LocalTime.NOON);
        var activa = new Usuario();
        var inactiva = new Usuario();
        inactiva.setEstadousuario(false);
        var habilitacionInactiva = fila(futuro);
        when(habilitaciones.cuentasConHabilitacionVigente(1)).thenReturn(List.of(10, 20));
        when(usuarios.bloquearPorId(10)).thenReturn(Optional.of(activa));
        when(usuarios.bloquearPorId(20)).thenReturn(Optional.of(inactiva));
        when(habilitaciones.vigentesPorExamenYEstudiante(1, 20)).thenReturn(List.of(habilitacionInactiva));

        regla.alReactivarExamen(futuro);

        assertFalse(habilitacionInactiva.getEstadohabilitacion());
        assertEquals("Usuario desactivado", habilitacionInactiva.getObservacionhabilitacion());
        verify(habilitaciones, never()).vigentesPorExamenYEstudiante(1, 10);
    }

    @Test
    void reactivarExamenYaIniciadoDejaIntactoElHistorial() {
        var iniciado = examen(1, HOY, false, LocalTime.of(10, 0), LocalTime.NOON);
        regla.alReactivarExamen(iniciado);
        verifyNoInteractions(usuarios, habilitaciones);
    }

    private Examen examen(int id, LocalDate fecha, boolean cancelado, LocalTime... horas) {
        var examen = new Examen();
        examen.setIdExamen(id);
        examen.setFechaExamen(fecha);
        examen.setEstadoExamen(true);
        examen.setCancelado(cancelado);
        when(ambientes.findByIdExamen(id)).thenReturn(java.util.Arrays.stream(horas).map(hora -> {
            var ambiente = new Ambiente();
            ambiente.setHoraInicio(hora);
            return ambiente;
        }).toList());
        return examen;
    }

    private Habilitacion fila(Examen examen) {
        var fila = new Habilitacion();
        fila.setIdExamen(examen.getIdExamen());
        fila.setEstadohabilitacion(true);
        return fila;
    }
}
