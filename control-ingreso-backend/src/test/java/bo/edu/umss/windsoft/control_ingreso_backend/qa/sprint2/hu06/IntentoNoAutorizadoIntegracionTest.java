package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ControlIngresoAyudanteService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoNoAutorizadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ResultadoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El intento no autorizado se guarda aparte (no se deshace solo), así que al
 * terminar la prueba se borra el intento que ella misma creó.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Intento no autorizado en el punto de control (pruebas de integración)")
class IntentoNoAutorizadoIntegracionTest extends IntegracionHu06Base {

    @Autowired ControlIngresoAyudanteService controlIngresoService;
    @Autowired IntentoNoAutorizadoRepository intentoRepository;
    @Autowired PlatformTransactionManager transactionManager;

    private final List<Integer> intentosCreados = new ArrayList<>();

    @AfterEach
    void borrarIntentosDePrueba() {
        if (intentosCreados.isEmpty()) {
            return;
        }
        TransactionTemplate aparte = new TransactionTemplate(transactionManager);
        aparte.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        aparte.executeWithoutResult(estado -> intentoRepository.deleteAllById(intentosCreados));
    }

    @Test
    @DisplayName("TC-056 (C6) · Un estudiante rechazado queda guardado como intento no autorizado")
    void estudianteRechazado_quedaComoIntentoNoAutorizado() {
        Ambiente aula = ambienteRepository.findAll().getFirst();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        LocalDateTime antes = HoraOficial.ahora().minusSeconds(2);

        ResponseEntity<ResultadoIngresoDTO> respuesta = controlIngresoService.registrarIngreso(
                new VerificarIngresoRequestDTO(String.valueOf(estudiante.codSis()), aula.getIdAsignatura(),
                        aula.getIdExamen(), aula.getIdAmbiente(), MetodoIngreso.MANUAL),
                admin.getIdusuario());

        IntentoNoAutorizado intento = intentoRepository
                .findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(aula.getIdAsignatura(),
                        aula.getIdExamen(), MotivoIntento.INHABILITADO).stream()
                .filter(i -> estudiante.codSis().equals(i.getCodsisEstudiante()))
                .filter(i -> i.getHoraIntento() != null && !i.getHoraIntento().isBefore(antes))
                .findFirst().orElse(null);
        if (intento != null) {
            intentosCreados.add(intento.getIdIntento());
        }
        evidencia("TC-056", "Resultado del control: " + respuesta.getBody().estado() + " · intento guardado: "
                + (intento == null ? "NO" : "#" + intento.getIdIntento() + " · " + intento.getMotivo()
                + " · hora " + intento.getHoraIntento()));

        assertAll(
                () -> assertEquals("INHABILITADO", respuesta.getBody().estado(),
                        "El estudiante no habilitado debe ser rechazado"),
                () -> assertNotNull(intento, "El rechazo debe quedar guardado como intento no autorizado"),
                () -> assertNotNull(intento == null ? null : intento.getHoraIntento(),
                        "El intento debe guardar la hora en que se registró")
        );
    }
}
