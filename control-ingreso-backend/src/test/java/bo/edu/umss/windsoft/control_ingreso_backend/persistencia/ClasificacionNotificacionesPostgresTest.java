package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.LectorHorarioPdf;
import java.sql.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.junit.jupiter.api.Assertions.*;
@EnabledIfSystemProperty(named="jdbc.batch.integration",matches="true")
class ClasificacionNotificacionesPostgresTest {
    @Test void clasificaSinDuplicarYNotificaSoloLosGruposPropios() throws Exception {
        var yaml=new YamlPropertiesFactoryBean();yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),new FileSystemResource("src/main/resources/application-local.yaml"));var cfg=yaml.getObject();
        try(var c=DriverManager.getConnection(cfg.getProperty("spring.datasource.url"),cfg.getProperty("spring.datasource.username"),cfg.getProperty("spring.datasource.password"))){c.setAutoCommit(false);
            try{
                var jdbc=new JdbcTemplate(new SingleConnectionDataSource(c,true));
                jdbc.execute("CREATE TEMP TABLE semestre(idsemestre integer PRIMARY KEY,estado text,numero integer,anio integer)");
                jdbc.execute("INSERT INTO pg_temp.semestre VALUES(1,'ACTUAL',2,2026)");
                jdbc.execute("CREATE TEMP TABLE asignatura(idasignatura integer PRIMARY KEY,codigooficial text,nombreasignatura text)");
                jdbc.execute("INSERT INTO pg_temp.asignatura VALUES(101,'2008053','ALGEBRA I'),(102,'2008019','ALGEBRA I')");
                String sql=Files.readString(Path.of("src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-10-31_carreras_niveles.sql"));
                jdbc.execute(sql.replace("CREATE TABLE IF NOT EXISTS","CREATE TEMP TABLE"));
                var clasificacion=new ClasificacionAcademicaRepository(jdbc);
                var fisica=new LectorHorarioPdf().interpretarClasificacion("LICENCIATURA EN FISICA\nGestión Académica 2/2026\nA 2008053 ALGEBRA I\nB 2008019 ALGEBRA I");
                clasificacion.clasificar(fisica,"760101");clasificacion.clasificar(fisica,"760101");
                assertEquals(1,clasificacion.carreras().size());
                var niveles=clasificacion.niveles(clasificacion.carreras().getFirst().idCarrera());assertEquals(2,niveles.size());
                assertEquals("2008053",clasificacion.materias(clasificacion.carreras().getFirst().idCarrera(),niveles.getFirst().idNivel()).getFirst().codigoOficial());
                assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM pg_temp.asignatura_carrera_nivel",Integer.class));
                jdbc.execute("CREATE TEMP TABLE grupo(idgrupo integer,idasignatura integer,idsemestre integer)");
                jdbc.execute("INSERT INTO pg_temp.grupo VALUES(11,101,1),(12,101,1)");
                for(String tabla:List.of("docentegrupo","estudiantegrupo","ayudantegrupo"))jdbc.execute("CREATE TEMP TABLE "+tabla+"(idusuario integer,idgrupo integer)");
                jdbc.execute("INSERT INTO pg_temp.estudiantegrupo VALUES(10,11),(20,12)");jdbc.execute("INSERT INTO pg_temp.ayudantegrupo VALUES(30,11)");jdbc.execute("INSERT INTO pg_temp.docentegrupo VALUES(9,11)");
                jdbc.execute("CREATE TEMP TABLE examen(idexamen integer,idgrupo integer,idasignatura integer,idsemestre integer,idusuario integer,estadoexamen boolean,fechaexamen date)");
                jdbc.execute("INSERT INTO pg_temp.examen VALUES(201,11,101,1,1,true,CURRENT_DATE+1),(202,12,101,1,2,true,CURRENT_DATE+1),(203,NULL,101,1,1,true,CURRENT_DATE+1)");
                jdbc.execute("CREATE TEMP TABLE usuario(idusuario integer,nombreusuario text,apellidousuario text)");
                jdbc.execute("CREATE TEMP TABLE ambiente(idambiente integer,idexamen integer,idasignatura integer,idaula integer,horainicio time,horafin time)");
                jdbc.execute("CREATE TEMP TABLE aula(idaula integer,nombreaula text,ubicacionaula text)");
                jdbc.execute("CREATE TEMP TABLE cambio_examen(id bigint,idexamen integer,tipo text,anterior text,actual text,fecha timestamptz)");
                jdbc.execute("INSERT INTO pg_temp.cambio_examen SELECT idexamen,idexamen,'AULA','A','B',CURRENT_TIMESTAMP FROM pg_temp.examen");
                var examenes=new ExamenPublicoRepository(jdbc);var cambios=new CambioExamenRepository(jdbc);
                var hoy=LocalDate.now(ZoneId.of("America/La_Paz"));
                for(String rol:List.of("ESTUDIANTE","DOCENTE","OPERADOR")){
                    int id=rol.equals("ESTUDIANTE")?10:rol.equals("DOCENTE")?9:30;
                    assertEquals(Set.of(201,203),new HashSet<>(examenes.proximosParaUsuario(hoy,LocalTime.MIN,id,rol).stream().map(e->e.intId()).toList()));
                    assertEquals(Set.of(201L,203L),new HashSet<>(cambios.recientesParaUsuario(id,rol).stream().map(e->e.id()).toList()));
                }
                assertEquals(0,examenes.proximosParaUsuario(hoy,LocalTime.MIN,99,"ESTUDIANTE").size());
                assertEquals(3,examenes.proximos(hoy,LocalTime.MIN).size());
                assertEquals(3,examenes.proximosParaUsuario(hoy,LocalTime.MIN,99,"ADMINISTRADOR").size());
            }finally{c.rollback();}
        }
    }
}
