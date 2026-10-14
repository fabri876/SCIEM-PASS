package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AforoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IngresoExcepcionalDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Ingreso excepcional (pruebas de integración)")
class IngresoExcepcionalIntegracionTest extends IntegracionHu06Base {

    private static final String OBSERVACION = "Prueba de integración QA: estudiante con respaldo verificado.";

    @Autowired IngresoExcepcionalService ingresoExcepcionalService;

    private IngresoExcepcionalDto autorizar(Ambiente aula, EstudiantePrueba estudiante) {
        return ingresoExcepcionalService.autorizar(aula.getIdAmbiente(), estudiante.codSis(),
                "LLEGADA_TARDIA", OBSERVACION, null, IP_QA);
    }

    @Test
    @DisplayName("TC-057 (C14) · Confirmar ingreso registra el excepcional con hora oficial y autor")
    void confirmarIngreso_registraExcepcionalConHoraOficialYAutor() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        LocalDateTime antes = HoraOficial.ahora().minusSeconds(2);

        IngresoExcepcionalDto respuesta = autorizar(aula, estudiante);

        LocalDateTime despues = HoraOficial.ahora().plusSeconds(2);
        Ingreso guardado = ingresoRepository.findById(respuesta.idIngreso()).orElseThrow();
        evidencia("TC-057", "Ingreso #" + guardado.getIdIngreso() + " · SIS " + guardado.getCodsisEstudiante()
                + " · tipo " + guardado.getTipoIngreso() + " · " + guardado.getFechaIngreso() + " "
                + guardado.getHoraIngreso() + " · autorizó " + respuesta.autorizadoPor());

        assertAll(
                () -> assertEquals(TipoIngreso.EXCEPCIONAL, guardado.getTipoIngreso(),
                        "El ingreso debe quedar registrado como EXCEPCIONAL"),
                () -> assertEquals(estudiante.codSis(), guardado.getCodsisEstudiante(),
                        "El ingreso debe ser del estudiante autorizado"),
                () -> assertEquals(admin.getIdusuario(), guardado.getIdUsuarioRegistra(),
                        "Debe quedar guardado quién autorizó el ingreso"),
                () -> assertEquals(HoraOficial.hoy(), guardado.getFechaIngreso(),
                        "La fecha debe ser la fecha oficial del sistema"),
                () -> assertFalse(guardado.getHoraIngreso().isBefore(antes) || guardado.getHoraIngreso().isAfter(despues),
                        "La hora debe ser la hora oficial del momento de confirmar. Se guardó: " + guardado.getHoraIngreso()),
                () -> assertEquals(nombre(admin), respuesta.autorizadoPor(),
                        "Debe mostrarse el nombre de quien autorizó")
        );
    }

    @Test
    @DisplayName("TC-058 (C15) · Un ingreso excepcional suma 1 al aforo y resta 1 a los cupos")
    void ingresoExcepcional_actualizaAforoDelAula() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        AforoDto antes = ambienteExamenService.aforo(aula.getIdAmbiente());

        IngresoExcepcionalDto respuesta = autorizar(aula, estudiante);

        AforoDto despues = ambienteExamenService.aforo(aula.getIdAmbiente());
        evidencia("TC-058", "Aforo antes: " + texto(antes) + " → después: " + texto(despues));

        assertAll(
                () -> assertEquals(antes.ocupados() + 1, despues.ocupados(),
                        "El contador de ingresados debe subir en 1"),
                () -> assertEquals(antes.disponibles() - 1, despues.disponibles(),
                        "Los cupos disponibles deben bajar en 1"),
                () -> assertEquals(despues.ocupados(), respuesta.aforo().ocupados(),
                        "La ventana debe recibir el aforo ya actualizado")
        );
    }

    @Test
    @DisplayName("TC-059 (C18) · Doble clic en Confirmar ingreso registra el excepcional una sola vez")
    void dobleClicEnConfirmar_registraUnaSolaVez() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        AforoDto antes = ambienteExamenService.aforo(aula.getIdAmbiente());

        IngresoExcepcionalDto primerClic = autorizar(aula, estudiante);
        IngresoExcepcionalDto segundoClic = autorizar(aula, estudiante);

        AforoDto despues = ambienteExamenService.aforo(aula.getIdAmbiente());
        evidencia("TC-059", "1er clic → ingreso #" + primerClic.idIngreso() + " · 2do clic → ingreso #"
                + segundoClic.idIngreso() + " · aforo " + texto(antes) + " → " + texto(despues));

        assertAll(
                () -> assertEquals(primerClic.idIngreso(), segundoClic.idIngreso(),
                        "El segundo clic debe devolver el mismo ingreso, no crear otro"),
                () -> assertEquals(antes.ocupados() + 1, despues.ocupados(),
                        "El aforo debe subir solo 1, aunque se presione dos veces")
        );
    }
}
