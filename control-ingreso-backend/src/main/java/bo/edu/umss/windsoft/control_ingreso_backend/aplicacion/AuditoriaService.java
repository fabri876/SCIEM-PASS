package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;

    public AuditoriaService(AuditoriaRepository auditoriaRepository) {
        this.auditoriaRepository = auditoriaRepository;
    }

    public void registrar(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                           String detalles, String ipOrigen) {
        Auditoria auditoria = new Auditoria(tipoOperacion, usuarioEjecutor, usuarioAfectado, detalles, ipOrigen);
        auditoriaRepository.save(auditoria);
    }

    public List<Auditoria> listar() {
        return auditoriaRepository.findAllByOrderByFechaHoraDesc();
    }
}
