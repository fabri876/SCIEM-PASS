package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import java.util.concurrent.Semaphore;
import java.util.function.Supplier;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Limita el trabajo criptografico dentro de esta instancia del backend. */
final class ConcurrenciaPasswordEncoder implements PasswordEncoder {
    private final PasswordEncoder delegate;
    private final Semaphore permisos;

    ConcurrenciaPasswordEncoder(PasswordEncoder delegate, int maximo) {
        this.delegate = delegate;
        this.permisos = new Semaphore(maximo, true);
    }

    @Override public String encode(CharSequence rawPassword) {
        return ejecutar(() -> delegate.encode(rawPassword));
    }
    @Override public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return ejecutar(() -> delegate.matches(rawPassword, encodedPassword));
    }
    @Override public boolean upgradeEncoding(String encodedPassword) {
        return delegate.upgradeEncoding(encodedPassword);
    }
    private <T> T ejecutar(Supplier<T> accion) {
        try { permisos.acquire(); }
        catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Se interrumpio la espera de verificacion de contrasena.", e);
        }
        try { return accion.get(); }
        finally { permisos.release(); }
    }
}
