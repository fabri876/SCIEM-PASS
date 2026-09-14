package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HabilitacionServiceTest {

    @Mock
    private HabilitacionRepository habilitacionRepository;

    @InjectMocks
    private HabilitacionService habilitacionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testObtenerTodas() {
        Estudiante estudiante = new Estudiante(202100456, "7891234 LP", "Juan Carlos", "Perez", 1, null, null);
        MotivoInhabilitacion motivo = new MotivoInhabilitacion(1, "Deuda de matrícula", "Cuotas pendientes");
        Habilitacion h = new Habilitacion(estudiante, motivo, false, "Falta pagar cuota 2");
        h.setIdhabilitacion(101);

        when(habilitacionRepository.findAllConDetalles()).thenReturn(Collections.singletonList(h));

        List<HabilitacionResponseDto> resultado = habilitacionService.obtenerTodas();

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        HabilitacionResponseDto dto = resultado.get(0);
        assertEquals(101, dto.getIdHabilitacion());
        assertEquals(202100456, dto.getCodSisEstudiante());
        assertEquals("Juan Carlos", dto.getNombreEstudiante());
        assertEquals("Perez", dto.getApellidoEstudiante());
        assertEquals("7891234 LP", dto.getCiEstudiante());
        assertEquals(false, dto.getEstadoHabilitacion());
        assertEquals("INHABILITADO", dto.getEstado());
        assertEquals(1, dto.getMotivoId());
        assertEquals("Deuda de matrícula", dto.getNombreMotivo());
        assertEquals("Falta pagar cuota 2", dto.getObservacion());

        verify(habilitacionRepository, times(1)).findAllConDetalles();
    }
}
