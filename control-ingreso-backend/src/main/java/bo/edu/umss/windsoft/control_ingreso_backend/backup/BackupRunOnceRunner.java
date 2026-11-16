package bo.edu.umss.windsoft.control_ingreso_backend.backup;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

/** Punto de entrada para el Cron Job de Render. */
@Component
@ConditionalOnProperty(prefix = "backup", name = {"enabled", "run-once"}, havingValue = "true")
public class BackupRunOnceRunner implements ApplicationRunner {

    private final BackupSchedulerService backupSchedulerService;
    private final ConfigurableApplicationContext contexto;

    public BackupRunOnceRunner(BackupSchedulerService backupSchedulerService,
                               ConfigurableApplicationContext contexto) {
        this.backupSchedulerService = backupSchedulerService;
        this.contexto = contexto;
    }

    @Override
    public void run(ApplicationArguments args) {
        int codigo = 0;
        try {
            boolean generado = backupSchedulerService.ejecutarSiCorresponde();
            System.out.println(generado ? "Backup automatico generado" : "Backup aun no corresponde");
        } catch (Exception e) {
            codigo = 1;
            System.err.println("Backup automatico fallido: " + e.getMessage());
        }
        final int codigoSalida = codigo;
        Thread cierre = new Thread(() -> System.exit(SpringApplication.exit(contexto, () -> codigoSalida)));
        cierre.setName("cierre-backup-cron");
        cierre.start();
    }
}
