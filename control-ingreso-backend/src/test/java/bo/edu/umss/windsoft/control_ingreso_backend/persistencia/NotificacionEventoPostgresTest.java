package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.sql.DriverManager;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named="jdbc.batch.integration",matches="true")
class NotificacionEventoPostgresTest {
    @Test void eventosTransaccionalesDestinatariosYRetiroSinDuplicarPorAulas() throws Exception {
        var yaml=new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),new FileSystemResource("src/main/resources/application-local.yaml"));
        var cfg=yaml.getObject();
        try(var c=DriverManager.getConnection(cfg.getProperty("spring.datasource.url"),cfg.getProperty("spring.datasource.username"),cfg.getProperty("spring.datasource.password"))) {
            c.setAutoCommit(false);
            try {
                var ds=new SingleConnectionDataSource(c,true);
                var j=new JdbcTemplate(ds);
                j.execute("SET LOCAL search_path TO pg_temp, public");
                j.execute("""
                    CREATE TEMP TABLE usuario(idusuario integer PRIMARY KEY);
                    INSERT INTO usuario VALUES(1),(2),(3),(4),(5),(6);
                    CREATE TEMP TABLE semestre(idsemestre integer PRIMARY KEY,estado text);
                    INSERT INTO semestre VALUES(1,'ACTUAL');
                    CREATE FUNCTION pg_temp.semestre_actual_id() RETURNS integer LANGUAGE sql AS 'SELECT 1';
                    CREATE TEMP TABLE asignatura(idasignatura integer PRIMARY KEY,nombreasignatura text);
                    INSERT INTO asignatura VALUES(1,'Cálculo');
                    CREATE TEMP TABLE examen(idexamen integer PRIMARY KEY,idasignatura integer,idsemestre integer,idgrupo integer,idusuario integer,estadoexamen boolean,fechaexamen date);
                    CREATE TEMP TABLE aula(idaula integer PRIMARY KEY,nombreaula text);
                    INSERT INTO aula VALUES(1,'Aula A'),(2,'Aula B');
                    CREATE TEMP TABLE ambiente(idambiente integer PRIMARY KEY,idexamen integer,idasignatura integer,idaula integer,horainicio time,horafin time);
                    CREATE TEMP TABLE grupo(idgrupo integer PRIMARY KEY,idsemestre integer,idasignatura integer);
                    INSERT INTO grupo VALUES(1,1,1),(2,1,1);
                    CREATE TEMP TABLE estudiantegrupo(idusuario integer,idgrupo integer);
                    INSERT INTO estudiantegrupo VALUES(2,1),(3,2);
                    CREATE TEMP TABLE docentegrupo(idusuario integer,idgrupo integer);
                    INSERT INTO docentegrupo VALUES(1,1);
                    CREATE TEMP TABLE estudiante(idusuario integer,codsisestudiante integer);
                    INSERT INTO estudiante VALUES(2,102),(3,103);
                    CREATE TEMP TABLE ayudante_examen(idexamen integer,idayudante integer,idambiente integer,estado_asignacion text);
                    CREATE TEMP TABLE habilitacion(idhabilitacion integer,idusuario integer,idexamen integer,estadohabilitacion boolean,observacionhabilitacion text);
                    CREATE TEMP TABLE incidencia(idincidencia integer,idambiente integer,idusuarioreporta integer,tipoincidencia text);
                    CREATE TEMP TABLE cambio_examen(id integer,idexamen integer,tipo text,anterior text,actual text,fecha timestamptz DEFAULT clock_timestamp());
                    """);
                String sql=Files.readString(Path.of("src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-11-11_notificaciones_eventos.sql"));
                sql=sql.replace("FUNCTION registrar_evento_notificacion()","FUNCTION pg_temp.registrar_evento_notificacion()");
                j.execute(sql);
                var repo=new NotificacionEventoRepository(new NamedParameterJdbcTemplate(ds));
                j.execute("INSERT INTO examen VALUES(10,1,1,1,1,true,CURRENT_DATE+10)");
                j.execute("INSERT INTO ambiente VALUES(1,10,1,1,'08:00','10:00'),(2,10,1,2,'08:00','10:00')");
                assertEquals(1,repo.propios(2,"ESTUDIANTE").size(),"Un aviso por examen, aunque tenga dos aulas y falten diez días");
                assertTrue(repo.propios(3,"ESTUDIANTE").isEmpty(),"Otro grupo no es destinatario");
                assertTrue(repo.propios(6,"OPERADOR").isEmpty(),"Un ayudante no asignado no recibe avisos");
                j.execute("INSERT INTO ayudante_examen VALUES(10,5,1,'ACTIVO')");
                assertEquals("ASIGNACION",repo.propios(5,"OPERADOR").getFirst().tipo());
                j.execute("UPDATE ayudante_examen SET estado_asignacion='INACTIVO' WHERE idayudante=5");
                assertEquals(1,repo.propios(5,"OPERADOR").size());
                assertEquals("RETIRO",repo.propios(5,"OPERADOR").getFirst().tipo());
                j.execute("INSERT INTO habilitacion VALUES(1,2,10,false,'Documentación pendiente')");
                var estudiante=repo.propios(2,"ESTUDIANTE");
                assertEquals(1,estudiante.size());
                assertEquals("INHABILITACION",estudiante.getFirst().tipo());
                assertEquals("Documentación pendiente",estudiante.getFirst().descripcion());
                j.execute("INSERT INTO incidencia VALUES(1,1,1,'OTRA')");
                assertTrue(repo.propios(4,"ADMINISTRADOR").stream().anyMatch(e->e.tipo().equals("INCIDENCIA")));
                assertTrue(repo.propios(1,"DOCENTE").stream().anyMatch(e->e.tipo().equals("INCIDENCIA")));
                assertFalse(repo.propios(2,"ESTUDIANTE").stream().anyMatch(e->e.tipo().equals("INCIDENCIA")));
                j.execute("INSERT INTO cambio_examen(id,idexamen,tipo,anterior,actual) VALUES(1,10,'AULA','Aula A (#1)','Aula B (#2)')");
                assertEquals("AULA",repo.propios(1,"DOCENTE").getFirst().tipo(),"Orden de generación, no fecha del examen");
                assertTrue(repo.propios(1,"DOCENTE").stream().allMatch(e->e.fecha()!=null));
                var punto=c.setSavepoint();
                j.execute("INSERT INTO incidencia VALUES(2,1,1,'OTRA')");
                c.rollback(punto);
                assertEquals(1,j.queryForObject("SELECT count(*) FROM notificacion_evento WHERE tipo='INCIDENCIA'",Integer.class));
            } finally { c.rollback(); }
        }
    }
}
