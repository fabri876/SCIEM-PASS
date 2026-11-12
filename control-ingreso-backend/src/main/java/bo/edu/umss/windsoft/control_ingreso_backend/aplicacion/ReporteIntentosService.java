package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ReporteIntentosRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReporteIntentoDto;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
public class ReporteIntentosService {
    private final ReporteIntentosRepository repository;
    public ReporteIntentosService(ReporteIntentosRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public List<ReporteIntentoDto> listar(ContextoUsuarioService.UsuarioActual usuario, Integer asignatura,
                                         Integer examen, String motivo, LocalDate fecha, String busqueda) {
        if (usuario == null || (!usuario.esAdmin() && !usuario.esDocente())
                || (usuario.esDocente() && usuario.idUsuario() == null)) {
            throw new AccessDeniedException("No tiene permiso para consultar este reporte.");
        }
        String motivoNormalizado = motivo == null || motivo.isBlank() ? null : motivo.trim().toUpperCase(Locale.ROOT);
        if ("DUPLICADO_BLOQUEADO".equals(motivoNormalizado)) motivoNormalizado = "DUPLICADO";
        if ("AULA_DIFERENTE".equals(motivoNormalizado)) motivoNormalizado = "AMBIENTE_DIFERENTE";
        return repository.listar(usuario.esAdmin() ? null : usuario.idUsuario(), asignatura, examen,
                motivoNormalizado, fecha, busqueda);
    }
}
