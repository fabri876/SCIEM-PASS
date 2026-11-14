package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.sql.DriverManager;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named="jdbc.batch.integration", matches="true")
class CarreraEstudiantePostgresTest {
    @Test void consultaSoloPertenenciaExplicitaSinDependerDeCarreraAntigua() throws Exception {
        var yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),
                new FileSystemResource("src/main/resources/application-local.yaml"));
        var cfg = yaml.getObject();
        try (var c = DriverManager.getConnection(cfg.getProperty("spring.datasource.url"),
                cfg.getProperty("spring.datasource.username"), cfg.getProperty("spring.datasource.password"))) {
            c.setAutoCommit(false);
            try {
                var jdbc = new JdbcTemplate(new SingleConnectionDataSource(c, true));
                jdbc.execute("CREATE TEMP TABLE estudiante(idusuario integer,codsisestudiante integer)");
                jdbc.execute("CREATE TEMP TABLE carrera_plan(idcarrera integer,nombre text)");
                jdbc.execute("CREATE TEMP TABLE usuario_carrera_plan(idusuario integer,idcarrera integer,PRIMARY KEY(idusuario,idcarrera))");
                jdbc.execute("INSERT INTO estudiante VALUES(1,101),(2,102)");
                jdbc.execute("INSERT INTO carrera_plan VALUES(10,'Sistemas'),(20,'Industrial')");
                var repo = new CarreraEstudianteRepository(jdbc);
                assertTrue(repo.nombres(1,101).isEmpty());
                repo.vincular(1,10);
                repo.vincular(1,10);
                assertEquals(List.of("Sistemas"),repo.nombres(1,101));
                assertTrue(repo.nombres(2,102).isEmpty());
                repo.vincular(2,20);
                assertEquals(List.of("Sistemas"),repo.nombres(1,101));
                assertEquals(List.of("Industrial"),repo.nombres(2,102));
                assertFalse(repo.existeCarrera(999));
                assertFalse(repo.existeEstudiante(999));
            } finally { c.rollback(); }
        }
    }
}
