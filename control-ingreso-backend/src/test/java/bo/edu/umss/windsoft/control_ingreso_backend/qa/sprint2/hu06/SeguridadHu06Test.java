package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IncidenciaRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Pruebas de seguridad de la HU06: se hacen peticiones reales al backend, pasando
 * por el filtro de seguridad con tokens JWT de cada rol (como lo hace el frontend).
 * Todo lo que se guarda se deshace al terminar; solo queda el historial de auditoría.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Seguridad")
class SeguridadHu06Test extends IntegracionHu06Base {

    private static final String DESCRIPCION = "Prueba de seguridad QA: incidencia de prueba en el aula.";

    @Autowired WebApplicationContext contexto;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired AyudanteRepository ayudanteRepository;
    @Autowired DocenteRepository docenteRepository;
    @Autowired DocenteAsignaturaRepository docenteAsignaturaRepository;
    @Autowired AyudanteExamenRepository ayudanteExamenRepository;
    @Autowired IncidenciaRepository incidenciaRepository;
    @Autowired AuditoriaRepository auditoriaRepository;
    @Value("${jwt.secret}") String secretoJwt;

    private MockMvc mvc;

    @BeforeEach
    void prepararPeticiones() {
        Filter filtroSeguridad = contexto.getBean("springSecurityFilterChain", Filter.class);
        mvc = MockMvcBuilders.webAppContextSetup(contexto).addFilters(filtroSeguridad).build();
        // Cada petición se identifica solo con su token, como en el sistema real.
        SecurityContextHolder.clearContext();
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    /** Envía la petición con el token en la cabecera Authorization (null = sin sesión). */
    private MockHttpServletResponse enviar(RequestBuilder peticion, String token) throws Exception {
        RequestBuilder conToken = servletContext -> {
            MockHttpServletRequest request = peticion.buildRequest(servletContext);
            if (token != null) {
                request.addHeader("Authorization", "Bearer " + token);
            }
            return request;
        };
        return mvc.perform(conToken).andReturn().getResponse();
    }

    private String texto(MockHttpServletResponse respuesta) throws Exception {
        return respuesta.getContentAsString(StandardCharsets.UTF_8);
    }

    private String token(Usuario usuario, String rol) {
        return jwtTokenProvider.generarToken(usuario.getCorreousuario(), rol, usuario.getIdusuario(), nombre(usuario));
    }

    /** Token firmado correctamente pero que venció hace una hora. */
    private String tokenVencido(Usuario usuario, String rol) {
        long ahora = System.currentTimeMillis();
        return Jwts.builder()
                .subject(usuario.getCorreousuario())
                .claim("rol", rol)
                .claim("idUsuario", usuario.getIdusuario())
                .claim("nombre", nombre(usuario))
                .issuedAt(new Date(ahora - 2 * 3_600_000L))
                .expiration(new Date(ahora - 3_600_000L))
                .signWith(Keys.hmacShaKeyFor(secretoJwt.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    private Usuario primerActivo(Stream<Integer> idsUsuario) {
        return idsUsuario
                .map(id -> usuarioRepository.findById(id))
                .flatMap(Optional::stream)
                .filter(u -> Boolean.TRUE.equals(u.getEstadousuario()) && u.getCorreousuario() != null)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un usuario activo con ese rol para la prueba."));
    }

    private Usuario estudiante() {
        return primerActivo(estudianteRepository.findAll().stream().map(e -> e.getIdusuario()));
    }

    private Usuario operador() {
        return primerActivo(ayudanteRepository.findAll().stream().map(a -> a.getIdusuario()));
    }

    private RequestBuilder registrarIncidencia(Ambiente aula) {
        return multipart("/api/incidencias")
                .param("claveSolicitud", UUID.randomUUID().toString())
                .param("idAmbiente", String.valueOf(aula.getIdAmbiente()))
                .param("tipo", "OTRO")
                .param("severidad", "BAJA")
                .param("descripcion", DESCRIPCION);
    }

    private RequestBuilder autorizarExcepcional(Ambiente aula, Integer codSis) {
        return multipart("/api/ingresos-excepcionales")
                .param("idAmbiente", String.valueOf(aula.getIdAmbiente()))
                .param("codSis", String.valueOf(codSis))
                .param("motivo", "LLEGADA_TARDIA")
                .param("observacion", "Prueba de seguridad QA: intento de ingreso excepcional.");
    }

    private Integer numero(String json, String campo) {
        Matcher m = Pattern.compile("\"" + campo + "\"\\s*:\\s*(\\d+)").matcher(json);
        return m.find() ? Integer.valueOf(m.group(1)) : null;
    }

    private boolean contieneId(String json, String campo, Integer id) {
        return Pattern.compile("\"" + campo + "\"\\s*:\\s*" + id + "\\s*[,}]").matcher(json).find();
    }

    private int incidenciasDelAula(Ambiente aula) {
        return incidenciaRepository.findByIdAmbienteInOrderByFechaHoraDesc(List.of(aula.getIdAmbiente())).size();
    }

    private boolean es2xx(int estado) {
        return estado >= 200 && estado < 300;
    }

    /** Pone la fecha del examen del aula en hoy (se deshace al terminar). */
    private void examenHoy(Ambiente aula) {
        Examen examen = examenRepository.findById(aula.getIdExamen()).orElseThrow();
        examen.setFechaExamen(HoraOficial.hoy());
        examenRepository.saveAndFlush(examen);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-254 (C1) · Un estudiante o alguien sin sesión no accede a Incidencias ni Auditoría")
    void estudianteOSinSesion_noAccede() throws Exception {
        String tokenEstudiante = token(estudiante(), "ESTUDIANTE");
        List<String> rutas = List.of("/api/incidencias", "/api/ingresos-excepcionales", "/api/admin/auditoria");

        Map<String, Integer> resultados = new LinkedHashMap<>();
        for (String ruta : rutas) {
            resultados.put("Sin sesión " + ruta, enviar(get(ruta), null).getStatus());
            resultados.put("Estudiante " + ruta, enviar(get(ruta), tokenEstudiante).getStatus());
        }
        evidencia("TC-254", resultados.toString());

        List<Executable> verificaciones = new ArrayList<>();
        resultados.forEach((caso, estado) -> verificaciones.add(() -> assertTrue(
                caso.startsWith("Sin sesión") ? estado == 401 : estado == 403,
                caso + " debe ser rechazado (401 sin sesión, 403 estudiante). Respondió " + estado)));
        assertAll(verificaciones);
    }

    @Test
    @DisplayName("TC-255 (C2) · El operador no autoriza excepcionales pero sí registra incidencias")
    void operador_noAutorizaPeroRegistraIncidencias() throws Exception {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        Usuario operador = operador();
        // El operador tiene asignada esta aula (se deshace al terminar).
        ayudanteExamenRepository.saveAndFlush(new AyudanteExamen(new AyudanteExamenId(operador.getIdusuario(),
                aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente()), "ACTIVO"));
        String tokenOperador = token(operador, "OPERADOR");

        MockHttpServletResponse consulta = enviar(get("/api/incidencias/estudiante")
                .param("idAmbiente", String.valueOf(aula.getIdAmbiente()))
                .param("q", String.valueOf(estudiante.codSis())), tokenOperador);
        MockHttpServletResponse autorizar = enviar(autorizarExcepcional(aula, estudiante.codSis()), tokenOperador);
        MockHttpServletResponse incidencia = enviar(registrarIncidencia(aula), tokenOperador);
        String jsonConsulta = texto(consulta);

        evidencia("TC-255", "Consulta del estudiante → " + consulta.getStatus()
                + " (puedeAutorizarExcepcional=" + jsonConsulta.contains("\"puedeAutorizarExcepcional\":true") + ")"
                + " · Autorizar excepcional → " + autorizar.getStatus()
                + " · Registrar incidencia → " + incidencia.getStatus() + " " + numero(texto(incidencia), "idIncidencia"));

        assertAll(
                () -> assertTrue(jsonConsulta.contains("\"puedeAutorizarExcepcional\":false"),
                        "Al operador no se le debe ofrecer Autorizar ingreso excepcional"),
                () -> assertTrue(jsonConsulta.contains("\"puedeRegistrarIncidencia\":true"),
                        "Al operador sí se le debe ofrecer Registrar incidencia"),
                () -> assertEquals(403, autorizar.getStatus(), "El operador no debe poder autorizar un excepcional"),
                () -> assertEquals(201, incidencia.getStatus(), "El operador sí debe poder registrar una incidencia")
        );
    }

    @Test
    @DisplayName("TC-256 (C3) · Un docente de otra materia recibe No es docente de esta materia")
    void docenteDeOtraMateria_recibeMensaje() throws Exception {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        Examen examen = examenRepository.findById(aula.getIdExamen()).orElseThrow();
        Usuario docente = primerActivo(docenteRepository.findAll().stream()
                .map(d -> d.getIdusuario())
                .filter(id -> !id.equals(examen.getIdUsuario()))
                .filter(id -> docenteAsignaturaRepository.findByIdIdusuario(id).stream()
                        .noneMatch(da -> aula.getIdAsignatura().equals(da.getId().getIdasignatura()))));
        String tokenDocente = token(docente, "DOCENTE");

        // Una incidencia del aula, registrada por el administrador, para intentar gestionarla.
        String jsonIncidencia = texto(enviar(registrarIncidencia(aula), token(admin, "ADMINISTRADOR")));
        Integer idIncidencia = numero(jsonIncidencia, "idIncidencia");

        MockHttpServletResponse autorizar = enviar(autorizarExcepcional(aula, estudiante.codSis()), tokenDocente);
        MockHttpServletResponse revisar = enviar(patch("/api/incidencias/" + idIncidencia + "/revision"), tokenDocente);
        String mensajeAutorizar = texto(autorizar);
        String mensajeRevisar = texto(revisar);

        evidencia("TC-256", "Docente " + docente.getCorreousuario() + " · autorizar → " + autorizar.getStatus() + " "
                + mensajeAutorizar + " · marcar en revisión → " + revisar.getStatus() + " " + mensajeRevisar);

        assertAll(
                () -> assertEquals(403, autorizar.getStatus(), "Debe negarse la autorización"),
                () -> assertTrue(mensajeAutorizar.contains("No es docente de esta materia"),
                        "Debe mostrar 'No es docente de esta materia'"),
                () -> assertEquals(403, revisar.getStatus(), "Debe negarse la gestión de la incidencia"),
                () -> assertTrue(mensajeRevisar.contains("No es docente de esta materia"),
                        "Debe mostrar 'No es docente de esta materia'")
        );
    }

    @Test
    @DisplayName("TC-257 (C30) · El docente ve únicamente las incidencias de sus exámenes")
    void docente_veSoloSusIncidencias() throws Exception {
        // Aula de un examen que tiene un docente responsable activo.
        Ambiente aulaPropia = null;
        Usuario docente = null;
        for (Ambiente a : ambienteRepository.findAll()) {
            Examen e = examenRepository.findById(a.getIdExamen()).orElse(null);
            if (e == null || e.getIdUsuario() == null || docenteRepository.findByIdusuario(e.getIdUsuario()).isEmpty()) {
                continue;
            }
            Optional<Usuario> u = usuarioRepository.findById(e.getIdUsuario())
                    .filter(x -> Boolean.TRUE.equals(x.getEstadousuario()));
            if (u.isPresent()) {
                aulaPropia = a;
                docente = u.get();
                break;
            }
        }
        assertNotNull(aulaPropia, "No hay un examen con docente responsable para la prueba.");
        Integer idDocente = docente.getIdusuario();
        Ambiente aulaAjena = ambienteRepository.findAll().stream()
                .filter(a -> examenRepository.findById(a.getIdExamen())
                        .map(e -> !idDocente.equals(e.getIdUsuario())).orElse(false))
                .findFirst().orElseThrow();
        examenHoy(aulaPropia);
        examenHoy(aulaAjena);

        String tokenAdmin = token(admin, "ADMINISTRADOR");
        Integer idPropia = numero(texto(enviar(registrarIncidencia(aulaPropia), tokenAdmin)), "idIncidencia");
        Integer idAjena = numero(texto(enviar(registrarIncidencia(aulaAjena), tokenAdmin)), "idIncidencia");

        MockHttpServletResponse lista = enviar(get("/api/incidencias"), token(docente, "DOCENTE"));
        String json = texto(lista);
        boolean vePropia = contieneId(json, "idIncidencia", idPropia);
        boolean veAjena = contieneId(json, "idIncidencia", idAjena);
        evidencia("TC-257", "Docente " + docente.getCorreousuario() + " · lista → " + lista.getStatus()
                + " · ve la de su examen (#" + idPropia + "): " + vePropia
                + " · ve la de otro examen (#" + idAjena + "): " + veAjena);

        assertAll(
                () -> assertEquals(200, lista.getStatus()),
                () -> assertTrue(vePropia, "El docente debe ver la incidencia de su examen"),
                () -> assertFalse(veAjena, "El docente no debe ver la incidencia de un examen que no es suyo")
        );
    }

    @Test
    @DisplayName("TC-258 (C36) · Un ingreso excepcional o una incidencia no se pueden editar ni borrar")
    void excepcionalEIncidencia_noSeEditanNiBorran() throws Exception {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        String tokenAdmin = token(admin, "ADMINISTRADOR");
        Integer idIncidencia = numero(texto(enviar(registrarIncidencia(aula), tokenAdmin)), "idIncidencia");
        Integer idIngreso = numero(texto(enviar(autorizarExcepcional(aula, estudiante.codSis()), tokenAdmin)), "idIngreso");
        String cambio = "{\"descripcion\":\"Texto cambiado por QA\",\"estado\":\"CERRADA\",\"observacion\":\"Texto cambiado por QA\"}";

        Map<String, Integer> intentos = new LinkedHashMap<>();
        intentos.put("PUT incidencia", enviar(put("/api/incidencias/" + idIncidencia)
                .contentType("application/json").content(cambio), tokenAdmin).getStatus());
        intentos.put("PATCH incidencia", enviar(patch("/api/incidencias/" + idIncidencia)
                .contentType("application/json").content(cambio), tokenAdmin).getStatus());
        intentos.put("DELETE incidencia", enviar(delete("/api/incidencias/" + idIncidencia), tokenAdmin).getStatus());
        intentos.put("PUT excepcional", enviar(put("/api/ingresos-excepcionales/" + idIngreso)
                .contentType("application/json").content(cambio), tokenAdmin).getStatus());
        intentos.put("DELETE excepcional", enviar(delete("/api/ingresos-excepcionales/" + idIngreso), tokenAdmin).getStatus());

        String detalle = texto(enviar(get("/api/incidencias/" + idIncidencia), tokenAdmin));
        boolean ingresoSigue = ingresoRepository.findById(idIngreso).isPresent();
        evidencia("TC-258", "Intentos (código de respuesta): " + intentos + " · incidencia sin cambios: "
                + detalle.contains(DESCRIPCION) + " · ingreso excepcional sigue registrado: " + ingresoSigue);

        List<Executable> verificaciones = new ArrayList<>();
        intentos.forEach((intento, estado) -> verificaciones.add(() ->
                assertFalse(es2xx(estado), intento + " no debe estar permitido. Respondió " + estado)));
        verificaciones.add(() -> assertTrue(detalle.contains(DESCRIPCION) && detalle.contains("\"estado\":\"ABIERTA\""),
                "La incidencia debe seguir igual"));
        verificaciones.add(() -> assertTrue(ingresoSigue, "El ingreso excepcional debe seguir registrado"));
        assertAll(verificaciones);
    }

    @Test
    @DisplayName("TC-259 (C38) · El historial de auditoría no permite editar ni borrar registros")
    void historial_noSeEditaNiBorra() throws Exception {
        String tokenAdmin = token(admin, "ADMINISTRADOR");
        MockHttpServletResponse historial = enviar(get("/api/admin/auditoria"), tokenAdmin);
        Integer idAuditoria = numero(texto(historial), "idAuditoria");
        assertNotNull(idAuditoria, "El historial debe tener al menos un registro");
        String accionAntes = auditoriaRepository.findById(idAuditoria).orElseThrow().getAccion();
        String cambio = "{\"accion\":\"Texto cambiado por QA\",\"detalles\":\"Texto cambiado por QA\"}";

        Map<String, Integer> intentos = new LinkedHashMap<>();
        intentos.put("PUT registro", enviar(put("/api/admin/auditoria/" + idAuditoria)
                .contentType("application/json").content(cambio), tokenAdmin).getStatus());
        intentos.put("PATCH registro", enviar(patch("/api/admin/auditoria/" + idAuditoria)
                .contentType("application/json").content(cambio), tokenAdmin).getStatus());
        intentos.put("DELETE registro", enviar(delete("/api/admin/auditoria/" + idAuditoria), tokenAdmin).getStatus());
        intentos.put("DELETE historial", enviar(delete("/api/admin/auditoria"), tokenAdmin).getStatus());

        String accionDespues = auditoriaRepository.findById(idAuditoria).map(a -> a.getAccion()).orElse(null);
        evidencia("TC-259", "Registro #" + idAuditoria + " · intentos (código de respuesta): " + intentos
                + " · registro sin cambios: " + accionAntes.equals(accionDespues));

        List<Executable> verificaciones = new ArrayList<>();
        intentos.forEach((intento, estado) -> verificaciones.add(() ->
                assertFalse(es2xx(estado), intento + " no debe estar permitido. Respondió " + estado)));
        verificaciones.add(() -> assertEquals(accionAntes, accionDespues, "El registro debe seguir igual"));
        assertAll(verificaciones);
    }

    @Test
    @DisplayName("TC-260 (C40) · Con la sesión expirada no se guarda nada")
    void sesionExpirada_noGuardaNada() throws Exception {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        String tokenExpirado = tokenVencido(admin, "ADMINISTRADOR");
        int incidenciasAntes = incidenciasDelAula(aula);
        long ingresosAntes = ambienteExamenService.aforo(aula.getIdAmbiente()).ocupados();

        MockHttpServletResponse incidencia = enviar(registrarIncidencia(aula), tokenExpirado);
        MockHttpServletResponse excepcional = enviar(autorizarExcepcional(aula, estudiante.codSis()), tokenExpirado);

        int incidenciasDespues = incidenciasDelAula(aula);
        long ingresosDespues = ambienteExamenService.aforo(aula.getIdAmbiente()).ocupados();
        evidencia("TC-260", "Token vencido · registrar incidencia → " + incidencia.getStatus()
                + " · autorizar excepcional → " + excepcional.getStatus()
                + " · incidencias del aula " + incidenciasAntes + " → " + incidenciasDespues
                + " · ingresos del aula " + ingresosAntes + " → " + ingresosDespues);

        assertAll(
                () -> assertEquals(401, incidencia.getStatus(), "Debe responder 401 (sesión expirada)"),
                () -> assertEquals(401, excepcional.getStatus(), "Debe responder 401 (sesión expirada)"),
                () -> assertEquals(incidenciasAntes, incidenciasDespues, "No debe guardarse la incidencia"),
                () -> assertEquals(ingresosAntes, ingresosDespues, "No debe guardarse el ingreso excepcional")
        );
    }

    @Test
    @DisplayName("TC-261 (C43) · El operador no abre por URL Ingresos excepcionales ni Auditoría")
    void operadorPorUrl_noAccede() throws Exception {
        String tokenOperador = token(operador(), "OPERADOR");
        List<String> rutas = List.of("/api/ingresos-excepcionales", "/api/admin/auditoria",
                "/api/incidencias");

        Map<String, Integer> resultados = new LinkedHashMap<>();
        for (String ruta : rutas) {
            resultados.put(ruta, enviar(get(ruta), tokenOperador).getStatus());
        }
        evidencia("TC-261", "Operador · " + resultados);

        List<Executable> verificaciones = new ArrayList<>();
        resultados.forEach((ruta, estado) -> verificaciones.add(() ->
                assertEquals(403, estado, "El operador no debe acceder a " + ruta)));
        assertAll(verificaciones);
    }
}