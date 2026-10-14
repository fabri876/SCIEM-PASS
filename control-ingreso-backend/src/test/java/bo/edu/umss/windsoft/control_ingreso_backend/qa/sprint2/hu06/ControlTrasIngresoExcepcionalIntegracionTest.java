package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ControlIngresoAyudanteService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AforoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IngresoExcepcionalDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UltimoIngresoDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * La verificación de "Ya registrado" al reingresar se reportó como bug
 * exploratorio de la HU05 (control de ingreso), por eso no está aquí.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Control de ingreso después de un excepcional (pruebas de integración)")
class ControlTrasIngresoExcepcionalIntegracionTest extends IntegracionHu06Base {

    @Autowired IngresoExcepcionalService ingresoExcepcionalService;
    @Autowired ControlIngresoAyudanteService controlIngresoService;

    @Test
    @DisplayName("TC-066 (C45) · El ingreso excepcional aparece en Últimos ingresos y suma al aula")
    void ingresoExcepcional_apareceEnControlYSumaAlAula() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        AforoDto antes = ambienteExamenService.aforo(aula.getIdAmbiente());

        IngresoExcepcionalDto ingreso = ingresoExcepcionalService.autorizar(aula.getIdAmbiente(), estudiante.codSis(),
                "LLEGADA_TARDIA", "Prueba de integración QA: ingreso para el control.", null, IP_QA);

        List<UltimoIngresoDTO> ultimos = controlIngresoService.obtenerUltimosIngresos(aula.getIdAsignatura(),
                aula.getIdExamen(), aula.getIdAmbiente(), 10);
        AforoDto despues = ambienteExamenService.aforo(aula.getIdAmbiente());

        boolean apareceEnUltimos = ultimos.stream().anyMatch(u -> ingreso.idIngreso().equals(u.idIngreso()));
        evidencia("TC-066", "En Últimos ingresos: " + (apareceEnUltimos ? "sí" : "no") + " · aforo "
                + texto(antes) + " → " + texto(despues));

        assertAll(
                () -> assertTrue(apareceEnUltimos, "El estudiante debe aparecer en Últimos ingresos"),
                () -> assertEquals(antes.ocupados() + 1, despues.ocupados(), "Debe sumar al contador del aula")
        );
    }
}