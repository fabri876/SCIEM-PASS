package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.nio.file.*;
import java.sql.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import static org.junit.jupiter.api.Assertions.*;

/** Prueba la migracion y vigencia solo en tablas/funciones temporales; rollback total. */
@EnabledIfSystemProperty(named="jdbc.batch.integration",matches="true")
class SemestreFechasPostgresTest {
    @Test void fechasProvisionalesVencimientoYArchivoProtegenLasAsignaciones() throws Exception {
        var yaml=new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),new FileSystemResource("src/main/resources/application-local.yaml"));
        var cfg=yaml.getObject();
        try(var c=DriverManager.getConnection(cfg.getProperty("spring.datasource.url"),cfg.getProperty("spring.datasource.username"),cfg.getProperty("spring.datasource.password"))) {
            c.setAutoCommit(false);
            try(var st=c.createStatement()) {
                st.execute("CREATE TEMP TABLE semestre(idsemestre integer PRIMARY KEY,anio integer,numero integer,estado text)");
                st.execute("INSERT INTO pg_temp.semestre VALUES (1,2026,2,'ACTUAL')");
                for(String tabla:java.util.List.of("grupo","examen","horarioregular"))st.execute("CREATE TEMP TABLE "+tabla+" (idgrupo integer PRIMARY KEY,idsemestre integer)");
                for(String tabla:java.util.List.of("docentegrupo","estudiantegrupo","ayudantegrupo"))st.execute("CREATE TEMP TABLE "+tabla+" (idgrupo integer)");
                String migration=Files.readString(Path.of("src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-10-31_fechas_semestres.sql"))
                        .replace("FUNCTION validar_vigencia_semestre()","FUNCTION pg_temp.validar_vigencia_semestre()")
                        .replace("SET search_path=pg_catalog,public","SET search_path=pg_temp,pg_catalog");
                st.execute(migration);
                try(var rs=st.executeQuery("SELECT fecha_inicio,fecha_fin FROM pg_temp.semestre WHERE idsemestre=1")) {
                    assertTrue(rs.next());assertEquals("2026-08-01",rs.getString(1));assertEquals("2026-12-13",rs.getString(2));
                }
                st.execute("INSERT INTO pg_temp.grupo VALUES(1,1)");
                st.execute("INSERT INTO pg_temp.estudiantegrupo VALUES(1)");
                var fechaIncorrecta=c.setSavepoint();
                assertThrows(SQLException.class,()->st.execute("UPDATE pg_temp.semestre SET fecha_fin=DATE '2026-07-01' WHERE idsemestre=1"));
                c.rollback(fechaIncorrecta);
                st.execute("UPDATE pg_temp.semestre SET fecha_inicio=(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date-10,fecha_fin=(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date-1 WHERE idsemestre=1");
                var vencido=c.setSavepoint();
                SQLException rechazo=assertThrows(SQLException.class,()->st.execute("INSERT INTO pg_temp.estudiantegrupo VALUES(1)"));
                assertEquals("23514",rechazo.getSQLState());c.rollback(vencido);
                st.execute("UPDATE pg_temp.semestre SET fecha_fin=(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date+10,archivado_en=CURRENT_TIMESTAMP WHERE idsemestre=1");
                var archivado=c.setSavepoint();
                assertThrows(SQLException.class,()->st.execute("DELETE FROM pg_temp.grupo WHERE idgrupo=1"));
                c.rollback(archivado);
                System.out.println("SEMESTRE_FECHAS_POSTGRES fechas=OK, rango=OK, vencimiento=OK, archivo=protegido, rollback=true");
            } finally {c.rollback();}
        }
    }
}
