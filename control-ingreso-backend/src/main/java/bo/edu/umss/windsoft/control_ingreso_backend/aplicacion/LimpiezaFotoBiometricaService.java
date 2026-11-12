package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.LimpiezaFotoBiometrica;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.LimpiezaFotoBiometricaRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;

@Service
public class LimpiezaFotoBiometricaService {
    private final LimpiezaFotoBiometricaRepository repository;
    private final StorageProvider storageProvider;

    public LimpiezaFotoBiometricaService(LimpiezaFotoBiometricaRepository repository, StorageProvider storageProvider) {
        this.repository = repository;
        this.storageProvider = storageProvider;
    }

    @Transactional
    public Long encolar(String ruta) {
        LimpiezaFotoBiometrica pendiente = new LimpiezaFotoBiometrica();
        pendiente.setRuta(ruta);
        pendiente.setCreadoEn(LocalDateTime.now());
        return repository.save(pendiente).getId();
    }

    @Transactional
    public boolean procesar(Long id) {
        LimpiezaFotoBiometrica pendiente = repository.findById(id).orElse(null);
        if (pendiente == null) return true;
        try {
            storageProvider.delete(pendiente.getRuta());
            repository.delete(pendiente);
            return true;
        } catch (IOException | RuntimeException ex) {
            return false;
        }
    }

    @Scheduled(fixedDelayString = "${storage.biometric.cleanup-delay-ms:300000}")
    public void reintentarPendientes() {
        repository.findTop100ByOrderByCreadoEnAsc().forEach(pendiente -> procesar(pendiente.getId()));
    }
}
