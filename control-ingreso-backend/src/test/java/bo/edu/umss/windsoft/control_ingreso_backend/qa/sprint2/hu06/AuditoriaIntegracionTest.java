package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.AuditoriaController;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AuditoriaRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El historial de auditoría se guarda aparte (no se deshace al terminar la prueba).
 * Las filas que deja esta prueba tienen la IP "QA-PRUEBA-INTEGRACION".
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Historial de auditoría (pruebas de integración)")
class AuditoriaIntegracionTest extends IntegracionHu06Base {

    @Autowired IngresoExcepcionalService ingresoExcepcionalService;
    @Autowired IncidenciaService incidenciaService;
    @Autowired AuditoriaController auditoriaController;

    @Test
    @DisplayName("TC-065 (C37) · El historial de auditoría muestra cada acción con fecha y quién")
    void historial_muestraCadaAccionConFechaYQuien() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        LocalDateTime inicio = LocalDateTime.now().minusSeconds(5);

        // 1. Ingreso excepcional autorizado
        ingresoExcepcionalService.autorizar(aula.getIdAmbiente(), estudiante.codSis(), "LLEGADA_TARDIA",
                "Prueba de integración QA: acción para el historial.", null, IP_QA);
        // 2. Ingreso excepcional rechazado (el estudiante ya ingresó)
        ingresoExcepcionalService.consultar(aula.getIdAmbiente(), String.valueOf(estudiante.codSis()), false, IP_QA);
        // 3. Incidencia registrada y 4. cambio de estado
        IncidenciaDetalleDto incidencia = incidenciaService.registrar(UUID.randomUUID().toString(),
                aula.getIdAmbiente(), "OTRO", "BAJA", "Prueba de integración QA: acción para el historial.",
                estudiante.codSis(), false, null, IP_QA);
        incidenciaService.marcarEnRevision(incidencia.idIncidencia(), IP_QA);

        List<AuditoriaRespuestaDto> deEstaPrueba = auditoriaController.listar().getBody().stream()
                .filter(a -> IP_QA.equals(a.getIpOrigen()))
                .filter(a -> a.getFechaHora() != null && !a.getFechaHora().isBefore(inicio))
                .toList();

        List<Executable> verificaciones = new ArrayList<>();
        for (String operacion : List.of("INGRESO_EXCEPCIONAL", "INGRESO_EXCEPCIONAL_RECHAZADO",
                "INCIDENCIA_REGISTRADA", "INCIDENCIA_EN_REVISION")) {
            AuditoriaRespuestaDto fila = deEstaPrueba.stream()
                    .filter(a -> operacion.equals(a.getTipoOperacion()))
                    .findFirst().orElse(null);
            if (fila != null) {
                evidencia("TC-065", fila.getFechaHora() + " · " + fila.getTipoOperacion() + " · por "
                        + fila.getUsuarioEjecutor() + " · afectado " + fila.getUsuarioAfectado()
                        + " · " + fila.getDetalles());
            }
            verificaciones.add(() -> assertNotNull(fila, "Falta en el historial la operación " + operacion));
            verificaciones.add(() -> assertEquals(admin.getCorreousuario(), fila == null ? null : fila.getUsuarioEjecutor(),
                    operacion + ": debe indicar quién hizo la acción"));
            verificaciones.add(() -> assertEquals(estudiante.usuario().getCorreousuario(),
                    fila == null ? null : fila.getUsuarioAfectado(), operacion + ": debe indicar el estudiante afectado"));
            verificaciones.add(() -> assertFalse(fila == null || fila.getDetalles() == null || fila.getDetalles().isBlank(),
                    operacion + ": debe tener detalles"));
        }
        assertAll(verificaciones);
    }
}
