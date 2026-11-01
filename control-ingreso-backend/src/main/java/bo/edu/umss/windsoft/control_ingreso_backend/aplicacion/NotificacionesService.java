package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;
@Service
public class NotificacionesService {
    private final ExamenPublicoRepository examenes;
    private final CambioExamenRepository cambios;
    public NotificacionesService(ExamenPublicoRepository examenes,CambioExamenRepository cambios){this.examenes=examenes;this.cambios=cambios;}
    public record Avisos(List<ExamenPublicoDto> examenes,List<CambioExamenDto> cambios) {}
    @Transactional(readOnly=true) public Avisos propios(){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated()||!(auth.getDetails() instanceof Integer)) throw new AccessDeniedException("Inicie sesión para ver sus notificaciones.");
        int id=(Integer)auth.getDetails();
        String rol=auth.getAuthorities().stream().map(a->a.getAuthority().replaceFirst("^ROLE_", ""))
                .filter(r->List.of("ADMINISTRADOR","DOCENTE","ESTUDIANTE","OPERADOR","AYUDANTE").contains(r)).findFirst()
                .orElseThrow(()->new AccessDeniedException("El rol no tiene notificaciones de exámenes."));
        var ahora=ZonedDateTime.now(ZoneId.of("America/La_Paz"));
        return new Avisos(examenes.proximosParaUsuario(ahora.toLocalDate(),ahora.toLocalTime(),id,rol),cambios.recientesParaUsuario(id,rol));
    }
}
