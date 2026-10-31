package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.SemestreService;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
@EnableScheduling
public class CierreSemestreProgramado {
    private static final Logger log=LoggerFactory.getLogger(CierreSemestreProgramado.class);
    private final SemestreService semestres;
    public CierreSemestreProgramado(SemestreService semestres){this.semestres=semestres;}
    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron="0 */5 * * * *",zone="America/La_Paz")
    public void revisar(){
        try {semestres.archivarVencido();}
        catch(RuntimeException ex){log.error("No se pudo comprobar el cierre del semestre. Se reintentara en la siguiente revision.",ex);}
    }
}
