import java.lang.management.ManagementFactory;
import java.util.Arrays;
import java.util.Locale;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

/** Local sequential microbenchmark; uses synthetic passwords and never connects to the DB. */
public class PasswordHashBenchmark {
    private static final int SAMPLES = 30;
    private static final String PASSWORD = "Prueba-local-2026!";

    public static void main(String[] args) {
        var bcrypt = new BCryptPasswordEncoder(10);
        var pbkdf2 = new Pbkdf2PasswordEncoder("", 16, 600_000,
                Pbkdf2PasswordEncoder.SecretKeyFactoryAlgorithm.PBKDF2WithHmacSHA256);
        boolean compareArgon2 = args.length > 0 && args[0].equals("argon2");
        PasswordEncoder alternative = compareArgon2
                ? new Argon2PasswordEncoder(16, 32, 1, 19456, 2) : pbkdf2;
        String alternativeName = compareArgon2 ? "argon2id-19MiB-t2-p1" : "pbkdf2-sha256-600000";
        System.out.println("Java=" + System.getProperty("java.version") + "; samples=" + SAMPLES);
        System.out.println("algorithm,operation,median_ms,p95_ms,mean_cpu_ms");
        for (int i = 0; i < 15; i++) {
            bcrypt.matches(PASSWORD, bcrypt.encode(PASSWORD));
            alternative.matches(PASSWORD, alternative.encode(PASSWORD));
        }
        for (int round = 1; round <= 2; round++) {
            if (round == 1) {
                measure("bcrypt10-round" + round, bcrypt);
                measure(alternativeName + "-round" + round, alternative);
            } else {
                measure(alternativeName + "-round" + round, alternative);
                measure("bcrypt10-round" + round, bcrypt);
            }
        }
    }

    private static void measure(String name, PasswordEncoder encoder) {
        String hash = encoder.encode(PASSWORD);
        var bean = ManagementFactory.getThreadMXBean();
        for (boolean verify : new boolean[]{false, true}) {
            double[] times = new double[SAMPLES];
            long cpu = 0;
            for (int i = 0; i < SAMPLES; i++) {
                long startCpu = bean.getCurrentThreadCpuTime();
                long start = System.nanoTime();
                if (verify) {
                    if (!encoder.matches(PASSWORD, hash)) throw new AssertionError("Password mismatch");
                } else {
                    hash = encoder.encode(PASSWORD);
                }
                times[i] = (System.nanoTime() - start) / 1_000_000.0;
                cpu += bean.getCurrentThreadCpuTime() - startCpu;
            }
            Arrays.sort(times);
            System.out.printf(Locale.ROOT, "%s,%s,%.3f,%.3f,%.3f%n", name,
                    verify ? "matches" : "encode", (times[14] + times[15]) / 2,
                    times[28], cpu / (SAMPLES * 1_000_000.0));
        }
    }
}
