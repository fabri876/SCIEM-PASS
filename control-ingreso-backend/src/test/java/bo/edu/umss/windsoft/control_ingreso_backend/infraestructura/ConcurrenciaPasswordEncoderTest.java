package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;

class ConcurrenciaPasswordEncoderTest {
    @Test void limitaElTrabajoCompartidoYLiberaTodosLosTurnos() throws Exception {
        var activos = new AtomicInteger(); var maximo = new AtomicInteger();
        var dentro = new CountDownLatch(4); var salida = new CountDownLatch(1);
        PasswordEncoder delegate = new PasswordEncoder() {
            public String encode(CharSequence raw) {
                maximo.accumulateAndGet(activos.incrementAndGet(), Math::max); dentro.countDown();
                try { salida.await(); return "hash"; }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                finally { activos.decrementAndGet(); }
            }
            public boolean matches(CharSequence raw, String hash) { return encode(raw).equals(hash); }
        };
        var encoder = new ConcurrenciaPasswordEncoder(delegate, 4);
        try (var pool = Executors.newFixedThreadPool(12)) {
            var futures = new ArrayList<Future<?>>();
            for (int i = 0; i < 12; i++) futures.add(pool.submit(() -> encoder.matches("clave", "hash")));
            try {
                assertTrue(dentro.await(10, TimeUnit.SECONDS)); assertEquals(4, maximo.get());
                salida.countDown();
                for (var f : futures) assertEquals(true, f.get(10, TimeUnit.SECONDS));
                assertTrue(maximo.get() <= 4); assertEquals(0, activos.get());
            } finally { salida.countDown(); pool.shutdownNow(); }
        }
    }
    @Test void liberaElPermisoInclusoSiElAlgoritmoFalla() {
        var llamadas = new AtomicInteger();
        var encoder = new ConcurrenciaPasswordEncoder(new PasswordEncoder() {
            public String encode(CharSequence raw) {
                if (llamadas.incrementAndGet() == 1) throw new IllegalArgumentException("fallo sintetico");
                return "hash";
            }
            public boolean matches(CharSequence raw, String hash) { return false; }
        }, 1);
        assertThrows(IllegalArgumentException.class, () -> encoder.encode("clave"));
        assertTimeoutPreemptively(Duration.ofSeconds(2), () -> assertEquals("hash", encoder.encode("clave")));
    }
}
