package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceIntentoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceSyncRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceSyncResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FaceSyncServiceTest {

    @Mock
    private FaceIntentoRepository intentoRepository;

    @Mock
    private IngresoRepository ingresoRepository;

    @Mock
    private ContextoUsuarioService contextoUsuarioService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private EstudianteRepository estudianteRepository;

    @Mock
    private AuditoriaFacialService auditoriaFacialService;

    @InjectMocks
    private FaceSyncService syncService;

    @Test
    void sincronizar_intentoNuevo_persisteMetadatosSinFotoPath() {
        String uuid = UUID.randomUUID().toString();
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(3, "op@umss.edu", "OPERADOR"));
        when(intentoRepository.findByClientUuid(uuid)).thenReturn(Optional.empty());

        FaceSyncRequestDto.IntentoDto intentoDto = new FaceSyncRequestDto.IntentoDto(
                uuid, 10, 1, 2, 3, 0.95, 0.98, "autorizado", "tablet-1", "facenet-v1", LocalDateTime.now()
        );
        FaceSyncRequestDto request = new FaceSyncRequestDto(List.of(intentoDto), List.of());

        FaceSyncResponseDto response = syncService.sincronizar(request);

        assertEquals(1, response.intentos().size());
        assertEquals("PROCESADO", response.intentos().get(0).estado());

        ArgumentCaptor<FaceIntento> captor = ArgumentCaptor.forClass(FaceIntento.class);
        verify(intentoRepository).save(captor.capture());
        FaceIntento guardado = captor.getValue();
        assertEquals(uuid, guardado.getClientUuid());
        assertEquals(10, guardado.getIdUsuarioEstudiante());
        assertEquals(3, guardado.getIdUsuarioOperador());
        assertEquals(0.95, guardado.getScore());
        assertEquals("autorizado", guardado.getResultado());
        assertEquals("tablet-1", guardado.getDeviceId());
    }

    @Test
    void sincronizar_intentoDuplicado_esIdempotenteYNoVuelveAPersistir() {
        String uuid = UUID.randomUUID().toString();
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(3, "op@umss.edu", "OPERADOR"));
        when(intentoRepository.findByClientUuid(uuid)).thenReturn(Optional.of(new FaceIntento()));

        FaceSyncRequestDto.IntentoDto intentoDto = new FaceSyncRequestDto.IntentoDto(
                uuid, 10, 1, 2, 3, 0.95, 0.98, "autorizado", "tablet-1", "facenet-v1", LocalDateTime.now()
        );
        FaceSyncRequestDto request = new FaceSyncRequestDto(List.of(intentoDto), List.of());

        FaceSyncResponseDto response = syncService.sincronizar(request);

        assertEquals(1, response.intentos().size());
        assertEquals("DUPLICADO", response.intentos().get(0).estado());
        verify(intentoRepository, never()).save(any());
    }
}

