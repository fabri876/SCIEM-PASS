package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu05;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionAulaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Pruebas de seguridad de la HU05 (control de ingreso), contra el servidor real.
 * Todo se deshace al terminar; los intentos bloqueados de prueba se borran.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU05 · Control de ingreso (pruebas de seguridad)")
class SeguridadHu05Test extends IntegracionHu05Base {

    @Autowired AsignacionAulaService asignacionAulaService;
    @Autowired AyudanteExamenRepository ayudanteExamenRepository;
    @Autowired DocenteRepository docenteRepository;
    @Value("${jwt.secret}") String secretoJwt;

    // ---------------------------------------------------------------------
    // Ayudas propias de estas pruebas
    // ---------------------------------------------------------------------

    /** Asigna al operador el aula (queda ACTIVO; se deshace al terminar). */
    private void asignar(Usuario operador, Ambiente aula) {
        ayudanteExamenRepository.saveAndFlush(new AyudanteExamen(new AyudanteExamenId(operador.getIdusuario(),
                aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente()), "ACTIVO"));
    }

    private boolean asignado(Usuario operador, Ambiente aula) {
        return ayudanteExamenRepository.findById(new AyudanteExamenId(operador.getIdusuario(),
                aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente())).isPresent();
    }

    /** Un aula de otro examen que el operador NO tiene asignada. */
    private Ambiente aulaDeOtroExamen(Usuario operador, Ambiente suya) {
        return ambienteRepository.findAll().stream()
                .filter(a -> !(Objects.equals(a.getIdAsignatura(), suya.getIdAsignatura())
                        && Objects.equals(a.getIdExamen(), suya.getIdExamen())))
                .filter(a -> !asignado(operador, a))
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay otro examen para la prueba."));
    }

    /** El aula que el sistema le asignó al estudiante en ese examen (a esa aula debe ir). */
    private Ambiente aulaDelEstudiante(Ambiente cualquiera, EstudiantePrueba e) {
        Integer id = asignacionAulaService.aulaAsignada(cualquiera.getIdAsignatura(), cualquiera.getIdExamen(), e.codSis())
                .map(AsignacionAulaService.AulaExamen::idAmbiente).orElse(cualquiera.getIdAmbiente());
        return ambienteRepository.findByIdExamen(cualquiera.getIdExamen()).stream()
                .filter(a -> a.getIdAmbiente().equals(id) && Objects.equals(a.getIdAsignatura(), cualquiera.getIdAsignatura()))
                .findFirst().orElse(cualquiera);
    }

    /** Token firmado correctamente, pero que venció hace una hora. */
    private String tokenVencido(Usuario u, String rol) {
        long ahora = System.currentTimeMillis();
        return Jwts.builder()
                .subject(u.getCorreousuario())
                .claim("rol", rol)
                .claim("idUsuario", u.getIdusuario())
                .claim("nombre", nombre(u))
                .issuedAt(new Date(ahora - 2 * 3600_000L))
                .expiration(new Date(ahora - 3600_000L))
                .signWith(Keys.hmacShaKeyFor(secretoJwt.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    private Usuario docenteActivo() {
        return docenteRepository.findAll().stream()
                .map(d -> usuarioRepository.findById(d.getIdusuario()).orElse(null))
                .filter(u -> u != null && Boolean.TRUE.equals(u.getEstadousuario()) && u.getCorreousuario() != null)
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un docente activo para la prueba."));
    }

    private String estado(MockHttpServletResponse r) throws Exception {
        return campo(texto(r), "estado");
    }

    private String resumen(Ingreso i) {
        return i == null ? "(no existe)" : "aula #" + i.getIdAmbiente() + ", " + i.getFechaIngreso() + " " + i.getHoraIngreso()
                + ", registró #" + i.getIdUsuarioRegistra() + ", retirado: " + (i.getIdExpulsion() != null);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-250 (C32) · Sin sesión o como estudiante el servidor no deja registrar ingresos")
    void sinSesionOEstudiante_noRegistra() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);

        MockHttpServletResponse sinSesion = ingresar(null, aula, String.valueOf(e.codSis()), null);
        MockHttpServletResponse comoEstudiante = ingresar(token(e.usuario(), "ESTUDIANTE"), aula, String.valueOf(e.codSis()), null);
        int ingresos = ingresosDe(aula, e).size();
        evidencia("TC-250", "Registrar ingreso sin sesión → " + sinSesion.getStatus() + " · Como estudiante (registrándose a sí mismo) → "
                + comoEstudiante.getStatus() + " · Ingresos guardados: " + ingresos);

        assertAll(
                () -> assertEquals(401, sinSesion.getStatus(), "Sin sesión debe pedir iniciar sesión"),
                () -> assertEquals(403, comoEstudiante.getStatus(), "Un estudiante no debe poder registrar ingresos"),
                () -> assertEquals(0, ingresos, "No debe guardarse ningún ingreso")
        );
    }

    @Test
    @DisplayName("TC-251 (C33) · El operador no registra ingresos en un aula que no tiene asignada")
    void operador_noRegistraEnAulaNoAsignada() throws Exception {
        Usuario operador = operadorActivo();
        Ambiente suya = aulaUnicaDelExamen();
        asignar(operador, suya);
        String tokenOperador = token(operador, "OPERADOR");

        // Control: en su aula sí puede registrar
        EstudiantePrueba enSuAula = estudianteHabilitado(suya);
        MockHttpServletResponse rSuya = ingresar(tokenOperador, suya, String.valueOf(enSuAula.codSis()), null);
        // Aula de otro examen que no tiene asignada (la que le corresponde al estudiante, para no confundir con "otra aula")
        Ambiente otroExamen = aulaDeOtroExamen(operador, suya);
        EstudiantePrueba enAulaAjena = estudianteHabilitado(otroExamen);
        Ambiente ajena = aulaDelEstudiante(otroExamen, enAulaAjena);
        assertFalse(asignado(operador, ajena), "El aula elegida no debe estar asignada al operador");
        MockHttpServletResponse rAjena = ingresar(tokenOperador, ajena, String.valueOf(enAulaAjena.codSis()), null);
        int guardadosAjena = ingresosDe(ajena, enAulaAjena).size();
        evidencia("TC-251", "Operador " + operador.getCorreousuario() + " asignado al aula #" + suya.getIdAmbiente()
                + " (examen #" + suya.getIdExamen() + ") → registra ahí: " + rSuya.getStatus() + " " + estado(rSuya)
                + " · Aula #" + ajena.getIdAmbiente() + " (examen #" + ajena.getIdExamen() + "), no asignada → "
                + rAjena.getStatus() + " " + estado(rAjena) + " · Ingresos guardados en el aula no asignada: " + guardadosAjena);

        assertAll(
                () -> assertEquals(201, rSuya.getStatus(), "En su aula asignada sí debe poder registrar"),
                () -> assertEquals(403, rAjena.getStatus(), "En un aula no asignada debe rechazarse"),
                () -> assertEquals(0, guardadosAjena, "No debe guardarse el ingreso en un aula no asignada")
        );
    }

    @Test
    @DisplayName("TC-252 (C34) · Con la sesión vencida el servidor responde 401 y no registra el ingreso")
    void sesionVencida_noRegistra() throws Exception {
        Usuario operador = operadorActivo();
        Ambiente aula = aulaUnicaDelExamen();
        asignar(operador, aula);
        EstudiantePrueba e = estudianteHabilitado(aula);

        MockHttpServletResponse vencida = ingresar(tokenVencido(operador, "OPERADOR"), aula, String.valueOf(e.codSis()), null);
        int guardadosConVencida = ingresosDe(aula, e).size();
        // Control: el mismo pedido con una sesión vigente sí se acepta
        MockHttpServletResponse vigente = ingresar(token(operador, "OPERADOR"), aula, String.valueOf(e.codSis()), null);
        evidencia("TC-252", "Sesión vencida → " + vencida.getStatus() + " · Ingresos guardados: " + guardadosConVencida
                + " · El mismo pedido con sesión vigente → " + vigente.getStatus() + " " + estado(vigente));

        assertAll(
                () -> assertEquals(401, vencida.getStatus(), "Con la sesión vencida debe responder 401"),
                () -> assertEquals(0, guardadosConVencida, "Con la sesión vencida no debe guardarse el ingreso"),
                () -> assertEquals(201, vigente.getStatus(), "Con sesión vigente el mismo pedido sí se acepta")
        );
    }

    @Test
    @DisplayName("TC-253 (C35) · Un ingreso registrado no se puede modificar ni eliminar")
    void ingresoRegistrado_noSeModificaNiElimina() throws Exception {
        Usuario operador = operadorActivo();
        Ambiente aula = aulaUnicaDelExamen();
        asignar(operador, aula);
        EstudiantePrueba e = estudianteHabilitado(aula);
        ingresar(aula, e);
        Ingreso original = ingresosDe(aula, e).getFirst();
        String antes = resumen(original);
        Integer id = original.getIdIngreso();

        String cambio = "{\"idambiente\":999,\"horaIngreso\":\"2020-01-01T03:00:00\",\"identificador\":\"" + e.codSis() + "\"}";
        Map<String, String> tokens = new LinkedHashMap<>();
        tokens.put("operador", token(operador, "OPERADOR"));
        tokens.put("docente", token(docenteActivo(), "DOCENTE"));
        tokens.put("administrador", tokenAdmin);

        Map<String, Integer> respuestas = new LinkedHashMap<>();
        for (Map.Entry<String, String> t : tokens.entrySet()) {
            Map<String, MockHttpServletRequestBuilder> intentos = new LinkedHashMap<>();
            intentos.put("PUT /ingresos/" + id, put("/api/v1/control/ingresos/" + id).contentType("application/json").content(cambio));
            intentos.put("PATCH /ingresos/" + id, patch("/api/v1/control/ingresos/" + id).contentType("application/json").content(cambio));
            intentos.put("DELETE /ingresos/" + id, delete("/api/v1/control/ingresos/" + id));
            intentos.put("PUT /ingresos", put("/api/v1/control/ingresos").contentType("application/json").content(cambio));
            intentos.put("DELETE /ingresos", delete("/api/v1/control/ingresos"));
            for (Map.Entry<String, MockHttpServletRequestBuilder> intento : intentos.entrySet()) {
                respuestas.put(t.getKey() + " " + intento.getKey(), enviar(intento.getValue(), t.getValue()).getStatus());
            }
        }
        Ingreso despues = ingresoRepository.findById(id).orElse(null);
        String strDespues = resumen(despues);
        evidencia("TC-253", "Ingreso #" + id + " antes: " + antes + " · Intentos de modificar o eliminar → " + respuestas
                + " · Ingreso después: " + strDespues);

        List<org.junit.jupiter.api.function.Executable> verificaciones = new ArrayList<>();
        respuestas.forEach((intento, status) -> verificaciones.add(() ->
                assertTrue(status < 200 || status >= 300, intento + " no debe aceptarse (respondió " + status + ")")));
        verificaciones.add(() -> assertNotNull(despues, "El ingreso no debe eliminarse"));
        verificaciones.add(() -> assertEquals(antes, strDespues, "El ingreso no debe modificarse"));
        assertAll(verificaciones);
    }
}