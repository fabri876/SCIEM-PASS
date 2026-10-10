package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenPublicoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenPublicoDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.util.List;
@Service
public class ExamenPublicoService {
    private final ExamenPublicoRepository examenes;
    public ExamenPublicoService(ExamenPublicoRepository examenes) { this.examenes = examenes; }
    @Transactional(readOnly = true)
    public List<ExamenPublicoDto> proximos() {
        var ahora = ZonedDateTime.now(ZoneId.of("America/La_Paz"));
        return examenes.proximos(ahora.toLocalDate(), ahora.toLocalTime());
    }
}
