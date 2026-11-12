package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FotoEnrolamientoRollbackListenerTest {

    @Mock
    private StorageProvider storageProvider;

    @Mock
    private LimpiezaFotoBiometricaService limpiezaFotoBiometricaService;

    @InjectMocks
    private FotoEnrolamientoRollbackListener listener;

    @Test
    void eliminarFotoCreadaEnRollback_invocaStorageProviderDelete() throws Exception {
        listener.eliminarFotoCreadaEnRollback(new FotoEnrolamientoCreadaEvent("enrollments/temp.jpg"));
        verify(storageProvider).delete("enrollments/temp.jpg");
    }

    @Test
    void eliminarFotoCreadaEnRollback_capturaExcepcionSinPropagar() throws Exception {
        doThrow(new IOException("Error de I/O")).when(storageProvider).delete("enrollments/temp.jpg");
        listener.eliminarFotoCreadaEnRollback(new FotoEnrolamientoCreadaEvent("enrollments/temp.jpg"));
        verify(storageProvider).delete("enrollments/temp.jpg");
    }

    @Test
    void eliminarFotoHistoricaReemplazada_procesaLimpiezaEnServicio() {
        listener.eliminarFotoHistoricaReemplazada(new FotoEnrolamientoReemplazadaEvent(42L));
        verify(limpiezaFotoBiometricaService).procesar(42L);
    }
}

