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
    private final NotificacionEventoRepository eventos;
    private final AsignacionAulaService aulas;
    public NotificacionesService(ExamenPublicoRepository examenes,CambioExamenRepository cambios){this(examenes,cambios,null,null);}
    @org.springframework.beans.factory.annotation.Autowired
    public NotificacionesService(ExamenPublicoRepository examenes,CambioExamenRepository cambios,
            NotificacionEventoRepository eventos,AsignacionAulaService aulas){this.examenes=examenes;this.cambios=cambios;this.eventos=eventos;this.aulas=aulas;}
    public record AvisoEvento(String intId,String strTipo,String strTitulo,String strDescripcion,OffsetDateTime fecha) {}
    public record Avisos(List<ExamenPublicoDto> examenes,List<CambioExamenDto> cambios,List<AvisoEvento> eventos) {
        public Avisos(List<ExamenPublicoDto> examenes,List<CambioExamenDto> cambios){this(examenes,cambios,List.of());}
    }
    @Transactional(readOnly=true) public Avisos propios(){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated()||!(auth.getDetails() instanceof Integer)) throw new AccessDeniedException("Inicie sesión para ver sus notificaciones.");
        int id=(Integer)auth.getDetails();
        String rol=auth.getAuthorities().stream().map(a->a.getAuthority().replaceFirst("^ROLE_", ""))
                .filter(r->List.of("ADMINISTRADOR","DOCENTE","ESTUDIANTE","OPERADOR","AYUDANTE").contains(r)).findFirst()
                .orElseThrow(()->new AccessDeniedException("El rol no tiene notificaciones de exámenes."));
        var ahora=ZonedDateTime.now(ZoneId.of("America/La_Paz"));
        if(eventos!=null) return new Avisos(List.of(),List.of(),eventos.propios(id,rol).stream().map(e->personalizar(e,rol)).toList());
        return new Avisos(examenes.proximosParaUsuario(ahora.toLocalDate(),ahora.toLocalTime(),id,rol),cambios.recientesParaUsuario(id,rol));
    }

    private AvisoEvento personalizar(NotificacionEventoRepository.Evento e,String rol) {
        String descripcion=e.asignatura()+" · "+e.descripcion();
        if(List.of("PROGRAMADO","ASIGNACION").contains(e.tipo())) {
            String aula=e.aulas(), horario=e.horarios();
            if("ESTUDIANTE".equals(rol)) {
                var asignada=e.codigoSis()==null ? java.util.Optional.<AsignacionAulaService.AulaExamen>empty()
                        : aulas.aulaAsignada(e.idAsignatura(),e.idExamen(),e.codigoSis());
                aula=asignada.map(AsignacionAulaService.AulaExamen::nombre).orElse("Aula por confirmar");
                horario=asignada.map(a->a.ambiente().getHoraInicio()+" - "+a.ambiente().getHoraFin()).orElse("Horario por confirmar");
            }
            descripcion=e.asignatura()+" · "+e.fechaExamen().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    +" · "+(horario==null?"Horario por confirmar":horario)+" · "+(aula==null?"Aula por confirmar":aula)+". "+e.descripcion();
        }
        return new AvisoEvento("evento-"+e.id(),"examen",e.titulo(),descripcion,e.fecha());
    }
}
