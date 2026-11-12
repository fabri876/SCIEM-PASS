package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceEnrollmentRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentStatusDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceVerificacionEstudianteResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FaceEnrollmentServiceTest {
    @Mock private FaceEnrollmentRepository enrollmentRepository;
    @Mock private StorageProvider storageProvider;
    @Mock private ContextoUsuarioService contextoUsuarioService;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private EstudianteRepository estudianteRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private LimpiezaFotoBiometricaService limpiezaFotoBiometricaService;
    @InjectMocks private FaceEnrollmentService service;

    @Test
    void enrolar_siYaExisteHistorial_respondeConflictSinGuardarArchivo() throws Exception {
        FaceEnrollment existente = new FaceEnrollment();
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(7, "est@umss.edu", "ESTUDIANTE"));
        when(enrollmentRepository.findByIdUsuarioForUpdate(7)).thenReturn(Optional.of(existente));
        MockMultipartFile foto = new MockMultipartFile("file", "rostro.jpg", "image/jpeg", new byte[] {1});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.enrolar(foto, "[0.1]", "human-v1", LocalDateTime.now()));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(storageProvider, never()).save(any(), anyString(), anyString());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void enrolar_primerRegistro_creaFotoYPersisteFila() throws Exception {
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(7, "est@umss.edu", "ESTUDIANTE"));
        when(enrollmentRepository.findByIdUsuarioForUpdate(7)).thenReturn(Optional.empty());
        when(storageProvider.save(any(), anyString(), anyString())).thenReturn("enrollments/rostro1.jpg");
        MockMultipartFile foto = new MockMultipartFile("file", "rostro.jpg", "image/jpeg", new byte[] {1, 2, 3});
        LocalDateTime consentimiento = LocalDateTime.now();

        FaceEnrollmentStatusDto respuesta = service.enrolar(foto, "[0.12, 0.34]", "human-v1", consentimiento);

        assertEquals(7, respuesta.idUsuario());
        assertEquals("activo", respuesta.estado());
        assertNotNull(respuesta.fechaRegistro());

        ArgumentCaptor<FaceEnrollment> captor = ArgumentCaptor.forClass(FaceEnrollment.class);
        verify(enrollmentRepository).save(captor.capture());
        FaceEnrollment guardado = captor.getValue();
        assertEquals(7, guardado.getIdUsuario());
        assertEquals("enrollments/rostro1.jpg", guardado.getPhotoPath());
        assertEquals("[0.12, 0.34]", guardado.getEmbedding());
        assertEquals("human-v1", guardado.getModelVersion());
        assertEquals("activo", guardado.getEstado());

        verify(eventPublisher).publishEvent(any(FotoEnrolamientoCreadaEvent.class));
    }

    @Test
    void enrolar_noEstudiante_respondeForbidden() throws Exception {
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(2, "docente@umss.edu", "DOCENTE"));
        MockMultipartFile foto = new MockMultipartFile("file", "rostro.jpg", "image/jpeg", new byte[] {1});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.enrolar(foto, "[0.1]", "human-v1", LocalDateTime.now()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(storageProvider, never()).save(any(), anyString(), anyString());
    }

    @Test
    void reenrolarComoAdministrador_exitoso_actualizaMismaFilaYEncolaLimpieza() throws Exception {
        FaceEnrollment existente = new FaceEnrollment();
        existente.setIdUsuario(15);
        existente.setPhotoPath("enrollments/antigua.jpg");
        existente.setEmbedding("[0.01]");
        existente.setModelVersion("v1");
        existente.setEstado("bloqueado");

        when(estudianteRepository.existsByIdusuario(15)).thenReturn(true);
        when(enrollmentRepository.findByIdUsuarioForUpdate(15)).thenReturn(Optional.of(existente));
        when(storageProvider.save(any(), anyString(), anyString())).thenReturn("enrollments/nueva.jpg");
        when(limpiezaFotoBiometricaService.encolar("enrollments/antigua.jpg")).thenReturn(101L);

        MockMultipartFile foto = new MockMultipartFile("file", "nueva.jpg", "image/jpeg", new byte[] {9, 9});
        LocalDateTime nuevoConsentimiento = LocalDateTime.now();

        FaceEnrollmentStatusDto respuesta = service.reenrolarComoAdministrador(15, foto, "[0.99]", "v2", nuevoConsentimiento);

        assertEquals(15, respuesta.idUsuario());
        assertEquals("activo", respuesta.estado());
        assertEquals("enrollments/nueva.jpg", existente.getPhotoPath());
        assertEquals("[0.99]", existente.getEmbedding());
        assertEquals("v2", existente.getModelVersion());
        assertEquals("activo", existente.getEstado());

        verify(enrollmentRepository).save(existente);
        verify(limpiezaFotoBiometricaService).encolar("enrollments/antigua.jpg");
        verify(eventPublisher).publishEvent(any(FotoEnrolamientoCreadaEvent.class));
        verify(eventPublisher).publishEvent(any(FotoEnrolamientoReemplazadaEvent.class));
    }

    @Test
    void reenrolarComoAdministrador_estudianteNoExiste_respondeNotFound() throws Exception {
        when(estudianteRepository.existsByIdusuario(99)).thenReturn(false);
        MockMultipartFile foto = new MockMultipartFile("file", "nueva.jpg", "image/jpeg", new byte[] {9});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.reenrolarComoAdministrador(99, foto, "[0.1]", "v1", LocalDateTime.now()));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verify(storageProvider, never()).save(any(), anyString(), anyString());
    }

    @Test
    void reenrolarComoAdministrador_sinHistorialPrevio_respondeNotFound() throws Exception {
        when(estudianteRepository.existsByIdusuario(15)).thenReturn(true);
        when(enrollmentRepository.findByIdUsuarioForUpdate(15)).thenReturn(Optional.empty());
        MockMultipartFile foto = new MockMultipartFile("file", "nueva.jpg", "image/jpeg", new byte[] {9});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.reenrolarComoAdministrador(15, foto, "[0.1]", "v1", LocalDateTime.now()));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verify(storageProvider, never()).save(any(), anyString(), anyString());
    }

    @Test
    void enrolar_falloGuardadoFoto_lanzaErrorSinGuardarEnBd() throws Exception {
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(7, "est@umss.edu", "ESTUDIANTE"));
        when(enrollmentRepository.findByIdUsuarioForUpdate(7)).thenReturn(Optional.empty());
        when(storageProvider.save(any(), anyString(), anyString())).thenThrow(new IOException("Disk full"));
        MockMultipartFile foto = new MockMultipartFile("file", "rostro.jpg", "image/jpeg", new byte[] {1});

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.enrolar(foto, "[0.1]", "v1", LocalDateTime.now()));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, error.getStatusCode());
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void verificarEstudiante_coincidenciaValida_respondeAutorizado() {
        FaceEnrollment enrollment = new FaceEnrollment();
        enrollment.setIdUsuario(7);
        enrollment.setEmbedding("[1.0, 0.0, 0.0]");
        enrollment.setEstado("activo");

        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(7, "est@umss.edu", "ESTUDIANTE"));
        when(enrollmentRepository.findByIdUsuarioAndEstado(7, "activo")).thenReturn(Optional.of(enrollment));

        FaceVerificacionEstudianteResponseDto respuesta = service.verificarEstudiante("[0.99, 0.01, 0.0]", 0.88, 12);

        org.junit.jupiter.api.Assertions.assertTrue(respuesta.autorizado());
        org.junit.jupiter.api.Assertions.assertTrue(respuesta.score() >= 0.82);
    }

    @Test
    void verificarEstudiante_rostroDiferente_respondeNoAutorizado() {
        FaceEnrollment enrollment = new FaceEnrollment();
        enrollment.setIdUsuario(7);
        enrollment.setEmbedding("[1.0, 0.0, 0.0]");
        enrollment.setEstado("activo");

        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(7, "est@umss.edu", "ESTUDIANTE"));
        when(enrollmentRepository.findByIdUsuarioAndEstado(7, "activo")).thenReturn(Optional.of(enrollment));

        FaceVerificacionEstudianteResponseDto respuesta = service.verificarEstudiante("[0.0, 1.0, 0.0]", 0.88, 12);

        org.junit.jupiter.api.Assertions.assertFalse(respuesta.autorizado());
        org.junit.jupiter.api.Assertions.assertTrue(respuesta.score() < 0.82);
    }

    @Test
    void verificarEstudiante_livenessBajo_respondeNoAutorizado() {
        FaceEnrollment enrollment = new FaceEnrollment();
        enrollment.setIdUsuario(7);
        enrollment.setEmbedding("[1.0, 0.0, 0.0]");
        enrollment.setEstado("activo");

        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(7, "est@umss.edu", "ESTUDIANTE"));
        when(enrollmentRepository.findByIdUsuarioAndEstado(7, "activo")).thenReturn(Optional.of(enrollment));

        FaceVerificacionEstudianteResponseDto respuesta = service.verificarEstudiante("[1.0, 0.0, 0.0]", 0.45, 12);

        org.junit.jupiter.api.Assertions.assertFalse(respuesta.autorizado());
        org.junit.jupiter.api.Assertions.assertEquals(0.45, respuesta.livenessScore());
    }

    @Test
    void verificarEstudiante_noEstudiante_respondeForbidden() {
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(2, "doc@umss.edu", "DOCENTE"));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.verificarEstudiante("[1.0]", 0.85, 12));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
    }

    @Test
    void verificarEstudiante_sinEnrolamiento_respondeNotFound() {
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(7, "est@umss.edu", "ESTUDIANTE"));
        when(enrollmentRepository.findByIdUsuarioAndEstado(7, "activo")).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.verificarEstudiante("[1.0]", 0.85, 12));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }
}
