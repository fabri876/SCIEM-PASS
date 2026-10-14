package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.AuditoriaController;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AuditoriaRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ConsultaEstudianteDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Ingreso excepcional (pruebas de validación)")
class IngresoExcepcionalValidacionTest extends IntegracionHu06Base {

    private static final String OBSERVACION = "Prueba de validación QA: intento de ingreso excepcional.";

    @Autowired IngresoExcepcionalService ingresoExcepcionalService;
    @Autowired AulaRepository aulaRepository;
    @Autowired AuditoriaController auditoriaController;

    private ConflictoEstadoException intentarAutorizar(Ambiente aula, EstudiantePrueba estudiante) {
        return assertThrows(ConflictoEstadoException.class, () -> ingresoExcepcionalService.autorizar(
                aula.getIdAmbiente(), estudiante.codSis(), "LLEGADA_TARDIA", OBSERVACION, null, IP_QA));
    }

    /** Busca en el historial el intento rechazado de ese estudiante desde "inicio". */
    private AuditoriaRespuestaDto rechazoEnHistorial(EstudiantePrueba estudiante, LocalDateTime inicio) {
        return auditoriaController.listar().getBody().stream()
                .filter(a -> IP_QA.equals(a.getIpOrigen()))
                .filter(a -> "INGRESO_EXCEPCIONAL_RECHAZADO".equals(a.getTipoOperacion()))
                .filter(a -> estudiante.usuario().getCorreousuario().equals(a.getUsuarioAfectado()))
                .filter(a -> a.getFechaHora() != null && !a.getFechaHora().isBefore(inicio))
                .findFirst().orElse(null);
    }

    @Test
    @DisplayName("TC-183 (C16) · Se rechaza el excepcional de quien ya ingresó, indicando hora y aula")
    void yaIngreso_seRechazaConHoraYAula() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        String nombreAula = ambienteExamenService.describir(aula).aula();
        LocalDateTime inicio = LocalDateTime.now().minusSeconds(5);

        // El estudiante ya ingresó por el control normal a las 07:41.
        Ingreso previo = new Ingreso();
        previo.setIdUsuarioEstudiante(estudiante.usuario().getIdusuario());
        previo.setCodsisEstudiante(estudiante.codSis());
        previo.setIdAsignatura(aula.getIdAsignatura());
        previo.setIdExamen(aula.getIdExamen());
        previo.setIdAmbiente(aula.getIdAmbiente());
        previo.setIdUsuarioRegistra(admin.getIdusuario());
        previo.setFechaIngreso(HoraOficial.hoy());
        previo.setHoraIngreso(HoraOficial.hoy().atTime(7, 41));
        previo.setTipoIngreso(TipoIngreso.NORMAL);
        previo.setMetodoIngreso(MetodoIngreso.ESCANEO);
        ingresoRepository.saveAndFlush(previo);

        ConflictoEstadoException rechazo = intentarAutorizar(aula, estudiante);
        AuditoriaRespuestaDto historial = rechazoEnHistorial(estudiante, inicio);
        evidencia("TC-183", "Mensaje: \"" + rechazo.getMessage() + "\" · en el historial: "
                + (historial == null ? "no" : historial.getFechaHora() + " " + historial.getTipoOperacion()));

        assertAll(
                () -> assertTrue(rechazo.getMessage().contains("07:41"), "El mensaje debe indicar la hora del primer ingreso"),
                () -> assertTrue(rechazo.getMessage().contains(nombreAula), "El mensaje debe indicar el aula del primer ingreso"),
                () -> assertNotNull(historial, "El intento rechazado debe quedar en el historial")
        );
    }

    @Test
    @DisplayName("TC-184 (C17) · Se rechaza el excepcional con el aula llena")
    void aulaLlena_seRechaza() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        LocalDateTime inicio = LocalDateTime.now().minusSeconds(5);

        // Se deja el aula llena: su capacidad pasa a ser igual a los que ya ingresaron.
        Aula aulaFisica = aulaRepository.findById(aula.getIdAula()).orElseThrow();
        aulaFisica.setCapacidadAula((int) ambienteExamenService.aforo(aula.getIdAmbiente()).ocupados());
        aulaRepository.saveAndFlush(aulaFisica);

        ConsultaEstudianteDto consulta = ingresoExcepcionalService.consultar(aula.getIdAmbiente(),
                String.valueOf(estudiante.codSis()), false, IP_QA);
        ConflictoEstadoException rechazo = intentarAutorizar(aula, estudiante);
        AuditoriaRespuestaDto historial = rechazoEnHistorial(estudiante, inicio);
        evidencia("TC-184", "Aula llena · botón Autorizar visible: " + consulta.puedeAutorizarExcepcional()
                + " · mensaje: \"" + rechazo.getMessage() + "\" · en el historial: " + (historial == null ? "no" : "sí"));

        assertAll(
                () -> assertFalse(consulta.puedeAutorizarExcepcional(), "Con el aula llena no debe ofrecerse Autorizar"),
                () -> assertTrue(rechazo.getMessage().contains("Aula llena"), "El mensaje debe explicar que el aula está llena"),
                () -> assertNotNull(historial, "El intento rechazado debe quedar en el historial")
        );
    }

    @Test
    @DisplayName("TC-184 (C17) · Se rechaza el excepcional con el ingreso cerrado")
    void ingresoCerrado_seRechaza() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        LocalDateTime inicio = LocalDateTime.now().minusSeconds(5);

        // El examen fue ayer: el ingreso ya cerró.
        Examen examen = examenRepository.findById(aula.getIdExamen()).orElseThrow();
        examen.setFechaExamen(HoraOficial.hoy().minusDays(1));
        examenRepository.saveAndFlush(examen);

        ConflictoEstadoException rechazo = intentarAutorizar(aula, estudiante);
        AuditoriaRespuestaDto historial = rechazoEnHistorial(estudiante, inicio);
        evidencia("TC-184", "Ingreso cerrado · mensaje: \"" + rechazo.getMessage() + "\" · en el historial: "
                + (historial == null ? "no" : "sí"));

        assertAll(
                () -> assertTrue(rechazo.getMessage().contains("ya cerró"), "El mensaje debe explicar que el ingreso cerró"),
                () -> assertNotNull(historial, "El intento rechazado debe quedar en el historial")
        );
    }
}