package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HabilitacionServiceTest {

    @Mock
    private HabilitacionRepository habilitacionRepository;

    @InjectMocks
    private HabilitacionService habilitacionService;

    @Test
    void testObtenerTodas() {
        Estudiante estudiante = new Estudiante(202100456, 1);
        Habilitacion h = new Habilitacion(estudiante, false, "Falta pagar cuota 2");
        h.setIdhabilitacion(101);

        when(habilitacionRepository.findAllConDetalles()).thenReturn(Collections.singletonList(h));

        List<HabilitacionResponseDto> resultado = habilitacionService.obtenerTodas();

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        HabilitacionResponseDto dto = resultado.get(0);
        assertEquals(101, dto.getIdHabilitacion());
        assertEquals(202100456, dto.getCodSisEstudiante());
        assertEquals(false, dto.getEstadoHabilitacion());
        assertEquals("INHABILITADO", dto.getEstado());
        assertEquals("Falta pagar cuota 2", dto.getObservacion());

        verify(habilitacionRepository, times(1)).findAllConDetalles();
    }
}