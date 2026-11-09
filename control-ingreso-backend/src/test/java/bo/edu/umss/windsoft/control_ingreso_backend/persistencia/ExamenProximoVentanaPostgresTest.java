package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named="jdbc.batch.integration",matches="true")
class ExamenProximoVentanaPostgresTest {
    @Test void incluyeHoyMananaYPasadoSinFiltrarSoloEnFrontend() throws Exception {
        var yaml=new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),new FileSystemResource("src/main/resources/application-local.yaml"));
        var cfg=yaml.getObject();
        try(var c=DriverManager.getConnection(cfg.getProperty("spring.datasource.url"),cfg.getProperty("spring.datasource.username"),cfg.getProperty("spring.datasource.password"))) {
            c.setAutoCommit(false);
            try {
                var jdbc=new JdbcTemplate(new SingleConnectionDataSource(c,true));
                jdbc.execute("CREATE TEMP TABLE semestre(idsemestre integer PRIMARY KEY,estado text)");
                jdbc.execute("INSERT INTO pg_temp.semestre VALUES(1,'ACTUAL'),(2,'FINALIZADO')");
                jdbc.execute("CREATE TEMP TABLE asignatura(idasignatura integer,nombreasignatura text)");
                jdbc.execute("INSERT INTO pg_temp.asignatura VALUES(101,'MATEMATICAS')");
                jdbc.execute("CREATE TEMP TABLE usuario(idusuario integer,nombreusuario text,apellidousuario text)");
                jdbc.execute("CREATE TEMP TABLE aula(idaula integer,nombreaula text,ubicacionaula text)");
                jdbc.execute("CREATE TEMP TABLE grupo(idgrupo integer,idasignatura integer,idsemestre integer)");
                jdbc.execute("INSERT INTO pg_temp.grupo VALUES(11,101,1),(12,101,1)");
                for(String tabla:List.of("docentegrupo","estudiantegrupo","ayudantegrupo"))
                    jdbc.execute("CREATE TEMP TABLE "+tabla+"(idusuario integer,idgrupo integer)");
                jdbc.execute("INSERT INTO pg_temp.estudiantegrupo VALUES(42,11)");
                jdbc.execute("CREATE TEMP TABLE examen(idexamen integer,idgrupo integer,idasignatura integer,idsemestre integer,idusuario integer,estadoexamen boolean,fechaexamen date)");
                jdbc.execute("CREATE TEMP TABLE ambiente(idambiente integer,idexamen integer,idasignatura integer,idaula integer,horainicio time,horafin time)");
                // Fecha fija al final de mes: la ventana debe alcanzar el siguiente mes.
                var hoy=LocalDate.of(2026,10,31);
                for(int i=0;i<8;i++) {
                    int dias=new int[]{-1,0,1,2,3,7,30,0}[i];
                    jdbc.update("INSERT INTO pg_temp.examen VALUES(?,11,101,1,9,true,?)",i+1,hoy.plusDays(dias));
                    jdbc.update("INSERT INTO pg_temp.ambiente VALUES(?,?,101,1,'08:00',?)",i+1,i+1,i==7?LocalTime.of(9,0):LocalTime.of(23,59));
                }
                jdbc.update("INSERT INTO pg_temp.examen VALUES(9,11,101,1,9,false,?),(10,11,101,2,9,true,?),(11,12,101,1,9,true,?)",hoy,hoy,hoy.plusDays(1));
                var repo=new ExamenPublicoRepository(jdbc);
                var hora=LocalTime.of(12,0);
                // Ni ayer, ni hoy ya terminado, ni cancelados, ni otro semestre, ni de tres dias en adelante.
                assertEquals(List.of(2,3,11,4),repo.proximos(hoy,hora).stream().map(e->e.intId()).toList());
                assertEquals(List.of(2,3,4),repo.proximosParaUsuario(hoy,hora,42,"ESTUDIANTE").stream().map(e->e.intId()).toList());
                assertEquals(List.of(2,3,11,4),repo.proximosParaUsuario(hoy,hora,1,"ADMINISTRADOR").stream().map(e->e.intId()).toList());
                // El de tres dias entra automaticamente cuando avanza un dia la ventana.
                assertEquals(List.of(3,11,4,5),repo.proximos(hoy.plusDays(1),LocalTime.MIN).stream().map(e->e.intId()).toList());
            } finally { c.rollback(); }
        }
    }
}
