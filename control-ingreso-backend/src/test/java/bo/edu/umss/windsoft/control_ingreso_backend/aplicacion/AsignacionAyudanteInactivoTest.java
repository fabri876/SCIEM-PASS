package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignacionIngresoRequestDTO;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AsignacionAyudanteInactivoTest {
    @Mock ExamenRepository examenes;
    @Mock AmbienteRepository ambientes;
    @Mock AulaRepository aulas;
    @Mock AyudanteExamenRepository asignaciones;
    @Mock AyudanteRepository ayudantes;
    @Mock UsuarioRepository usuarios;
    @InjectMocks AsignacionIngresoService servicio;

    private final AyudanteExamenId idPrevio = new AyudanteExamenId(1, 3, 4, 5);
    private final ContextoUsuarioService.UsuarioActual admin =
            new ContextoUsuarioService.UsuarioActual(9, "prueba@example.test", "ADMINISTRADOR");

    @BeforeEach
    void preparar() {
        Examen examen = new Examen();
        examen.setIdAsignatura(3);
        Ambiente ambiente = mock(Ambiente.class);
        when(ambiente.getIdAmbiente()).thenReturn(5);
        when(examenes.findById(4)).thenReturn(Optional.of(examen));
        when(ambientes.findByIdExamen(4)).thenReturn(List.of(ambiente));
        for (int id = 1; id <= 2; id++) {
            Usuario cuenta = new Usuario();
            cuenta.setEstadousuario(id == 2);
            when(usuarios.bloquearPorId(id)).thenReturn(Optional.of(cuenta));
            when(ayudantes.existsByIdusuario(id)).thenReturn(true);
        }
    }

    @Test
    void altaInactivaRechazaTodoAntesDeEscribir() {
        assertThrows(ResponseStatusException.class, () -> servicio.guardarAsignacion(4, solicitud(2, 1), admin));
        verify(asignaciones, never()).save(any());
    }

    @Test
    void guardadoMixtoMantieneIntactaLaFilaInactivaExistente() {
        AyudanteExamen anterior = new AyudanteExamen(idPrevio, "ACTIVO");
        anterior.setApellidoDesde("A");
        anterior.setApellidoHasta("M");
        when(asignaciones.findById(idPrevio)).thenReturn(Optional.of(anterior));
        when(asignaciones.findByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(3, 4, 5, "ACTIVO"))
                .thenReturn(List.of(anterior));
        servicio.guardarAsignacion(4, solicitud(1, 2), admin);
        assertEquals("ACTIVO", anterior.getEstadoAsignacion());
        verify(asignaciones, never()).save(same(anterior));
        verify(asignaciones).save(argThat(fila -> fila.getId().getIdayudante() == 2));
    }

    private AsignacionIngresoRequestDTO solicitud(int primero, int segundo) {
        return new AsignacionIngresoRequestDTO(3, List.of(
                new AsignacionIngresoRequestDTO.ItemAsignacion(5, primero, "A", "M", "OPERADOR"),
                new AsignacionIngresoRequestDTO.ItemAsignacion(5, segundo, "A", "M", "OPERADOR")), "SUBDIVISION");
    }
}
