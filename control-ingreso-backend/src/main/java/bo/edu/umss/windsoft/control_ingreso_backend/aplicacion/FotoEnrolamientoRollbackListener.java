package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.IOException;

@Component
public class FotoEnrolamientoRollbackListener {
    private final StorageProvider storageProvider;
    private final LimpiezaFotoBiometricaService limpiezaFotoBiometricaService;

    public FotoEnrolamientoRollbackListener(StorageProvider storageProvider,
                                            LimpiezaFotoBiometricaService limpiezaFotoBiometricaService) {
        this.storageProvider = storageProvider;
        this.limpiezaFotoBiometricaService = limpiezaFotoBiometricaService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void eliminarFotoCreadaEnRollback(FotoEnrolamientoCreadaEvent event) {
        try {
            storageProvider.delete(event.ruta());
        } catch (IOException | RuntimeException ex) {
            System.err.println("No se pudo compensar la foto biometrica " + event.ruta() + ": " + ex.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void eliminarFotoHistoricaReemplazada(FotoEnrolamientoReemplazadaEvent event) {
        limpiezaFotoBiometricaService.procesar(event.idLimpieza());
    }
}
