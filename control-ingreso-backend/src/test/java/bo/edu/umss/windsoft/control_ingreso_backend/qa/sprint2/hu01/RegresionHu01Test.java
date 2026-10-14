package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import jakarta.servlet.Filter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
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
 * Pruebas de regresión de la HU01: se hacen peticiones reales al backend con el token del
 * administrador, igual que el panel. Todo lo que se guarda se deshace al terminar;
 * solo queda el historial de auditoría.
 */
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@Transactional
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU01 · Regresión")
class RegresionHu01Test {

    private static final String[] ENC_ESTUDIANTES = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"};
    private static final String[] ENC_DOCENTES = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO", "ID_ASIGNATURA", "GRUPO"};
    private static final Random AZAR = new Random();

    /** Persona nueva de prueba (C.I., SIS y correo que no existen en la base). */
    private record Persona(String ci, int sis, String correo) {
    }

    @Autowired WebApplicationContext contexto;
    @Autowired JwtTokenProvider jwtTokenProvider;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TipoUsuarioResolver tipoUsuarioResolver;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired GrupoRepository grupoRepository;
    @Autowired DocenteGrupoRepository docenteGrupoRepository;
    @Autowired EstudianteGrupoRepository estudianteGrupoRepository;

    private MockMvc mvc;
    private String tokenAdmin;
    private final Set<Integer> usados = new HashSet<>();

    @BeforeEach
    void preparar() {
        Filter filtroSeguridad = contexto.getBean("springSecurityFilterChain", Filter.class);
        mvc = MockMvcBuilders.webAppContextSetup(contexto).addFilters(filtroSeguridad).build();
        SecurityContextHolder.clearContext(); // cada petición se identifica solo con su token
        Usuario admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
        tokenAdmin = jwtTokenProvider.generarToken(admin.getCorreousuario(), "ADMINISTRADOR", admin.getIdusuario(),
                admin.getNombreusuario() + " " + admin.getApellidousuario());
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    private MockHttpServletResponse enviar(RequestBuilder peticion) throws Exception {
        RequestBuilder conToken = servletContext -> {
            MockHttpServletRequest request = peticion.buildRequest(servletContext);
            request.addHeader("Authorization", "Bearer " + tokenAdmin);
            return request;
        };
        return mvc.perform(conToken).andReturn().getResponse();
    }

    private String texto(MockHttpServletResponse respuesta) throws Exception {
        return respuesta.getContentAsString(StandardCharsets.UTF_8);
    }

    private Grupo grupoActivo() {
        return grupoRepository.findAll().stream().filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un grupo activo para la prueba."));
    }

    private Persona nueva() {
        String ci;
        int n;
        String correo;
        do {
            n = 10000 + AZAR.nextInt(90000);
            ci = "96" + n;                       // 7 dígitos
            correo = "qa.reg" + n + "@test.com";
        } while (usados.contains(n) || usuarioRepository.existsByCiusuario(ci) || usuarioRepository.findByCorreousuario(correo).isPresent());
        usados.add(n);
        return new Persona(ci, 209800000 + n, correo); // SIS de 9 dígitos
    }

    private Optional<Usuario> buscar(Persona p) {
        return usuarioRepository.findByCorreousuario(p.correo());
    }

    private String[] filaEstudiante(Persona p) {
        return new String[]{String.valueOf(p.sis()), p.correo(), p.ci(), "Prueba Regresion", "QA Estudiante", "70000001"};
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

    /** Carga masiva confirmada (la que guarda), como el botón "Confirmar y registrar". */
    private MockHttpServletResponse cargar(MockMultipartFile archivo, String rol, Integer idGrupo) throws Exception {
        var peticion = multipart("/api/usuarios/carga-masiva").file(archivo);
        peticion.param("rol", rol);
        if (idGrupo != null) peticion.param("idGrupo", String.valueOf(idGrupo));
        return enviar(peticion);
    }

    private MockHttpServletResponse cargarEstudiante(Persona p, Grupo g) throws Exception {
        return cargar(excel(ENC_ESTUDIANTES, filaEstudiante(p)), "ESTUDIANTE", g.getIdGrupo());
    }

    private MockHttpServletResponse cargarDocente(Persona p, Grupo g) throws Exception {
        return cargar(excel(ENC_DOCENTES, new String[]{String.valueOf(p.sis()), p.correo(), p.ci(), "Prueba Regresion",
                "QA Docente", "70000002", String.valueOf(g.getIdAsignatura()), g.getNombreGrupo()}), "DOCENTE", null);
    }

    /** Registro individual desde el panel del administrador, sin contraseña (como lo envía el formulario). */
    private MockHttpServletResponse registrar(Persona p, String rol, Grupo g) throws Exception {
        String json = "{\"nombre\":\"QA Individual\",\"apellido\":\"Prueba Regresion\",\"ci\":\"" + p.ci() + "\","
                + "\"correo\":\"" + p.correo() + "\",\"telefono\":70000003,\"rol\":\"" + rol + "\","
                + "\"codigoSis\":" + p.sis() + ",\"idGrupos\":[" + g.getIdGrupo() + "]}";
        return enviar(post("/api/admin/usuarios").contentType("application/json").content(json));
    }

    private Integer numero(String json, String campo) {
        Matcher m = Pattern.compile("\"" + campo + "\"\\s*:\\s*(\\d+)").matcher(json);
        return m.find() ? Integer.valueOf(m.group(1)) : null;
    }

    private List<Integer> numeros(String json, String campo) {
        List<Integer> lista = new ArrayList<>();
        Matcher m = Pattern.compile("\"" + campo + "\"\\s*:\\s*(\\d+)").matcher(json);
        while (m.find()) lista.add(Integer.valueOf(m.group(1)));
        return lista;
    }

    private Set<String> roles(String json) {
        Set<String> lista = new TreeSet<>();
        Matcher m = Pattern.compile("\"rol\"\\s*:\\s*\"([A-Z]+)\"").matcher(json);
        while (m.find()) lista.add(m.group(1));
        return lista;
    }

    /** Resumen de cómo quedó guardada una persona: rol, grupo, contraseña = C.I. y estado. */
    private String comoQuedo(Persona p, Grupo g) {
        Optional<Usuario> u = buscar(p);
        if (u.isEmpty()) return "no se guardó";
        Integer id = u.get().getIdusuario();
        String rol = tipoUsuarioResolver.resolver(id);
        boolean enGrupo = "DOCENTE".equals(rol)
                ? docenteGrupoRepository.existsByIdUsuarioAndIdGrupo(id, g.getIdGrupo())
                : estudianteGrupoRepository.existsByIdUsuarioAndIdGrupo(id, g.getIdGrupo());
        boolean claveCi = passwordEncoder.matches(p.ci(), u.get().getContraseniausuario());
        return "rol=" + rol + ", en su grupo=" + enGrupo + ", clave C.I.=" + claveCi + ", activo=" + u.get().getEstadousuario();
    }

    private void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-276 (C1) · En Gestión de Usuarios el admin registra y carga estudiantes y docentes")
    void admin_registraYCargaEstudiantesYDocentes() throws Exception {
        Grupo g = grupoActivo();
        Persona estIndividual = nueva(), docIndividual = nueva(), estMasivo = nueva(), docMasivo = nueva();

        int altaEst = registrar(estIndividual, "ESTUDIANTE", g).getStatus();
        int altaDoc = registrar(docIndividual, "DOCENTE", g).getStatus();
        Integer nuevosEst = numero(texto(cargarEstudiante(estMasivo, g)), "exitosos");
        Integer nuevosDoc = numero(texto(cargarDocente(docMasivo, g)), "exitosos");

        Map<String, String> rol = new LinkedHashMap<>();
        rol.put("Estudiante individual", buscar(estIndividual).map(u -> tipoUsuarioResolver.resolver(u.getIdusuario())).orElse("no se guardó"));
        rol.put("Docente individual", buscar(docIndividual).map(u -> tipoUsuarioResolver.resolver(u.getIdusuario())).orElse("no se guardó"));
        rol.put("Estudiante por Excel", buscar(estMasivo).map(u -> tipoUsuarioResolver.resolver(u.getIdusuario())).orElse("no se guardó"));
        rol.put("Docente por Excel", buscar(docMasivo).map(u -> tipoUsuarioResolver.resolver(u.getIdusuario())).orElse("no se guardó"));
        evidencia("TC-276", "Registro individual → estudiante " + altaEst + ", docente " + altaDoc
                + " · Carga masiva → estudiantes nuevos " + nuevosEst + ", docentes nuevos " + nuevosDoc + " · Roles guardados: " + rol);

        assertAll(
                () -> assertEquals(201, altaEst, "Debe registrarse el estudiante"),
                () -> assertEquals(201, altaDoc, "Debe registrarse el docente"),
                () -> assertEquals(1, nuevosEst, "Debe cargarse el estudiante del Excel"),
                () -> assertEquals(1, nuevosDoc, "Debe cargarse el docente del Excel"),
                () -> assertEquals("ESTUDIANTE", rol.get("Estudiante individual")),
                () -> assertEquals("DOCENTE", rol.get("Docente individual")),
                () -> assertEquals("ESTUDIANTE", rol.get("Estudiante por Excel")),
                () -> assertEquals("DOCENTE", rol.get("Docente por Excel"))
        );
    }

    @Test
    @DisplayName("TC-277 (C37) · Al confirmar la carga masiva se guardan solo las filas válidas y se listan errores")
    void confirmarCarga_guardaSoloValidasYListaErrores() throws Exception {
        Grupo g = grupoActivo();
        Persona a = nueva(), b = nueva(), sinCi = nueva(), repetido = nueva();
        String[] filaSinCi = filaEstudiante(sinCi);
        filaSinCi[2] = "";                          // fila 4: sin C.I.
        String[] filaRepetida = filaEstudiante(repetido);
        filaRepetida[2] = a.ci();                   // fila 5: mismo C.I. que la fila 2

        String json = texto(cargar(excel(ENC_ESTUDIANTES, filaEstudiante(a), filaEstudiante(b), filaSinCi, filaRepetida),
                "ESTUDIANTE", g.getIdGrupo()));
        Integer nuevos = numero(json, "exitosos");
        Integer fallidos = numero(json, "fallidos");
        List<Integer> filasConError = numeros(json, "fila");
        evidencia("TC-277", "Excel de 4 filas (2 válidas, 1 sin C.I., 1 con C.I. repetido) · Nuevos: " + nuevos
                + " · Fallidos: " + fallidos + " · Filas con error: " + filasConError
                + " · Guardados → fila 2: " + buscar(a).isPresent() + ", fila 3: " + buscar(b).isPresent()
                + ", fila 4: " + buscar(sinCi).isPresent() + ", fila 5: " + buscar(repetido).isPresent()
                + " · Detalle: " + json);

        assertAll(
                () -> assertEquals(2, nuevos, "Deben guardarse las 2 filas válidas"),
                () -> assertEquals(2, fallidos, "Deben rechazarse las 2 filas inválidas"),
                () -> assertEquals(List.of(4, 5), filasConError, "Deben listarse los errores de las filas 4 y 5"),
                () -> assertTrue(json.contains("El Carnet de Identidad (CI) es obligatorio."), "Debe indicar el C.I. obligatorio"),
                () -> assertTrue(json.contains("duplicado en el mismo archivo"), "Debe indicar el C.I. duplicado"),
                () -> assertTrue(buscar(a).isPresent() && buscar(b).isPresent(), "Las filas válidas deben quedar guardadas"),
                () -> assertTrue(buscar(sinCi).isEmpty() && buscar(repetido).isEmpty(), "Las filas inválidas no deben guardarse")
        );
    }

    @Test
    @DisplayName("TC-280 (C59) · El registro individual y la carga masiva dan el mismo rol, grupo y clave C.I.")
    void individualYMasivo_dejanIgualALaPersona() throws Exception {
        Grupo g = grupoActivo();
        Persona estIndividual = nueva(), estMasivo = nueva(), docIndividual = nueva(), docMasivo = nueva();

        registrar(estIndividual, "ESTUDIANTE", g);
        cargarEstudiante(estMasivo, g);
        registrar(docIndividual, "DOCENTE", g);
        cargarDocente(docMasivo, g);

        String ei = comoQuedo(estIndividual, g), em = comoQuedo(estMasivo, g);
        String di = comoQuedo(docIndividual, g), dm = comoQuedo(docMasivo, g);
        evidencia("TC-280", "Estudiante individual: " + ei + " · Estudiante por Excel: " + em
                + " · Docente individual: " + di + " · Docente por Excel: " + dm);

        String esperadoEst = "rol=ESTUDIANTE, en su grupo=true, clave C.I.=true, activo=true";
        String esperadoDoc = "rol=DOCENTE, en su grupo=true, clave C.I.=true, activo=true";
        assertAll(
                () -> assertEquals(esperadoEst, ei, "Estudiante registrado individualmente"),
                () -> assertEquals(esperadoEst, em, "Estudiante cargado por Excel"),
                () -> assertEquals(esperadoDoc, di, "Docente registrado individualmente"),
                () -> assertEquals(esperadoDoc, dm, "Docente cargado por Excel")
        );
    }

    @Test
    @DisplayName("TC-281 (C60) · En Gestión de Usuarios se sigue listando, filtrando, editando y activando usuarios")
    void gestionUsuarios_sigueFuncionando() throws Exception {
        Grupo g = grupoActivo();
        Persona p = nueva();
        Integer id = numero(texto(registrar(p, "ESTUDIANTE", g)), "idUsuario");
        assertNotNull(id, "Debe crearse el usuario de prueba");

        MockHttpServletResponse todos = enviar(get("/api/admin/usuarios"));
        MockHttpServletResponse soloDocentes = enviar(get("/api/admin/usuarios").param("rol", "DOCENTE"));
        MockHttpServletResponse porCorreo = enviar(get("/api/admin/usuarios").param("busqueda", p.correo()));
        boolean apareceEnLista = numeros(texto(todos), "idUsuario").contains(id);
        Set<String> rolesFiltrados = roles(texto(soloDocentes));
        List<Integer> encontrados = numeros(texto(porCorreo), "idUsuario");

        String cambio = "{\"nombre\":\"QA Editado\",\"apellido\":\"Prueba Regresion\",\"correo\":\"" + p.correo() + "\",\"telefono\":71111111}";
        MockHttpServletResponse editar = enviar(put("/api/admin/usuarios/" + id).contentType("application/json").content(cambio));
        String nombreDespues = usuarioRepository.findById(id).map(Usuario::getNombreusuario).orElse(null);
        Integer telefonoDespues = usuarioRepository.findById(id).map(Usuario::getTelefonousuario).orElse(null);

        MockHttpServletResponse desactivar = enviar(patch("/api/admin/usuarios/" + id + "/estado")
                .contentType("application/json").content("{\"nuevoEstado\":\"INACTIVO\"}"));
        Boolean estadoInactivo = usuarioRepository.findById(id).map(Usuario::getEstadousuario).orElse(null);
        MockHttpServletResponse activar = enviar(patch("/api/admin/usuarios/" + id + "/estado")
                .contentType("application/json").content("{\"nuevoEstado\":\"ACTIVO\"}"));
        Boolean estadoActivo = usuarioRepository.findById(id).map(Usuario::getEstadousuario).orElse(null);

        evidencia("TC-281", "Usuario de prueba #" + id + " · listar → " + todos.getStatus() + " (aparece: " + apareceEnLista + ")"
                + " · filtrar Docentes → " + soloDocentes.getStatus() + " roles " + rolesFiltrados
                + " · buscar por correo → " + porCorreo.getStatus() + " " + encontrados
                + " · editar → " + editar.getStatus() + " (nombre \"" + nombreDespues + "\", teléfono " + telefonoDespues + ")"
                + " · desactivar → " + desactivar.getStatus() + " (activo=" + estadoInactivo + ")"
                + " · activar → " + activar.getStatus() + " (activo=" + estadoActivo + ")");

        assertAll(
                () -> assertEquals(200, todos.getStatus()),
                () -> assertTrue(apareceEnLista, "El usuario nuevo debe aparecer en la lista"),
                () -> assertEquals(Set.of("DOCENTE"), rolesFiltrados, "El filtro Docentes debe traer solo docentes"),
                () -> assertEquals(List.of(id), encontrados, "La búsqueda por correo debe traer solo a ese usuario"),
                () -> assertEquals(200, editar.getStatus()),
                () -> assertEquals("QA Editado", nombreDespues, "Debe guardarse el nombre editado"),
                () -> assertEquals(71111111, telefonoDespues, "Debe guardarse el teléfono editado"),
                () -> assertEquals(200, desactivar.getStatus()),
                () -> assertEquals(Boolean.FALSE, estadoInactivo, "El usuario debe quedar inactivo"),
                () -> assertEquals(200, activar.getStatus()),
                () -> assertEquals(Boolean.TRUE, estadoActivo, "El usuario debe volver a quedar activo")
        );
    }
}