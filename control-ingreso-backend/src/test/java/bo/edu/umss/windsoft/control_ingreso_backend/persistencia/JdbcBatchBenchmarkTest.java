package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.sql.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in measurement: only pg_temp tables, rolled back; never touches application rows/sequences. */
@EnabledIfSystemProperty(named = "jdbc.batch.benchmark", matches = "true")
class JdbcBatchBenchmarkTest {
    private static final int ROWS = 100;
    private static final int BATCH = 50;
    private static final String HASH = "{argon2id}$argon2id$v=19$m=19456,t=2,p=1$" + "A".repeat(70);

    @Test @Timeout(600)
    void compareIndividualAndBatchedInserts() {
        var yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yaml"),
                new FileSystemResource("src/main/resources/application-local.yaml"));
        Properties config = yaml.getObject();
        assertNotNull(config);
        String url = config.getProperty("spring.datasource.url");
        assertNotNull(url, "Local datasource URL is required");
        // URL options take precedence over connection properties; remove only this benchmark option.
        url = url.replaceAll("([?&])reWriteBatchedInserts=[^&]*&?", "$1")
                .replaceAll("[?&]$", "");
        Properties auth = new Properties();
        auth.setProperty("user", config.getProperty("spring.datasource.username"));
        auth.setProperty("password", config.getProperty("spring.datasource.password"));
        auth.setProperty("connectTimeout", "15");
        auth.setProperty("socketTimeout", "30");
        auth.setProperty("prepareThreshold", "0");
        List<Mode> modes = List.of(new Mode("individual", false, false),
                new Mode("batch50", true, false), new Mode("batch50_rewrite", true, true));
        Map<String, double[]> results = new LinkedHashMap<>();
        System.out.println("JDBC_BENCH rows=" + ROWS + ", tables=3, batch=" + BATCH
                + ", rounds=3, hashes_precomputed=true, rollback=true");
        for (Mode mode : modes) results.put(mode.name(), new double[3]);
        try {
            for (Mode mode : modes) measure(url, auth, mode, 5); // warmup, not reported
            for (int round = 0; round < 3; round++) {
                List<Mode> order = new ArrayList<>(modes);
                Collections.rotate(order, round);
                for (Mode mode : order) {
                    double ms = measure(url, auth, mode, ROWS);
                    results.get(mode.name())[round] = ms;
                    System.out.printf(Locale.ROOT, "JDBC_BENCH %s,round=%d,ms=%.3f%n",
                            mode.name(), round + 1, ms);
                }
            }
        } catch (SQLException e) {
            // Do not expose datasource URLs, credentials, or server messages in logs.
            fail("Isolated JDBC benchmark failed; SQLState=" + e.getSQLState());
        }
        for (var entry : results.entrySet()) {
            double[] values = entry.getValue().clone();
            Arrays.sort(values);
            System.out.printf(Locale.ROOT, "JDBC_BENCH %s,median_ms=%.3f%n", entry.getKey(), values[1]);
        }
    }

    private double measure(String url, Properties auth, Mode mode, int rows) throws SQLException {
        Properties properties = new Properties();
        properties.putAll(auth);
        properties.setProperty("reWriteBatchedInserts", Boolean.toString(mode.rewrite()));
        try (Connection c = DriverManager.getConnection(url, properties)) {
            c.setAutoCommit(false);
            try {
                try (Statement st = c.createStatement()) {
                    st.execute("SET LOCAL statement_timeout = '20s'");
                    st.execute("CREATE TEMP TABLE jdbc_bench_usuario (id integer PRIMARY KEY, ci varchar(32) UNIQUE NOT NULL, correo varchar(160) UNIQUE NOT NULL, hash varchar(255) NOT NULL) ON COMMIT DROP");
                    st.execute("CREATE TEMP TABLE jdbc_bench_docente (id integer PRIMARY KEY REFERENCES pg_temp.jdbc_bench_usuario(id), sis integer UNIQUE NOT NULL) ON COMMIT DROP");
                    st.execute("CREATE TEMP TABLE jdbc_bench_relacion (id integer PRIMARY KEY REFERENCES pg_temp.jdbc_bench_docente(id), grupo integer NOT NULL) ON COMMIT DROP");
                }
                long started;
                double elapsed;
                try (PreparedStatement usuario = c.prepareStatement("INSERT INTO pg_temp.jdbc_bench_usuario VALUES (?, ?, ?, ?)");
                     PreparedStatement docente = c.prepareStatement("INSERT INTO pg_temp.jdbc_bench_docente VALUES (?, ?)");
                     PreparedStatement relacion = c.prepareStatement("INSERT INTO pg_temp.jdbc_bench_relacion VALUES (?, ?)")) {
                    started = System.nanoTime();
                    for (int i = 1; i <= rows; i++) {
                        usuario.setInt(1, i); usuario.setString(2, "QA" + i);
                        usuario.setString(3, "qa" + i + "@example.test"); usuario.setString(4, HASH);
                        docente.setInt(1, i); docente.setInt(2, 970000000 + i);
                        relacion.setInt(1, i); relacion.setInt(2, 1);
                        if (mode.batch()) {
                            usuario.addBatch(); docente.addBatch(); relacion.addBatch();
                            if (i % BATCH == 0 || i == rows) {
                                usuario.executeBatch(); docente.executeBatch(); relacion.executeBatch();
                            }
                        } else {
                            usuario.executeUpdate(); docente.executeUpdate(); relacion.executeUpdate();
                        }
                    }
                    elapsed = (System.nanoTime() - started) / 1_000_000.0;
                }
                try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(
                        "SELECT (SELECT count(*) FROM pg_temp.jdbc_bench_usuario), (SELECT count(*) FROM pg_temp.jdbc_bench_docente), (SELECT count(*) FROM pg_temp.jdbc_bench_relacion)")) {
                    assertTrue(rs.next());
                    for (int i = 1; i <= 3; i++) assertEquals(rows, rs.getInt(i));
                }
                return elapsed;
            } finally {
                c.rollback(); // rolls back the rows AND creation of all temporary tables
            }
        }
    }
    private record Mode(String name, boolean batch, boolean rewrite) {}
}
