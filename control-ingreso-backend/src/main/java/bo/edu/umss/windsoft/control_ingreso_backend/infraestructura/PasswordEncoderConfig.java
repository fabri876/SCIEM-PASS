package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordEncoderConfig {
    @Bean
    public PasswordEncoder passwordEncoder() {
        // OWASP: Argon2id, 19 MiB, dos pasadas, un hilo; salt y hash independientes por usuario.
        var argon2 = new Argon2PasswordEncoder(16, 32, 1, 19456, 2);
        var bcrypt = new BCryptPasswordEncoder();
        var encoder = new DelegatingPasswordEncoder("argon2id",
                Map.of("argon2id", argon2, "bcrypt", bcrypt));
        // Los hashes historicos $2a$/$2b$/$2y$ no incluyen el prefijo {bcrypt}.
        encoder.setDefaultPasswordEncoderForMatches(bcrypt);
        // Hasta ~76 MiB de matrices Argon2 activas, en vez de 19 MiB por cada solicitud concurrente.
        return new ConcurrenciaPasswordEncoder(encoder, 4);
    }
}
