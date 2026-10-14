package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteGrupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.Filter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Pruebas de seguridad de la HU01: se hacen peticiones reales al backend, pasando por el
 * filtro de seguridad con tokens JWT de cada rol (como lo hace el frontend).
 * Todo lo que se guarda se deshace al terminar; solo queda el historial de auditoría.
 */
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@Transactional
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU01 · Seguridad")
class SeguridadHu01Test {

    private static final String[] ENC_ESTUDIANTES = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"};
    private static final String[] ENC_DOCENTES = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO", "ID_ASIGNATURA", "GRUPO"};
    private static final Random AZAR = new Random();

    /** Persona nueva de prueba (C.I., SIS y correo que no existen en la base). */
    private record Persona(String ci, int sis, String correo) {
    }

    @Autowired WebApplicationContext contexto;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired DocenteRepository docenteRepository;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired AyudanteRepository ayudanteRepository;
    @Autowired GrupoRepository grupoRepository;
    @Autowired DocenteGrupoRepository docenteGrupoRepository;
    @Autowired DocenteAsignaturaRepository docenteAsignaturaRepository;
    @Value("${jwt.secret}") String secretoJwt;

    private MockMvc mvc;
    private Usuario admin;

    @BeforeEach
    void preparar() {
        Filter filtroSeguridad = contexto.getBean("springSecurityFilterChain", Filter.class);
        mvc = MockMvcBuilders.webAppContextSetup(contexto).addFilters(filtroSeguridad).build();
        SecurityContextHolder.clearContext(); // cada petición se identifica solo con su token
        admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    /** Envía la petición con el token en la cabecera Authorization (null = sin sesión). */
    private MockHttpServletResponse enviar(RequestBuilder peticion, String token) throws Exception {
        RequestBuilder conToken = servletContext -> {
            MockHttpServletRequest request = peticion.buildRequest(servletContext);
            if (token != null) request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
        return mvc.perform(conToken).andReturn().getResponse();
    }

    private String texto(MockHttpServletResponse respuesta) throws Exception {
        return respuesta.getContentAsString(StandardCharsets.UTF_8);
    }

    private String nombre(Usuario u) {
        return u.getNombreusuario() + " " + u.getApellidousuario();
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

    private boolean activo(Integer idUsuario) {
        return usuarioRepository.findById(idUsuario)
                .map(u -> Boolean.TRUE.equals(u.getEstadousuario()) && u.getCorreousuario() != null)
                .orElse(false);
    }

    private Usuario usuario(Integer idUsuario) {
        return usuarioRepository.findById(idUsuario).orElseThrow();
    }

    private Usuario primerActivo(List<Integer> ids, String rol) {
        return ids.stream().filter(this::activo).findFirst().map(this::usuario)
                .orElseThrow(() -> new IllegalStateException("No hay un " + rol + " activo para la prueba."));
    }

    private boolean grupoActivo(Integer idGrupo) {
        return grupoRepository.findById(idGrupo).map(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).orElse(false);
    }

    private Grupo cualquierGrupoActivo() {
        return grupoRepository.findAll().stream().filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un grupo activo para la prueba."));
    }

    private Persona nueva() {
        String ci;
        int sis;
        String correo;
        do {
            int n = 10000 + AZAR.nextInt(90000);
            ci = "97" + n;                       // 7 dígitos
            sis = 209900000 + AZAR.nextInt(99999); // 9 dígitos
            correo = "qa.seg" + n + "@test.com";
        } while (usuarioRepository.existsByCiusuario(ci) || usuarioRepository.findByCorreousuario(correo).isPresent());
        return new Persona(ci, sis, correo);
    }

    private boolean existe(Persona p) {
        return usuarioRepository.findByCorreousuario(p.correo()).isPresent();
    }

    private MockMultipartFile excel(String[] encabezados, String[]... filas) throws Exception {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet();
            var filaEncabezado = hoja.createRow(0);
            for (int c = 0; c < encabezados.length; c++) filaEncabezado.createCell(c).setCellValue(encabezados[c]);
            for (int f = 0; f < filas.length; f++) {
                var fila = hoja.createRow(f + 1);
                for (int c = 0; c < filas[f].length; c++) fila.createCell(c).setCellValue(filas[f][c]);
            }
            libro.write(salida);
            return new MockMultipartFile("archivo", "lista.xlsx", "application/octet-stream", salida.toByteArray());
        }
    }

    private MockMultipartFile excelEstudiante(Persona p) throws Exception {
        return excel(ENC_ESTUDIANTES, new String[]{String.valueOf(p.sis()), p.correo(), p.ci(), "Prueba Seguridad", "QA Estudiante", "70000001"});
    }

    private MockMultipartFile excelDocente(Persona p, Grupo g) throws Exception {
        return excel(ENC_DOCENTES, new String[]{String.valueOf(p.sis()), p.correo(), p.ci(), "Prueba Seguridad", "QA Docente",
                "70000002", String.valueOf(g.getIdAsignatura()), g.getNombreGrupo()});
    }

    /** Carga masiva (vistaPrevia = solo revisar, sin guardar). */
    private RequestBuilder carga(boolean vistaPrevia, MockMultipartFile archivo, String rol, Integer idGrupo) {
        var peticion = multipart("/api/usuarios/carga-masiva" + (vistaPrevia ? "/vista-previa" : "")).file(archivo);
        if (rol != null) peticion.param("rol", rol);
        if (idGrupo != null) peticion.param("idGrupo", String.valueOf(idGrupo));
        return peticion;
    }

    private RequestBuilder registroIndividual(Persona p, String rol, Integer idGrupo) {
        String sis = "ESTUDIANTE".equals(rol) || "DOCENTE".equals(rol) ? ",\"codigoSis\":" + p.sis() : "";
        String json = "{\"nombre\":\"QA Individual\",\"apellido\":\"Prueba Seguridad\",\"ci\":\"" + p.ci() + "\","
                + "\"correo\":\"" + p.correo() + "\",\"telefono\":70000003,\"rol\":\"" + rol + "\"" + sis
                + ",\"idGrupos\":[" + idGrupo + "]}"; // sin contraseña
        return post("/api/usuarios/registro-individual").contentType("application/json").content(json);
    }

    private MockHttpServletResponse login(String correo, String contrasena) throws Exception {
        return enviar(post("/api/auth/login").contentType("application/json")
                .content("{\"correo\":\"" + correo + "\",\"contrasena\":\"" + contrasena + "\"}"), null);
    }

    private String rolDe(String json) {
        Matcher m = Pattern.compile("\"rol\"\\s*:\\s*\"([A-Z]+)\"").matcher(json);
        return m.find() ? m.group(1) : null;
    }

    private Set<Integer> ids(String json, String campo) {
        Set<Integer> encontrados = new TreeSet<>();
        Matcher m = Pattern.compile("\"" + campo + "\"\\s*:\\s*(\\d+)").matcher(json);
        while (m.find()) encontrados.add(Integer.valueOf(m.group(1)));
        return encontrados;
    }

    private void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-242 (C2) · El docente solo carga estudiantes en sus grupos y no carga docentes")
    void docente_soloCargaEstudiantesPropios() throws Exception {
        DocenteGrupo asignacion = docenteGrupoRepository.findAll().stream()
                .filter(dg -> grupoActivo(dg.getIdGrupo()) && activo(dg.getIdUsuario())
                        && docenteRepository.findByIdusuario(dg.getIdUsuario()).isPresent())
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un docente activo con grupo para la prueba."));
        Usuario docente = usuario(asignacion.getIdUsuario());
        Integer grupoPropio = asignacion.getIdGrupo();
        Integer grupoAjeno = grupoRepository.findAll().stream()
                .filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo()))
                .map(Grupo::getIdGrupo)
                .filter(id -> !docenteGrupoRepository.existsByIdUsuarioAndIdGrupo(docente.getIdusuario(), id))
                .findFirst().orElseThrow();
        String tokenDocente = token(docente, "DOCENTE");
        Persona p = nueva();

        int propio = enviar(carga(true, excelEstudiante(p), "ESTUDIANTE", grupoPropio), tokenDocente).getStatus();
        int comoDocentes = enviar(carga(true, excelEstudiante(p), "DOCENTE", null), tokenDocente).getStatus();
        int ajenoRevisar = enviar(carga(true, excelEstudiante(p), "ESTUDIANTE", grupoAjeno), tokenDocente).getStatus();
        int ajenoGuardar = enviar(carga(false, excelEstudiante(p), "ESTUDIANTE", grupoAjeno), tokenDocente).getStatus();
        boolean seGuardo = existe(p);

        evidencia("TC-242", "Docente " + docente.getCorreousuario() + " · revisar en su grupo #" + grupoPropio + " → " + propio
                + " · cargar como Docentes → " + comoDocentes
                + " · revisar en grupo ajeno #" + grupoAjeno + " → " + ajenoRevisar
                + " · guardar en grupo ajeno → " + ajenoGuardar + " · se guardó la persona: " + seGuardo);

        assertAll(
                () -> assertEquals(200, propio, "El docente sí debe poder cargar estudiantes en su propio grupo"),
                () -> assertEquals(403, comoDocentes, "El docente no debe poder cargar Docentes"),
                () -> assertEquals(403, ajenoRevisar, "El docente no debe poder cargar estudiantes en un grupo que no es suyo"),
                () -> assertEquals(403, ajenoGuardar, "El docente no debe poder guardar estudiantes en un grupo que no es suyo"),
                () -> assertFalse(seGuardo, "No debe guardarse nadie en el grupo ajeno")
        );
    }

    @Test
    @DisplayName("TC-243 (C3) · En el registro individual no se puede crear un Administrador")
    void registroIndividual_noCreaAdministrador() throws Exception {
        Integer grupo = cualquierGrupoActivo().getIdGrupo();
        Usuario docente = primerActivo(docenteGrupoRepository.findAll().stream().map(DocenteGrupo::getIdUsuario).distinct().toList(), "docente");
        Persona porAdmin = nueva();
        Persona porDocente = nueva();

        MockHttpServletResponse admin1 = enviar(registroIndividual(porAdmin, "ADMINISTRADOR", grupo), token(admin, "ADMINISTRADOR"));
        MockHttpServletResponse docente1 = enviar(registroIndividual(porDocente, "ADMINISTRADOR", grupo), token(docente, "DOCENTE"));
        String mensajeAdmin = texto(admin1);

        evidencia("TC-243", "Administrador registra rol ADMINISTRADOR → " + admin1.getStatus() + " " + mensajeAdmin
                + " · Docente registra rol ADMINISTRADOR → " + docente1.getStatus()
                + " · se crearon: " + existe(porAdmin) + " / " + existe(porDocente));

        assertAll(
                () -> assertTrue(admin1.getStatus() >= 400, "El administrador no debe poder crear otro Administrador"),
                () -> assertTrue(docente1.getStatus() >= 400, "El docente no debe poder crear un Administrador"),
                () -> assertFalse(existe(porAdmin), "No debe crearse la cuenta"),
                () -> assertFalse(existe(porDocente), "No debe crearse la cuenta")
        );
    }

    @Test
    @DisplayName("TC-244 (C4) · Sin sesión, como operador o estudiante el servidor rechaza la carga")
    void sinSesionOperadorEstudiante_noAccedenALaCarga() throws Exception {
        Usuario operador = primerActivo(ayudanteRepository.findAll().stream().map(a -> a.getIdusuario()).toList(), "operador");
        Usuario estudiante = primerActivo(estudianteRepository.findAll().stream().map(e -> e.getIdusuario()).toList(), "estudiante");
        Integer grupo = cualquierGrupoActivo().getIdGrupo();
        Persona p = nueva();

        Map<String, Integer> resultados = new LinkedHashMap<>();
        resultados.put("Sin sesión · revisar", enviar(carga(true, excelEstudiante(p), "ESTUDIANTE", grupo), null).getStatus());
        resultados.put("Sin sesión · guardar", enviar(carga(false, excelEstudiante(p), "ESTUDIANTE", grupo), null).getStatus());
        resultados.put("Operador · revisar", enviar(carga(true, excelEstudiante(p), "ESTUDIANTE", grupo), token(operador, "OPERADOR")).getStatus());
        resultados.put("Operador · guardar", enviar(carga(false, excelEstudiante(p), "ESTUDIANTE", grupo), token(operador, "OPERADOR")).getStatus());
        resultados.put("Estudiante · revisar", enviar(carga(true, excelEstudiante(p), "ESTUDIANTE", grupo), token(estudiante, "ESTUDIANTE")).getStatus());
        resultados.put("Estudiante · guardar", enviar(carga(false, excelEstudiante(p), "ESTUDIANTE", grupo), token(estudiante, "ESTUDIANTE")).getStatus());
        boolean seGuardo = existe(p);
        evidencia("TC-244", resultados + " · se guardó la persona: " + seGuardo);

        List<Executable> verificaciones = new ArrayList<>();
        resultados.forEach((caso, estado) -> verificaciones.add(() -> assertEquals(
                caso.startsWith("Sin sesión") ? 401 : 403, estado,
                caso + " debe ser rechazado (401 sin sesión, 403 operador o estudiante)")));
        verificaciones.add(() -> assertFalse(seGuardo, "No debe guardarse nadie"));
        assertAll(verificaciones);
    }

    @Test
    @DisplayName("TC-245 (C5) · Con la sesión vencida al confirmar la carga no se guarda nada")
    void sesionVencida_noGuardaLaCarga() throws Exception {
        Integer grupo = cualquierGrupoActivo().getIdGrupo();
        Persona p = nueva();

        MockHttpServletResponse respuesta = enviar(carga(false, excelEstudiante(p), "ESTUDIANTE", grupo), tokenVencido(admin, "ADMINISTRADOR"));
        boolean seGuardo = existe(p);
        evidencia("TC-245", "Token vencido · confirmar la carga → " + respuesta.getStatus() + " · se guardó la persona: " + seGuardo);

        assertAll(
                () -> assertEquals(401, respuesta.getStatus(), "Debe responder 401 (sesión vencida)"),
                () -> assertFalse(seGuardo, "No debe guardarse nadie")
        );
    }

    @Test
    @DisplayName("TC-246 (C6) · El docente solo obtiene sus propias asignaturas")
    void docente_soloObtieneSusAsignaturas() throws Exception {
        Map<Integer, Set<Integer>> materiasPorDocente = new TreeMap<>();
        for (DocenteAsignatura da : docenteAsignaturaRepository.findAll()) {
            materiasPorDocente.computeIfAbsent(da.getId().getIdusuario(), k -> new TreeSet<>()).add(da.getId().getIdasignatura());
        }
        Integer idDocente = materiasPorDocente.keySet().stream()
                .filter(id -> activo(id) && docenteRepository.findByIdusuario(id).isPresent())
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un docente activo con asignaturas."));
        Set<Integer> suyas = materiasPorDocente.get(idDocente);
        Integer idOtro = materiasPorDocente.entrySet().stream()
                .filter(e -> !e.getKey().equals(idDocente) && !suyas.containsAll(e.getValue()))
                .map(Map.Entry::getKey).findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay otro docente con asignaturas distintas."));
        Set<Integer> delOtro = materiasPorDocente.get(idOtro);
        String tokenDocente = token(usuario(idDocente), "DOCENTE");

        MockHttpServletResponse propias = enviar(get("/api/asignaturas/por-docente").param("idUsuario", String.valueOf(idDocente)), tokenDocente);
        MockHttpServletResponse ajenas = enviar(get("/api/asignaturas/por-docente").param("idUsuario", String.valueOf(idOtro)), tokenDocente);
        Set<Integer> recibidasPropias = ids(texto(propias), "idAsignatura");
        Set<Integer> recibidasAjenas = ids(texto(ajenas), "idAsignatura");
        boolean veMateriaAjena = recibidasAjenas.stream().anyMatch(id -> !suyas.contains(id));

        evidencia("TC-246", "Docente #" + idDocente + " (sus asignaturas " + suyas + ") · pide las suyas → " + propias.getStatus()
                + " " + recibidasPropias + " · pide las del docente #" + idOtro + " " + delOtro + " → "
                + ajenas.getStatus() + " " + recibidasAjenas);

        assertAll(
                () -> assertEquals(200, propias.getStatus()),
                () -> assertEquals(suyas, recibidasPropias, "Debe recibir solo sus propias asignaturas"),
                () -> assertFalse(veMateriaAjena,
                        "No debe poder ver las asignaturas de otro docente cambiando el idUsuario. Respondió " + ajenas.getStatus())
        );
    }

    @Test
    @DisplayName("TC-247 (C44) · Un usuario cargado inicia sesión con su C.I. y entra con su rol")
    void usuarioCargado_iniciaSesionConSuCi() throws Exception {
        Grupo grupo = cualquierGrupoActivo();
        String tokenAdmin = token(admin, "ADMINISTRADOR");
        Persona est = nueva();
        Persona doc = nueva();

        String cargaEst = texto(enviar(carga(false, excelEstudiante(est), "ESTUDIANTE", grupo.getIdGrupo()), tokenAdmin));
        String cargaDoc = texto(enviar(carga(false, excelDocente(doc, grupo), "DOCENTE", null), tokenAdmin));
        MockHttpServletResponse loginEst = login(est.correo(), est.ci());
        MockHttpServletResponse loginDoc = login(doc.correo(), doc.ci());
        String rolEst = rolDe(texto(loginEst));
        String rolDoc = rolDe(texto(loginDoc));

        evidencia("TC-247", "Estudiante cargado " + est.correo() + " (" + ids(cargaEst, "exitosos") + " nuevo) · login con su C.I. → "
                + loginEst.getStatus() + " rol " + rolEst + " · Docente cargado " + doc.correo() + " (" + ids(cargaDoc, "exitosos")
                + " nuevo) · login con su C.I. → " + loginDoc.getStatus() + " rol " + rolDoc);

        assertAll(
                () -> assertTrue(existe(est), "El estudiante debe haberse cargado"),
                () -> assertTrue(existe(doc), "El docente debe haberse cargado"),
                () -> assertEquals(200, loginEst.getStatus(), "El estudiante debe iniciar sesión con su C.I."),
                () -> assertEquals("ESTUDIANTE", rolEst, "Debe entrar con el rol Estudiante"),
                () -> assertEquals(200, loginDoc.getStatus(), "El docente debe iniciar sesión con su C.I."),
                () -> assertEquals("DOCENTE", rolDoc, "Debe entrar con el rol Docente")
        );
    }

    @Test
    @DisplayName("TC-248 (C48) · Sin escribir contraseña se asigna el C.I. al estudiante o docente")
    void registroIndividualSinContrasena_asignaElCi() throws Exception {
        Integer grupo = cualquierGrupoActivo().getIdGrupo();
        String tokenAdmin = token(admin, "ADMINISTRADOR");
        Persona est = nueva();
        Persona doc = nueva();

        int altaEst = enviar(registroIndividual(est, "ESTUDIANTE", grupo), tokenAdmin).getStatus();
        int altaDoc = enviar(registroIndividual(doc, "DOCENTE", grupo), tokenAdmin).getStatus();
        boolean claveEsCiEst = usuarioRepository.findByCorreousuario(est.correo())
                .map(u -> passwordEncoder.matches(est.ci(), u.getContraseniausuario())).orElse(false);
        boolean claveEsCiDoc = usuarioRepository.findByCorreousuario(doc.correo())
                .map(u -> passwordEncoder.matches(doc.ci(), u.getContraseniausuario())).orElse(false);
        MockHttpServletResponse loginEst = login(est.correo(), est.ci());
        MockHttpServletResponse loginDoc = login(doc.correo(), doc.ci());

        evidencia("TC-248", "Registro sin contraseña · estudiante → " + altaEst + " (contraseña = C.I.: " + claveEsCiEst
                + ", login con C.I. → " + loginEst.getStatus() + ") · docente → " + altaDoc + " (contraseña = C.I.: "
                + claveEsCiDoc + ", login con C.I. → " + loginDoc.getStatus() + ")");

        assertAll(
                () -> assertEquals(201, altaEst, "Debe registrarse el estudiante"),
                () -> assertEquals(201, altaDoc, "Debe registrarse el docente"),
                () -> assertTrue(claveEsCiEst, "La contraseña del estudiante debe ser su C.I."),
                () -> assertTrue(claveEsCiDoc, "La contraseña del docente debe ser su C.I."),
                () -> assertEquals(200, loginEst.getStatus(), "El estudiante debe iniciar sesión con su C.I."),
                () -> assertEquals(200, loginDoc.getStatus(), "El docente debe iniciar sesión con su C.I.")
        );
    }
}