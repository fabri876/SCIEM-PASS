package bo.edu.umss.windsoft.control_ingreso_backend.backup;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;

@Service
public class BackupSchedulerService {

    @Value("${backup.auto.enabled}") private boolean autoActivo;
    @Value("${backup.auto.interval-days}") private int intervaloDias;

    @Autowired private BackupService backupService;
    @Autowired private JdbcTemplate jdbc;

    @Scheduled(cron = "0 55 23 * * ?", zone = "America/La_Paz")
    public void backupAutomatico() {
        if (!autoActivo) return;
        try {
            Timestamp ultimo = jdbc.queryForObject(
                    "SELECT MAX(fecha) FROM bitacora_backups WHERE accion = 'GENERAR_AUTO' AND estado = 'EXITO'",
                    Timestamp.class);

            // +2 horas de tolerancia porque el backup anterior termina unos minutos después de las 23:55
            Instant limite = Instant.now().minus(Duration.ofDays(intervaloDias)).plus(Duration.ofHours(2));
            if (ultimo != null && ultimo.toInstant().isAfter(limite)) return;

            backupService.generar(BackupService.SISTEMA_ID, "GENERAR_AUTO");
        } catch (Exception e) {
            System.err.println("Backup automático falló: " + e.getMessage());
        }
    }
}