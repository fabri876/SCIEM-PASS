package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.PasswordEncoderConfig;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Stress optativo de AuthService y hashing real; repositorios/JWT simulados, sin HTTP ni BD. */
@EnabledIfSystemProperty(named="password.concurrency", matches="true")
class PasswordConcurrencyTest {
    @Test @Timeout(180) void doscientasCuentasMigranYVuelvenAEntrarConLaMismaClave() throws Exception {
        var encoder = new PasswordEncoderConfig().passwordEncoder();
        var usuarios = mock(UsuarioRepository.class);
        var cuentas = new ConcurrentHashMap<String, Usuario>();
        String bcryptFixture = new BCryptPasswordEncoder().encode("1234567");
        for (int i = 0; i < 200; i++) {
            var u = new Usuario("1234567", "Prueba", "Temporal", null,
                    "qa" + i + "@example.test", bcryptFixture, true);
            u.setIdusuario(i + 1); cuentas.put(u.getCorreousuario(), u);
        }
        when(usuarios.findByCorreousuario(anyString())).thenAnswer(i -> Optional.ofNullable(cuentas.get(i.getArgument(0))));
        var guardados = new AtomicInteger();
        when(usuarios.save(any())).thenAnswer(i -> { guardados.incrementAndGet(); return i.getArgument(0); });
        var auth = new AuthService(usuarios, mock(DocenteRepository.class), mock(AyudanteRepository.class),
                encoder, mock(JwtTokenProvider.class), mock(AuditoriaService.class),
                mock(UsuarioRespuestaMapper.class), mock(TipoUsuarioResolver.class), mock(UsuarioBloqueoService.class));
        List<String> correos = new ArrayList<>(cuentas.keySet());
        double primera = ronda(auth, correos);
        Set<String> hashes = new HashSet<>();
        Map<String, String> originales = new HashMap<>();
        cuentas.forEach((correo, u) -> {
            assertTrue(u.getContraseniausuario().startsWith("{argon2id}"));
            hashes.add(u.getContraseniausuario()); originales.put(correo, u.getContraseniausuario());
        });
        assertEquals(200, hashes.size()); assertEquals(200, guardados.get());
        double segunda = ronda(auth, correos);
        cuentas.forEach((correo, u) -> assertEquals(originales.get(correo), u.getContraseniausuario()));
        assertEquals(400, guardados.get());
        System.out.printf(Locale.ROOT, "PASSWORD_CONCURRENCY users=200, hash_limit=4, migration_round_ms=%.3f, argon_round_ms=%.3f, unique_hashes=200, DB=mock, HTTP=false%n", primera, segunda);
    }

    private double ronda(AuthService auth, List<String> correos) throws Exception {
        var preparados = new CountDownLatch(200); var salida = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(200)) {
            List<Future<?>> trabajos = new ArrayList<>();
            for (String correo : correos) trabajos.add(pool.submit(() -> {
                preparados.countDown();
                try { salida.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                auth.login(correo, "1234567", "127.0.0.1");
            }));
            try {
                assertTrue(preparados.await(20, TimeUnit.SECONDS));
                long inicio = System.nanoTime(); salida.countDown();
                for (var trabajo : trabajos) trabajo.get(120, TimeUnit.SECONDS);
                return (System.nanoTime() - inicio) / 1_000_000.0;
            } finally { salida.countDown(); pool.shutdownNow(); }
        }
    }
}
