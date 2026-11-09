package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.nio.file.*;
import java.sql.DriverManager;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named="jdbc.batch.integration",matches="true")
class ExamenArchivadoPostgresTest {
    @Test void archivoIndependienteOrdenadoConDuplicadosAtomicosYDescargaExacta() throws Exception {
        var yaml=new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),new FileSystemResource("src/main/resources/application-local.yaml"));
        var cfg=yaml.getObject();
        try(var c=DriverManager.getConnection(cfg.getProperty("spring.datasource.url"),cfg.getProperty("spring.datasource.username"),cfg.getProperty("spring.datasource.password"))) {
            c.setAutoCommit(false);
            try {
                var jdbc=new JdbcTemplate(new SingleConnectionDataSource(c,true));
                String sql=Files.readString(Path.of("src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-11-04_examenes_archivados.sql"))
                    .replace("BEGIN;","").replace("COMMIT;","").replace("CREATE TABLE IF NOT EXISTS","CREATE TEMP TABLE");
                jdbc.execute(sql);
                var repo=new ExamenArchivadoRepository(jdbc);byte[] pdf={1,2,3};
                var viejo=new ExamenArchivadoRequest("Antiguo","2-2005",null,"");
                var actual=new ExamenArchivadoRequest("Reciente","2-2026",LocalDate.of(2026,7,21),"Fuente publica");
                Long viejoId=repo.guardar(viejo,pdf,"a".repeat(64));
                Long nuevoId=repo.guardar(actual,pdf,"b".repeat(64));
                assertNotNull(viejoId);assertNotNull(nuevoId);
                assertNull(repo.guardar(actual,pdf,"b".repeat(64)));
                var pagina=repo.listar(1,0);assertEquals(nuevoId,pagina.getFirst().intId());
                assertEquals(viejoId,repo.listar(1,1).getFirst().intId());
                assertArrayEquals(pdf,repo.pdf(nuevoId).orElseThrow());
                assertTrue(repo.pdf(-1).isEmpty());
                assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM pg_temp.examen_pasado_documento",Integer.class));
            } finally { c.rollback(); }
        }
    }
}
