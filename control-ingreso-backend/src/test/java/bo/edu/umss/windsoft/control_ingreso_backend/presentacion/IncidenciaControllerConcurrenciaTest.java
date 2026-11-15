package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EventoIncidenciaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * BUG-001 · Dos expulsiones registradas al mismo instante no pueden perder un registro.
 *
 * El sellado de la auditoría (HU15) actualiza una fila compartida (la cabeza de la cadena),
 * así que dos escrituras simultáneas se serializan y la segunda puede terminar en deadlock o
 * lock timeout. Como la auditoría se escribe dentro de la transacción de negocio, ese fallo
 * se llevaba por delante la expulsión: el cliente recibía 500 y el registro se perdía.
 *
 * Con el reintento en el controlador (cada intento abre su propia transacción) las dos
 * operaciones terminan en 201 y no se pierde ninguna.
 */
@ExtendWith(MockitoExtension.class)
class IncidenciaControllerConcurrenciaTest {

    @Mock private IncidenciaService incidenciaService;
    @Mock private IngresoExcepcionalService ingresoExcepcionalService;
    @Mock private AmbienteExamenService ambienteExamenService;
    @Mock private ContextoUsuarioService contextoUsuarioService;
    @Mock private HttpServletRequest request;

    @InjectMocks private IncidenciaController controller;

    private static final String DESCRIPCION = "Celular encendido debajo de la hoja de respuestas.";

    private IncidenciaDetalleDto detalle(int id) {
        return new IncidenciaDetalleDto(id, "INC-0" + id, LocalDateTime.now(), 7, "Aula 601", "Cálculo I", 3,
                "OTRO", "Otro", "ALTA", "Alta", "ABIERTA", "Abierta", "docente@umss.edu", 202201994,
                "Estudiante Uno", true, DESCRIPCION,                 "CAMBIO_ASIENTO", "Cambio de asiento", null, null, null, null, null, null, null,
                List.<EventoIncidenciaDto>of());
    }

    @Test
    @DisplayName("Un conflicto transitorio no pierde el registro: se reintenta y responde 201")
    void reintentaElConflictoTransitorio() {
        AtomicInteger intentos = new AtomicInteger();
        // any() y no anyString() en los parámetros opcionales (detalles e IP):
        // con una request simulada llegan null y anyString() no acepta null.
        when(incidenciaService.registrar(anyString(), anyInt(), anyString(), anyString(), anyString(),
                any(), anyString(), any(), any(), any(), anyBoolean(), any(), any()))
                .thenAnswer(invocacion -> {
                    if (intentos.incrementAndGet() == 1) {
                        throw new DeadlockLoserDataAccessException("deadlock detectado",
                                new java.sql.SQLException("deadlock detected", "40P01"));
                    }
                    return detalle(90);
                });

        ResponseEntity<IncidenciaDetalleDto> respuesta = controller.registrar(
                UUID.randomUUID().toString(), 7, "OTRO", "ALTA", "CAMBIO_ASIENTO", null, DESCRIPCION, null, null, 202201994, true,
                null, request);

        assertEquals(HttpStatus.CREATED.value(), respuesta.getStatusCode().value());
        assertEquals(2, intentos.get(), "el registro debe reintentarse tras el conflicto");
    }

    @Test
    @DisplayName("Dos expulsiones simultáneas terminan las dos en 201 y ninguna se pierde")
    void dosExpulsionesSimultaneasTerminanLasDos() throws Exception {
        AtomicInteger llamadas = new AtomicInteger();
        // El primer intento choca con el contador compartido de la auditoría (deadlock).
        when(incidenciaService.registrar(anyString(), anyInt(), anyString(), anyString(), anyString(),
                any(), anyString(), any(), any(), any(), anyBoolean(), any(), any()))
                .thenAnswer(invocacion -> {
                    int numero = llamadas.incrementAndGet();
                    if (numero == 1) {
                        throw new DeadlockLoserDataAccessException("deadlock detectado",
                                new java.sql.SQLException("deadlock detected", "40P01"));
                    }
                    return detalle(90 + numero);
                });

        CountDownLatch salida = new CountDownLatch(1);
        ExecutorService ejecutor = Executors.newFixedThreadPool(2);
        try {
            Future<ResponseEntity<IncidenciaDetalleDto>> primero = ejecutor.submit(() -> {
                salida.await();
                return controller.registrar(UUID.randomUUID().toString(), 7, "OTRO", "ALTA", "CAMBIO_ASIENTO", null,
                        DESCRIPCION, null, null, 202201994, true, null, request);
            });
            Future<ResponseEntity<IncidenciaDetalleDto>> segundo = ejecutor.submit(() -> {
                salida.await();
                return controller.registrar(UUID.randomUUID().toString(), 7, "OTRO", "ALTA", "CAMBIO_ASIENTO", null,
                        DESCRIPCION, null, null, 202201994, true, null, request);
            });

            salida.countDown();
            ResponseEntity<IncidenciaDetalleDto> r1 = primero.get(30, TimeUnit.SECONDS);
            ResponseEntity<IncidenciaDetalleDto> r2 = segundo.get(30, TimeUnit.SECONDS);

            assertEquals(HttpStatus.CREATED.value(), r1.getStatusCode().value());
            assertEquals(HttpStatus.CREATED.value(), r2.getStatusCode().value());
            assertNotNull(r1.getBody());
            assertNotNull(r2.getBody());
        } finally {
            ejecutor.shutdownNow();
        }
    }
}
