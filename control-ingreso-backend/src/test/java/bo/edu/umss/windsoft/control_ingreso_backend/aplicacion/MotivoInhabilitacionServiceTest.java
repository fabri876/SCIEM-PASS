package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.MotivoInhabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MotivoInhabilitacionServiceTest {

    @Mock
    private MotivoInhabilitacionRepository motivoRepository;

    @InjectMocks
    private MotivoInhabilitacionService motivoService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testObtenerTodos() {
        MotivoInhabilitacion m1 = new MotivoInhabilitacion(1, "Deuda de matrícula", "Cuotas impagas");
        MotivoInhabilitacion m2 = new MotivoInhabilitacion(2, "Falta de asistencia", "Asistencia menor al 80%");

        when(motivoRepository.findAll()).thenReturn(Arrays.asList(m1, m2));

        List<MotivoInhabilitacionResponseDto> resultado = motivoService.obtenerTodos();

        assertNotNull(resultado);
        assertEquals(2, resultado.size());
        assertEquals(1, resultado.get(0).getIdMotivo());
        assertEquals("Deuda de matrícula", resultado.get(0).getNombreMotivo());
        assertEquals("Cuotas impagas", resultado.get(0).getDescripcionMotivo());
        verify(motivoRepository, times(1)).findAll();
    }

    @Test
    void testObtenerPorIdExitoso() {
        MotivoInhabilitacion m = new MotivoInhabilitacion(1, "Deuda de matrícula", "Cuotas impagas");
        when(motivoRepository.findById(1)).thenReturn(Optional.of(m));

        MotivoInhabilitacionResponseDto resultado = motivoService.obtenerPorId(1);

        assertNotNull(resultado);
        assertEquals(1, resultado.getIdMotivo());
        assertEquals("Deuda de matrícula", resultado.getNombreMotivo());
        verify(motivoRepository, times(1)).findById(1);
    }

    @Test
    void testObtenerPorIdNoExistenteLanzaExcepcion() {
        when(motivoRepository.findById(999)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> {
            motivoService.obtenerPorId(999);
        });

        verify(motivoRepository, times(1)).findById(999);
    }

    @Test
    void testCrearMotivoExitoso() {
        MotivoInhabilitacionRequestDto request = new MotivoInhabilitacionRequestDto("Sanción disciplinaria", "Resolución de consejo");
        MotivoInhabilitacion guardado = new MotivoInhabilitacion(3, "Sanción disciplinaria", "Resolución de consejo");

        when(motivoRepository.save(any(MotivoInhabilitacion.class))).thenReturn(guardado);

        MotivoInhabilitacionResponseDto resultado = motivoService.crearMotivo(request);

        assertNotNull(resultado);
        assertEquals(3, resultado.getIdMotivo());
        assertEquals("Sanción disciplinaria", resultado.getNombreMotivo());
        assertEquals("Resolución de consejo", resultado.getDescripcionMotivo());
        verify(motivoRepository, times(1)).save(any(MotivoInhabilitacion.class));
    }

    @Test
    void testCrearMotivoSinNombreLanzaSolicitudInvalidaException() {
        MotivoInhabilitacionRequestDto requestSinNombre = new MotivoInhabilitacionRequestDto("", "Descripción");

        SolicitudInvalidaException ex = assertThrows(SolicitudInvalidaException.class, () -> {
            motivoService.crearMotivo(requestSinNombre);
        });

        assertEquals("El nombre del motivo es obligatorio", ex.getMessage());
        verify(motivoRepository, never()).save(any(MotivoInhabilitacion.class));
    }

    @Test
    void testActualizarMotivoExitoso() {
        MotivoInhabilitacion existente = new MotivoInhabilitacion(1, "Viejo nombre", "Vieja desc");
        MotivoInhabilitacionRequestDto request = new MotivoInhabilitacionRequestDto("Nuevo nombre", "Nueva desc");

        when(motivoRepository.findById(1)).thenReturn(Optional.of(existente));
        when(motivoRepository.save(any(MotivoInhabilitacion.class))).thenAnswer(i -> i.getArgument(0));

        MotivoInhabilitacionResponseDto res = motivoService.actualizarMotivo(1, request);

        assertNotNull(res);
        assertEquals("Nuevo nombre", res.getNombreMotivo());
        assertEquals("Nueva desc", res.getDescripcionMotivo());
    }

    @Test
    void testEliminarMotivoExitoso() {
        when(motivoRepository.existsById(1)).thenReturn(true);

        assertDoesNotThrow(() -> motivoService.eliminarMotivo(1));

        verify(motivoRepository, times(1)).deleteById(1);
    }
}

