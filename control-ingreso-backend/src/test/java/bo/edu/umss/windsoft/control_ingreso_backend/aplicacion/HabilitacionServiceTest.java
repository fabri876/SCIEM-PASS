package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.MotivoInhabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HabilitacionServiceTest {

    @Mock
    private HabilitacionRepository habilitacionRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private MotivoInhabilitacionRepository motivoInhabilitacionRepository;

    @InjectMocks
    private HabilitacionService habilitacionService;


    @Test
    void testObtenerTodas() {
        Estudiante estudiante = new Estudiante(202100456, 1);
        Habilitacion h = new Habilitacion(estudiante, false, "Falta pagar cuota 2");
        h.setIdhabilitacion(101);

        Usuario u = new Usuario("8472910 LP", "Alejandro", "Morales", 77712345, "a.morales@univalle.edu.bo", "secret", true);
        u.setIdusuario(1);

        when(habilitacionRepository.findAllConDetalles()).thenReturn(Collections.singletonList(h));
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(u));

        List<HabilitacionResponseDto> resultado = habilitacionService.obtenerTodas();

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        HabilitacionResponseDto dto = resultado.get(0);
        assertEquals(101, dto.getIdHabilitacion());
        assertEquals(202100456, dto.getCodSisEstudiante());
        assertEquals("Alejandro", dto.getNombreEstudiante());
        assertEquals("a.morales@univalle.edu.bo", dto.getCorreoEstudiante());
        assertEquals(false, dto.getEstadoHabilitacion());
        assertEquals("INHABILITADO", dto.getEstado());
        assertEquals("Falta pagar cuota 2", dto.getObservacion());

        verify(habilitacionRepository, times(1)).findAllConDetalles();
    }

    @Test
    void testActualizarHabilitacionAHabilitado() {
        Habilitacion h = new Habilitacion(new Estudiante(202100456, 1), false, "Falta pago");
        h.setIdhabilitacion(101);

        HabilitacionRequestDto request = new HabilitacionRequestDto(true, null);

        when(habilitacionRepository.findById(101)).thenReturn(Optional.of(h));
        when(habilitacionRepository.save(any(Habilitacion.class))).thenAnswer(i -> i.getArgument(0));

        HabilitacionResponseDto res = habilitacionService.actualizarHabilitacion(101, request);

        assertNotNull(res);
        assertTrue(res.getEstadoHabilitacion());
        assertEquals("HABILITADO", res.getEstado());
        assertNull(res.getObservacionHabilitacion());
    }

    @Test
    void testActualizarHabilitacionAInhabilitado() {
        Habilitacion h = new Habilitacion(new Estudiante(202100456, 1), true, null);
        h.setIdhabilitacion(101);

        HabilitacionRequestDto request = new HabilitacionRequestDto(false, "Deuda de laboratorio");

        when(habilitacionRepository.findById(101)).thenReturn(Optional.of(h));
        when(habilitacionRepository.save(any(Habilitacion.class))).thenAnswer(i -> i.getArgument(0));

        HabilitacionResponseDto res = habilitacionService.actualizarHabilitacion(101, request);

        assertNotNull(res);
        assertFalse(res.getEstadoHabilitacion());
        assertEquals("INHABILITADO", res.getEstado());
        assertEquals("Deuda de laboratorio", res.getObservacionHabilitacion());
    }
}
