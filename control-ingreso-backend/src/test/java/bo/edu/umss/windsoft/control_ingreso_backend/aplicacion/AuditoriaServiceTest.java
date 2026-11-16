package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.aop.framework.ProxyFactory;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** BUG-038: la auditoría nunca debe romper (ni marcar rollback-only) el flujo que la llama. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuditoriaServiceTest {

    @Mock private AuditoriaRepository auditoriaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("registrar: si guardar falla, no lanza nada y la transacción propia se revierte")
    void registrar_noLanzaSiFalla() {
        when(usuarioRepository.findByCorreousuario(any())).thenReturn(Optional.empty());
        when(auditoriaRepository.save(any())).thenThrow(new RuntimeException("falla simulada"));
        AuditoriaService service = new AuditoriaService(auditoriaRepository, usuarioRepository, transactionManager);

        assertDoesNotThrow(() -> service.registrar("REUBICACION_RECHAZADA", "doc@umss.edu", "est@umss.edu", "detalle", "ip"));

        verify(transactionManager).rollback(any());
        verify(transactionManager, never()).commit(any());
    }

    @Test
    @DisplayName("registrar: guarda la fila y hace commit de su propia transacción")
    void registrar_guardaYHaceCommit() {
        when(usuarioRepository.findByCorreousuario(any())).thenReturn(Optional.empty());
        AuditoriaService service = new AuditoriaService(auditoriaRepository, usuarioRepository, transactionManager);

        service.registrar("REUBICACION_EXPRESS", "doc@umss.edu", "est@umss.edu", "detalle", "ip");

        verify(auditoriaRepository).save(any(Auditoria.class));
        verify(transactionManager).commit(any());
    }

    @Test
    @DisplayName("registrarEnTransaccion: propaga el fallo para impedir confirmar la operacion critica")
    void registrarEnTransaccion_propagaFallo() {
        when(usuarioRepository.findByCorreousuario(any())).thenReturn(Optional.empty());
        when(auditoriaRepository.save(any())).thenThrow(new RuntimeException("falla simulada"));
        AuditoriaService service = new AuditoriaService(auditoriaRepository, usuarioRepository, transactionManager);

        assertThrows(RuntimeException.class, () -> service.registrarEnTransaccion(
                "CREACION_USUARIO", "admin@umss.edu", "usuario@umss.edu", "detalle", "ip"));
    }

    @Test
    @DisplayName("El interceptor transaccional solicita rollback al fallar el guardado")
    void registrarEnTransaccion_solicitaRollback() {
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(usuarioRepository.findByCorreousuario(any())).thenReturn(Optional.empty());
        when(auditoriaRepository.save(any())).thenThrow(new RuntimeException("falla simulada"));

        AuditoriaService servicio = new AuditoriaService(auditoriaRepository, usuarioRepository, transactionManager);
        ProxyFactory fabrica = new ProxyFactory(servicio);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(new TransactionInterceptor(transactionManager, new AnnotationTransactionAttributeSource()));
        AuditoriaService proxy = (AuditoriaService) fabrica.getProxy();

        assertThrows(RuntimeException.class, () -> proxy.registrarEnTransaccion(
                "CREACION_USUARIO", "admin@umss.edu", "usuario@umss.edu", "detalle", "ip"));
        verify(transactionManager).rollback(any());
        verify(transactionManager, never()).commit(any());
    }

    @Test
    @DisplayName("BUG-030/BUG-038: si la acción supera 255 caracteres, se trunca a 255 para respetar varchar(255)")
    void registrar_truncaSiSupera255() {
        when(usuarioRepository.findByCorreousuario(any())).thenReturn(Optional.empty());
        AuditoriaService service = new AuditoriaService(auditoriaRepository, usuarioRepository, transactionManager);

        String detallesLargos = "A".repeat(300);
        service.registrar("REUBICACION_RECHAZADA", "doc@umss.edu", "est@umss.edu", detallesLargos, "127.0.0.1");

        org.mockito.ArgumentCaptor<Auditoria> captor = org.mockito.ArgumentCaptor.forClass(Auditoria.class);
        verify(auditoriaRepository).save(captor.capture());
        org.junit.jupiter.api.Assertions.assertTrue(captor.getValue().getAccion().length() > 255);
        verify(transactionManager).commit(any());
    }
}
