package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ClaveSolicitudDuplicadaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.QueryTimeoutException;

import java.sql.SQLException;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * BUG-001 · Reintento ante fallos transitorios de concurrencia.
 *
 * El sellado de la auditoría (HU15) serializa las escrituras sobre una fila compartida.
 * Cuando dos registros caen al mismo tiempo, el segundo puede terminar en deadlock o lock
 * timeout. La operación debe reintentarse en una transacción nueva en vez de perder el
 * registro con un 500.
 */
class ReintentoConcurrenciaTest {

    @Test
    @DisplayName("Un deadlock en el primer intento se reintenta y la operación termina bien")
    void reintentaAnteDeadlock() {
        AtomicInteger intentos = new AtomicInteger();

        String resultado = ReintentoConcurrencia.ejecutar("prueba", () -> {
            if (intentos.incrementAndGet() == 1) {
                throw new DeadlockLoserDataAccessException("deadlock detectado",
                        new java.sql.SQLException("deadlock detected", "40P01"));
            }
            return "ok";
        });

        assertEquals("ok", resultado);
        assertEquals(2, intentos.get());
    }

    @Test
    @DisplayName("Un error de negocio no se reintenta: se propaga tal cual")
    void noReintentaErroresDeNegocio() {
        AtomicInteger intentos = new AtomicInteger();

        ConflictoEstadoException error = assertThrows(ConflictoEstadoException.class,
                () -> ReintentoConcurrencia.ejecutar("prueba", () -> {
                    intentos.incrementAndGet();
                    throw new ConflictoEstadoException("El estudiante ya fue retirado de este examen.");
                }));

        assertEquals("El estudiante ya fue retirado de este examen.", error.getMessage());
        assertEquals(1, intentos.get(), "un error de negocio no debe reintentarse");
    }

    @Test
    @DisplayName("Agotados los intentos, se propaga el último error")
    void agotaIntentos() {
        AtomicInteger intentos = new AtomicInteger();

        assertThrows(DeadlockLoserDataAccessException.class, () -> ReintentoConcurrencia.ejecutar("prueba", () -> {
            intentos.incrementAndGet();
            throw new DeadlockLoserDataAccessException("deadlock detectado",
                    new java.sql.SQLException("deadlock detected", "40P01"));
        }));

        assertEquals(ReintentoConcurrencia.MAX_INTENTOS, intentos.get());
    }

    @Test
    @DisplayName("Un lock timeout y un error de query también son transitorios")
    void reconoceOtrosFallosTransitorios() {
        assertTrue(ReintentoConcurrencia.esTransitorio(new CannotAcquireLockException("no se pudo obtener el lock")));
        assertTrue(ReintentoConcurrencia.esTransitorio(new QueryTimeoutException("se acabó el tiempo")));
    }

    @Test
    @DisplayName("Un SQLSTATE de PostgreSQL transitorio se reconoce aunque no venga traduitido")
    void reconoceSqlStateTransitorio() {
        assertTrue(ReintentoConcurrencia.esTransitorio(new SQLException("deadlock", "40P01")));
        assertTrue(ReintentoConcurrencia.esTransitorio(new SQLException("serialization", "40001")));
        assertFalse(ReintentoConcurrencia.esTransitorio(new SQLException("otro", "23505")));
    }

    @Test
    @DisplayName("La misma clave de solicitud repetida se reintenta: el registro ya está guardado")
    void reintentaClaveDuplicada() {
        AtomicInteger intentos = new AtomicInteger();

        String resultado = ReintentoConcurrencia.ejecutar("prueba", () -> {
            if (intentos.incrementAndGet() == 1) {
                throw new ClaveSolicitudDuplicadaException("Esta incidencia ya fue registrada.");
            }
            return "INC-090";
        });

        assertEquals("INC-090", resultado);
        assertEquals(2, intentos.get());
    }
}
