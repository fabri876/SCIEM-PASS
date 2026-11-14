package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ClaveSolicitudDuplicadaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.TransientDataAccessException;

import java.sql.SQLException;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/**
 * Reintenta una operación que falló por un conflicto transitorio de concurrencia.
 *
 * <p>BUG-001: el sellado de la auditoría (HU15) actualiza una única fila compartida
 * ({@code cabeza_cadena_auditoria.secuencia}) en cada INSERT de {@code historialauditoria}.
 * Esa fila es un punto de serialización global: dos registros simultáneos (por ejemplo, dos
 * expulsiones en el mismo instante) hacen que el segundo espere el lock del primero. Si la
 * espera termina en deadlock o en lock timeout, PostgreSQL aborta la transacción y Spring
 * lanza una excepción transitorio-concurrente. Como la auditoría se escribe DENTRO de la
 * transacción de negocio ({@code AuditoriaService.registrarEnTransaccion}), ese fallo se
 * llevaba por delante la expulsión: el cliente recibía 500 y el registro se perdía.
 *
 * <p>Este helper reintenta la operación completa (no solo el INSERT de auditoría), porque
 * cuando PostgreSQL aborta la transacción por un deadlock reintentar dentro de ella no sirve:
 * hay que abrir una transacción nueva.
 *
 * <p>Solo se reintentan los fallos transitorios de concurrencia. Los errores de negocio
 * (validación, conflicto de estado, duplicados) se propagan tal cual.
 */
public final class ReintentoConcurrencia {

    private static final Logger logger = LoggerFactory.getLogger(ReintentoConcurrencia.class);

    /** Intentos totales: el original más dos reintentos. */
    public static final int MAX_INTENTOS = 3;

    private static final long ESPERA_BASE_MS = 60;
    private static final long ESPERA_MAX_MS = 500;

    /**
     * SQLSTATE de PostgreSQL que son transitorios y se pueden reintentar.
     * 40001 = serialization_failure · 40P01 = deadlock_detected · 55P03 = lock_not_available.
     */
    private static final Set<String> SQLSTATE_TRANSITORIOS = Set.of("40001", "40P01", "55P03");

    private ReintentoConcurrencia() {
    }

    /**
     * Ejecuta la acción y la reintenta si falla por un conflicto transitorio de concurrencia.
     *
     * @param operacion nombre para el log (por ejemplo "registro-incidencia")
     * @param accion    la operación a ejecutar; debe abrir su propia transacción en cada intento
     * @return el resultado del último intento exitoso
     */
    public static <T> T ejecutar(String operacion, Supplier<T> accion) {
        RuntimeException ultimoError = null;

        for (int intento = 1; intento <= MAX_INTENTOS; intento++) {
            try {
                return accion.get();
            } catch (RuntimeException e) {
                if (!esTransitorio(e)) {
                    throw e;
                }
                ultimoError = e;
                if (intento == MAX_INTENTOS) {
                    break;
                }
                long espera = calcularEspera(intento);
                logger.warn("[{}] Fallo transitorio de concurrencia (intento {}/{}): {}. Reintentando en {} ms.",
                        operacion, intento, MAX_INTENTOS, e.getMessage(), espera);
                dormir(espera);
            }
        }

        logger.error("[{}] Se agotaron los intentos por un fallo de concurrencia: {}",
                operacion, ultimoError == null ? "sin detalle" : ultimoError.getMessage(), ultimoError);
        throw ultimoError;
    }

    /**
     * true si el error es un conflicto transitorio de concurrencia (deadlock, lock timeout,
     * fallo de serialización o caída momentánea de la conexión), o si la misma clave de
     * solicitud llegó dos veces (el registro ya está guardado: el reintento lo encuentra).
     */
    public static boolean esTransitorio(Throwable error) {
        for (Throwable t = error; t != null; t = siguienteCausa(t)) {
            if (t instanceof ClaveSolicitudDuplicadaException) {
                return true;
            }
            if (t instanceof TransientDataAccessException) {
                return true;
            }
            if (t instanceof SQLException sql && sql.getSQLState() != null
                    && SQLSTATE_TRANSITORIOS.contains(sql.getSQLState())) {
                return true;
            }
        }
        return false;
    }

    /** Espera con backoff corto y un poco de dispersión para no sincronizar los reintentos. */
    private static long calcularEspera(int intento) {
        long base = Math.min(ESPERA_BASE_MS * (1L << (intento - 1)), ESPERA_MAX_MS);
        long dispersion = ThreadLocalRandom.current().nextLong(base / 2 + 1);
        return base / 2 + dispersion;
    }

    private static void dormir(long milisegundos) {
        try {
            Thread.sleep(milisegundos);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("La operación se interrumpió mientras esperaba para reintentar.", e);
        }
    }

    /** Evita bucles infinitos si el mismo error se apunta a sí mismo como causa. */
    private static Throwable siguienteCausa(Throwable error) {
        Throwable causa = error.getCause();
        return causa == error ? null : causa;
    }
}
