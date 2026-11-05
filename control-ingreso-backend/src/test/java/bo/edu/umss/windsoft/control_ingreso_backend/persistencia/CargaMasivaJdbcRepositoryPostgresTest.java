package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.PasswordEncoderConfig;
import java.sql.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.junit.jupiter.api.Assertions.*;

/** PostgreSQL real, exclusivamente tablas/secuencias pg_temp; rollback total incluso ante error. */
@EnabledIfSystemProperty(named = "jdbc.batch.integration", matches = "true")
class CargaMasivaJdbcRepositoryPostgresTest {
    @Test void guardaRolesRelacionesYHabilitacionesConHashesIndividualesYRevierteErrores() throws Exception {
        var yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),
                new FileSystemResource("src/main/resources/application-local.yaml"));
        Properties config = yaml.getObject();
        Properties auth = new Properties();
        auth.setProperty("user", config.getProperty("spring.datasource.username"));
        auth.setProperty("password", config.getProperty("spring.datasource.password"));
        auth.setProperty("connectTimeout", "15"); auth.setProperty("socketTimeout", "30");
        try (Connection c = DriverManager.getConnection(config.getProperty("spring.datasource.url"), auth)) {
            c.setAutoCommit(false);
            try {
                fixture(c);
                JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(c, true));
                var repo = new CargaMasivaJdbcRepository(jdbc);
                var encoder = new PasswordEncoderConfig().passwordEncoder();
                List<AltaUsuarioLote> altas = new ArrayList<>();
                long hashStart = System.nanoTime();
                for (int i = 0; i < 100; i++) altas.add(alta("ESTUDIANTE", i, Set.of(1), encoder.encode("1234567")));
                altas.add(alta("DOCENTE", 100, Set.of(1, 2), encoder.encode("1234567")));
                altas.add(alta("OPERADOR", 101, Set.of(1), encoder.encode("1234567")));
                altas.add(alta("ADMINISTRADOR", 102, Set.of(), encoder.encode("1234567")));
                double hashMs = (System.nanoTime() - hashStart) / 1_000_000.0;
                Savepoint before = c.setSavepoint();
                long start = System.nanoTime(); repo.guardarNuevos(altas);
                double saveMs = (System.nanoTime() - start) / 1_000_000.0;
                assertEquals(103, count(jdbc, "usuario")); assertEquals(100, count(jdbc, "estudiante"));
                assertEquals(1, count(jdbc, "docente")); assertEquals(1, count(jdbc, "ayudante"));
                assertEquals(1, count(jdbc, "admin")); assertEquals(2, count(jdbc, "docentegrupo"));
                assertEquals(1, count(jdbc, "docenteasignatura")); assertEquals(100, count(jdbc, "estudiantegrupo"));
                assertEquals(1, count(jdbc, "ayudantegrupo")); assertEquals(100, count(jdbc, "habilitacion"));
                assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM pg_temp.habilitacion WHERE idexamen=2", Integer.class));
                List<String> hashes = jdbc.queryForList("SELECT contraseniausuario FROM pg_temp.usuario", String.class);
                assertEquals(103, new HashSet<>(hashes).size());
                assertTrue(encoder.matches("1234567", hashes.getFirst()));
                assertEquals(100, jdbc.queryForObject("SELECT count(*) FROM pg_temp.estudiantegrupo WHERE idasignatura=10 AND idsemestre=1 AND fechainscripcion IS NOT NULL", Integer.class));
                c.rollback(before);
                assertEquals(0, count(jdbc, "usuario"));
                // Dos grupos de la misma asignatura: la constraint real de este fixture debe rechazarlo.
                Savepoint bad = c.setSavepoint();
                assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                        () -> repo.guardarNuevos(List.of(alta("ESTUDIANTE", 104, Set.of(1, 2), hashes.getFirst()))));
                c.rollback(bad);
                assertEquals(0, count(jdbc, "usuario")); assertEquals(0, count(jdbc, "estudiante"));
                // Fallo en una tabla hija: no dejar usuarios sueltos tras rollback de la operacion.
                Savepoint duplicate = c.setSavepoint();
                var a = alta("DOCENTE", 105, Set.of(1), hashes.getFirst());
                var b = new AltaUsuarioLote(alta("DOCENTE", 106, Set.of(1), hashes.get(1)).usuario(), "DOCENTE", a.codigoSis(), Set.of(1));
                assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                        () -> repo.guardarNuevos(List.of(a, b)));
                c.rollback(duplicate); assertEquals(0, count(jdbc, "usuario"));
                System.out.printf(Locale.ROOT, "BATCH_REAL_REPOSITORY users=103, hash_ms=%.3f, persistence_ms=%.3f, rollback_checks=OK%n", hashMs, saveMs);
            } finally { c.rollback(); }
        } catch (SQLException e) { fail("PostgreSQL isolated integration failed; SQLState=" + e.getSQLState()); }
    }

    private AltaUsuarioLote alta(String rol, int i, Set<Integer> grupos, String hash) {
        return new AltaUsuarioLote(new Usuario("QA" + i, "Prueba", "Temporal", null,
                "qa" + i + "@example.test", hash, true), rol, 970000000 + i, grupos);
    }
    private int count(JdbcTemplate jdbc, String table) {
        return jdbc.queryForObject("SELECT count(*) FROM pg_temp." + table, Integer.class);
    }
    private void fixture(Connection c) throws SQLException {
        List<String> ddl = List.of(
            "CREATE TEMP SEQUENCE usuario_idusuario_seq",
            "CREATE TEMP SEQUENCE habilitacion_idhabilitacion_seq",
            "CREATE TEMP TABLE usuario (idusuario integer PRIMARY KEY, ciusuario text UNIQUE, nombreusuario text, apellidousuario text, telefonousuario integer, correousuario text UNIQUE, contraseniausuario varchar(255), estadousuario boolean, intentos_fallidos integer)",
            "CREATE TEMP TABLE docente (idusuario integer PRIMARY KEY REFERENCES pg_temp.usuario, codsisdocente integer UNIQUE)",
            "CREATE TEMP TABLE estudiante (idusuario integer PRIMARY KEY REFERENCES pg_temp.usuario, codsisestudiante integer UNIQUE)",
            "CREATE TEMP TABLE ayudante (idusuario integer PRIMARY KEY REFERENCES pg_temp.usuario)",
            "CREATE TEMP TABLE admin (idusuario integer PRIMARY KEY REFERENCES pg_temp.usuario)",
            "CREATE TEMP TABLE grupo (idgrupo integer PRIMARY KEY, idasignatura integer, idsemestre integer)",
            "INSERT INTO pg_temp.grupo VALUES (1,10,1),(2,10,1)",
            "CREATE TEMP TABLE docenteasignatura (idusuario integer REFERENCES pg_temp.docente, codsisdocente integer, idasignatura integer, PRIMARY KEY(idusuario,codsisdocente,idasignatura))",
            "CREATE TEMP TABLE docentegrupo (idusuario integer REFERENCES pg_temp.docente, codsisdocente integer, idgrupo integer REFERENCES pg_temp.grupo, UNIQUE(idusuario,idgrupo))",
            "CREATE TEMP TABLE estudiantegrupo (idusuario integer REFERENCES pg_temp.estudiante, codsisestudiante integer, idgrupo integer REFERENCES pg_temp.grupo, fechainscripcion timestamp, idasignatura integer, idsemestre integer, UNIQUE(idusuario,idasignatura,idsemestre))",
            "CREATE FUNCTION pg_temp.fixture_derivar_grupo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN SELECT idasignatura,idsemestre INTO NEW.idasignatura,NEW.idsemestre FROM pg_temp.grupo WHERE idgrupo=NEW.idgrupo; RETURN NEW; END $$",
            "CREATE TRIGGER fixture_derivar BEFORE INSERT ON pg_temp.estudiantegrupo FOR EACH ROW EXECUTE FUNCTION pg_temp.fixture_derivar_grupo()",
            "CREATE TEMP TABLE ayudantegrupo (idusuario integer REFERENCES pg_temp.ayudante, idgrupo integer REFERENCES pg_temp.grupo)",
            "CREATE TEMP TABLE examen (idexamen integer PRIMARY KEY, idasignatura integer, idsemestre integer)",
            "INSERT INTO pg_temp.examen VALUES (1,10,1),(2,10,2)",
            "CREATE TEMP TABLE habilitacion (idhabilitacion integer PRIMARY KEY, idusuario integer REFERENCES pg_temp.estudiante, codsisestudiante integer, idasignatura integer, idexamen integer REFERENCES pg_temp.examen, estadohabilitacion boolean, observacionhabilitacion text, fecharegistro date, UNIQUE(codsisestudiante,idasignatura,idexamen))"
        );
        try (Statement st = c.createStatement()) { for (String sql : ddl) st.execute(sql); }
    }
}
