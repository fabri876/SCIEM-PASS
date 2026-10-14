package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu05;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionAulaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Pruebas de validación de la HU05 (control de ingreso): lo que decide el servidor en cada caso.
 * Todo se deshace al terminar; los intentos bloqueados de prueba se borran.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU05 · Control de ingreso (pruebas de validación)")
class ControlIngresoValidacionTest extends IntegracionHu05Base {

    @Autowired AsignacionAulaService asignacionAulaService;
    @Autowired AyudanteExamenRepository ayudanteExamenRepository;

    // ---------------------------------------------------------------------
    // Ayudas propias de estas pruebas
    // ---------------------------------------------------------------------

    /** Lectura de un QR, igual que la cámara del panel (el frontend envía metodoIngreso = ESCANEO). */
    private MockHttpServletResponse leerQr(Ambiente aula, String textoQr) throws Exception {
        String json = "{\"identificador\":\"" + textoQr + "\",\"idasignatura\":" + aula.getIdAsignatura()
                + ",\"idexamen\":" + aula.getIdExamen() + ",\"idambiente\":" + aula.getIdAmbiente()
                + ",\"metodoIngreso\":\"ESCANEO\"}";
        return enviar(post("/api/v1/control/ingresos").contentType("application/json").content(json), tokenAdmin);
    }

    private int ingresosDelExamen(Ambiente aula) {
        return ingresoRepository.findByIdAsignaturaAndIdExamen(aula.getIdAsignatura(), aula.getIdExamen()).size();
    }

    private Examen examenDe(Ambiente aula) {
        return examenRepository.findAll().stream()
                .filter(x -> Objects.equals(x.getIdAsignatura(), aula.getIdAsignatura())
                        && Objects.equals(x.getIdExamen(), aula.getIdExamen()))
                .findFirst().orElseThrow();
    }

    private boolean mismoExamen(Ambiente a, Ambiente b) {
        return Objects.equals(a.getIdAsignatura(), b.getIdAsignatura()) && Objects.equals(a.getIdExamen(), b.getIdExamen());
    }

    private boolean tieneHabilitacion(Ambiente aula, EstudiantePrueba e) {
        return habilitacionRepository.findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(
                aula.getIdAsignatura(), aula.getIdExamen(), e.codSis()).isPresent()
                || habilitacionRepository.findByIdAsignaturaAndIdExamenAndIdUsuario(
                aula.getIdAsignatura(), aula.getIdExamen(), e.usuario().getIdusuario()).isPresent();
    }

    private String estado(MockHttpServletResponse r) throws Exception {
        return campo(texto(r), "estado");
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-166 (C6) · Un segundo intento devuelve Duplicado con la hora del primer ingreso")
    void segundoIntento_devuelveDuplicadoConHoraDelPrimero() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);

        MockHttpServletResponse primero = ingresar(aula, e);
        MockHttpServletResponse segundo = ingresar(aula, e);
        String horaPrimero = campo(texto(primero), "horaIngreso");
        String horaInformada = campos(texto(segundo), "horaIngreso").stream()
                .filter(h -> !"null".equals(h)).findFirst().orElse(null);
        int ingresos = ingresosDe(aula, e).size();
        int intentos = intentosDe(aula, e, MotivoIntento.DUPLICADO).size();
        evidencia("TC-166", "Primer intento → " + primero.getStatus() + " " + estado(primero) + " a las " + horaPrimero
                + " · Segundo intento → " + segundo.getStatus() + " " + estado(segundo) + " · Primer ingreso informado: "
                + horaInformada + " · Ingresos guardados: " + ingresos + " · Intentos por duplicado guardados: " + intentos);

        assertAll(
                () -> assertEquals(201, primero.getStatus()),
                () -> assertEquals(409, segundo.getStatus()),
                () -> assertEquals("DUPLICADO", estado(segundo)),
                () -> assertNotNull(horaInformada, "Debe informarse la hora del primer ingreso"),
                () -> assertEquals(horaPrimero.substring(0, 19), horaInformada.substring(0, 19),
                        "La hora informada debe ser la del primer ingreso"),
                () -> assertEquals(1, ingresos, "No debe crearse un nuevo registro"),
                () -> assertEquals(1, intentos, "El intento debe quedar guardado como duplicado")
        );
    }

    @Test
    @DisplayName("TC-167 (C10) · Un inhabilitado es rechazado con su motivo y no se registra su ingreso")
    void inhabilitado_rechazadoConMotivo() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteLibre(aula);
        habilitar(aula, e, false);

        MockHttpServletResponse r = ingresar(aula, e);
        int ingresos = ingresosDe(aula, e).size();
        evidencia("TC-167", "Inhabilitado → " + r.getStatus() + " " + estado(r) + " · Motivo: "
                + campo(texto(r), "motivoInhabilitacion") + " · Ingresos guardados: " + ingresos);

        assertAll(
                () -> assertEquals(403, r.getStatus()),
                () -> assertEquals("INHABILITADO", estado(r)),
                () -> assertEquals("Prueba QA: no cumple requisitos.", campo(texto(r), "motivoInhabilitacion")),
                () -> assertEquals(0, ingresos, "No debe registrarse el ingreso")
        );
    }

    @Test
    @DisplayName("TC-169 (C11) · Un estudiante de otro examen recibe No inscrito con su examen y aula")
    void estudianteDeOtroExamen_recibeNoInscrito() throws Exception {
        Ambiente aulaSuya = aulaUnicaDelExamen();
        Ambiente aulaAjena = ambienteRepository.findAll().stream()
                .filter(a -> !mismoExamen(a, aulaSuya))
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay otro examen para la prueba."));

        // Estudiante sin nada en el examen ajeno y habilitado solo en el suyo
        EstudiantePrueba e = null;
        for (int i = 0; i < 30 && e == null; i++) {
            EstudiantePrueba candidato = estudianteLibre(aulaAjena);
            if (!tieneHabilitacion(aulaSuya, candidato) && ingresosDe(aulaSuya, candidato).isEmpty()) e = candidato;
        }
        assertNotNull(e, "No hay un estudiante disponible para la prueba.");
        habilitar(aulaSuya, e, true);

        MockHttpServletResponse r = ingresar(tokenAdmin, aulaAjena, String.valueOf(e.codSis()), null);
        String cuerpo = texto(r);
        int ingresos = ingresosDe(aulaAjena, e).size();
        evidencia("TC-169", "Habilitado en examen #" + aulaSuya.getIdExamen() + " (aula #" + aulaSuya.getIdAmbiente()
                + "), se presenta en examen #" + aulaAjena.getIdExamen() + " → " + r.getStatus() + " " + estado(r)
                + " · Respuesta: " + cuerpo + " · Ingresos guardados en el examen ajeno: " + ingresos);

        assertAll(
                () -> assertEquals("NO_INSCRITO", estado(r), "Debe indicar que no está inscrito en este examen"),
                () -> assertTrue(cuerpo.contains("\"otroExamen\""), "Debe informar el examen y aula donde sí está inscrito"),
                () -> assertEquals(0, ingresos, "No debe registrarse el ingreso")
        );
    }

    @Test
    @DisplayName("TC-170 (C12) · Un estudiante en un aula que no es la suya es rechazado con su aula")
    void aulaDiferente_rechazadoConSuAula() throws Exception {
        Ambiente cualquiera = ambienteRepository.findAll().stream()
                .filter(a -> ambienteRepository.findByIdExamen(a.getIdExamen()).size() >= 2)
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un examen con varias aulas."));
        EstudiantePrueba e = estudianteHabilitado(cualquiera);
        Integer aulaAsignada = asignacionAulaService.aulaAsignada(cualquiera.getIdAsignatura(), cualquiera.getIdExamen(),
                e.codSis()).map(AsignacionAulaService.AulaExamen::idAmbiente).orElse(cualquiera.getIdAmbiente());
        Ambiente equivocada = ambienteRepository.findByIdExamen(cualquiera.getIdExamen()).stream()
                .filter(a -> !a.getIdAmbiente().equals(aulaAsignada)).findFirst().orElseThrow();

        MockHttpServletResponse r = ingresar(tokenAdmin, equivocada, String.valueOf(e.codSis()), null);
        String aulaInformada = campo(texto(r), "nombreAmbiente");
        int ingresos = ingresosDe(equivocada, e).size();
        evidencia("TC-170", "Aula asignada #" + aulaAsignada + ", se presenta en aula #" + equivocada.getIdAmbiente()
                + " → " + r.getStatus() + " " + estado(r) + " · Aula informada: " + aulaInformada
                + " · Mensaje: " + campo(texto(r), "mensaje") + " · Ingresos guardados: " + ingresos);

        assertAll(
                () -> assertEquals(409, r.getStatus()),
                () -> assertEquals("AMBIENTE_DIFERENTE", estado(r)),
                () -> assertNotNull(aulaInformada, "Debe informarse el aula que le corresponde"),
                () -> assertNotEquals("null", aulaInformada, "Debe informarse el aula que le corresponde"),
                () -> assertEquals(0, ingresos, "No debe registrarse el ingreso")
        );
    }

    @Test
    @DisplayName("TC-171 (C13) · Un C.I. que no existe devuelve No encontrado y no registra nada")
    void ciInexistente_noEncontrado() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        int antes = ingresosDelExamen(aula);

        MockHttpServletResponse r = ingresar(tokenAdmin, aula, "99999999", null);
        int despues = ingresosDelExamen(aula);
        evidencia("TC-171", "C.I. 99999999 → " + r.getStatus() + " " + estado(r)
                + " · Ingresos del examen antes: " + antes + ", después: " + despues);

        assertAll(
                () -> assertEquals(404, r.getStatus()),
                () -> assertEquals("NO_ENCONTRADO", estado(r)),
                () -> assertEquals(antes, despues, "No debe registrarse ningún ingreso")
        );
    }

    @Test
    @DisplayName("TC-173 (C17) · Un QR que no es del sistema devuelve QR inválido y no registra nada")
    void qrAjeno_qrInvalido() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        int antes = ingresosDelExamen(aula);

        MockHttpServletResponse ajeno = leerQr(aula, "https://www.google.com/qa");
        MockHttpServletResponse falso = leerQr(aula, "SCIEMPASS:1:FAKE");
        int despues = ingresosDelExamen(aula);
        evidencia("TC-173", "QR \"https://www.google.com/qa\" → " + ajeno.getStatus() + " " + estado(ajeno)
                + " · Respuesta: " + texto(ajeno)
                + " · QR \"SCIEMPASS:1:FAKE\" → " + falso.getStatus() + " " + estado(falso)
                + " · Respuesta: " + texto(falso)
                + " · Ingresos del examen antes: " + antes + ", después: " + despues);

        assertAll(
                () -> assertEquals("QR_INVALIDO", estado(ajeno), "Un QR de otra página debe tomarse como QR inválido"),
                () -> assertEquals("QR_INVALIDO", estado(falso), "Un QR alterado del sistema debe tomarse como QR inválido"),
                () -> assertEquals(antes, despues, "No debe registrarse ningún ingreso")
        );
    }

    @Test
    @DisplayName("TC-175 (C39) · Fuera del día del examen no se permite registrar ingresos")
    void fueraDelDiaDelExamen_noRegistra() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        Examen examen = examenDe(aula);
        Map<String, String> resultados = new LinkedHashMap<>();
        Map<String, Integer> guardados = new LinkedHashMap<>();

        // Se cambia la fecha del examen (se deshace al terminar)
        for (Map.Entry<String, Integer> caso : Map.of("ayer", -1, "mañana", 1).entrySet()) {
            examen.setFechaExamen(HoraOficial.hoy().plusDays(caso.getValue()));
            examenRepository.saveAndFlush(examen);
            EstudiantePrueba e = estudianteHabilitado(aula);
            MockHttpServletResponse r = ingresar(aula, e);
            resultados.put("examen " + caso.getKey(), r.getStatus() + " " + estado(r));
            guardados.put("examen " + caso.getKey(), ingresosDe(aula, e).size());
        }
        evidencia("TC-175", "Hoy: " + HoraOficial.hoy() + " · Resultado al verificar → " + resultados
                + " · Ingresos guardados → " + guardados);

        List<org.junit.jupiter.api.function.Executable> verificaciones = new ArrayList<>();
        resultados.forEach((caso, resultado) -> verificaciones.add(() ->
                assertFalse(resultado.contains("PERMITIDO"), "Con el " + caso + " no debe permitirse el ingreso")));
        guardados.forEach((caso, cantidad) -> verificaciones.add(() ->
                assertEquals(0, cantidad, "Con el " + caso + " no debe guardarse el ingreso")));
        assertAll(verificaciones);
    }

    @Test
    @DisplayName("TC-176 (C46) · Con dos operadores, un estudiante de la otra fila recibe Fuera de fila")
    void dosOperadores_otraFilaRecibeFueraDeFila() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        List<Usuario> operadores = ayudanteRepository.findAll().stream()
                .map(a -> usuarioRepository.findById(a.getIdusuario()).orElse(null))
                .filter(u -> u != null && Boolean.TRUE.equals(u.getEstadousuario()) && u.getCorreousuario() != null)
                .limit(2).toList();
        assertEquals(2, operadores.size(), "Se necesitan dos operadores activos para la prueba.");
        for (Usuario op : operadores) {
            ayudanteExamenRepository.saveAndFlush(new AyudanteExamen(new AyudanteExamenId(op.getIdusuario(),
                    aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente()), "ACTIVO"));
        }

        // Dos estudiantes en los extremos del abecedario (se deshace al terminar)
        Map<String, String> resultados = new LinkedHashMap<>();
        String tokenOperador1 = token(operadores.getFirst(), "OPERADOR");
        for (String apellido : List.of("Aguilar Qa", "Zuñiga Qa")) {
            EstudiantePrueba e = estudianteHabilitado(aula);
            e.usuario().setApellidousuario(apellido);
            usuarioRepository.saveAndFlush(e.usuario());
            MockHttpServletResponse r = ingresar(tokenOperador1, aula, String.valueOf(e.codSis()), null);
            resultados.put(apellido, r.getStatus() + " " + estado(r));
        }
        evidencia("TC-176", "Operadores en el aula #" + aula.getIdAmbiente() + ": " + operadores.stream()
                .map(Usuario::getCorreousuario).toList() + " · El operador 1 verifica → " + resultados);

        assertTrue(resultados.values().stream().anyMatch(v -> v.contains("FUERA_DE_FILA")),
                "Con dos operadores, al menos uno de los extremos del abecedario debe salir Fuera de fila");
    }
}