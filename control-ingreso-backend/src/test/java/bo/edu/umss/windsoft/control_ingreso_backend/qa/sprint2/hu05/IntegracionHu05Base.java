package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu05;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Base de las pruebas de integración de la HU05 (QA · sprint 2).
 *
 * - Usan la base de datos real (perfil "local") y solo corren con -Dsupabase.integration=true.
 * - Las peticiones pasan por el filtro de seguridad con tokens JWT, como lo hace el frontend.
 * - Cada prueba corre en una transacción que se deshace al terminar: habilitaciones, ingresos
 *   y asignaciones de prueba NO quedan guardados.
 * - Los intentos bloqueados se guardan aparte (transacción propia); se borran al terminar.
 */
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@Transactional
abstract class IntegracionHu05Base {

    /** Estudiante real elegido para la prueba. */
    protected record EstudiantePrueba(Integer codSis, Usuario usuario) {
    }

    @Autowired protected WebApplicationContext contexto;
    @Autowired protected JwtTokenProvider jwtTokenProvider;
    @Autowired protected AdminRepository adminRepository;
    @Autowired protected UsuarioRepository usuarioRepository;
    @Autowired protected EstudianteRepository estudianteRepository;
    @Autowired protected AyudanteRepository ayudanteRepository;
    @Autowired protected AmbienteRepository ambienteRepository;
    @Autowired protected ExamenRepository examenRepository;
    @Autowired protected IngresoRepository ingresoRepository;
    @Autowired protected HabilitacionRepository habilitacionRepository;
    @Autowired protected IntentoNoAutorizadoRepository intentoRepository;
    @Autowired protected PlatformTransactionManager transactionManager;

    protected MockMvc mvc;
    protected Usuario admin;
    protected String tokenAdmin;
    protected LocalDateTime inicioPrueba;
    private final Set<Integer> estudiantesUsados = new HashSet<>();

    @BeforeEach
    void prepararBase() {
        Filter filtroSeguridad = contexto.getBean("springSecurityFilterChain", Filter.class);
        mvc = MockMvcBuilders.webAppContextSetup(contexto).addFilters(filtroSeguridad).build();
        SecurityContextHolder.clearContext(); // cada petición se identifica solo con su token
        admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
        tokenAdmin = token(admin, "ADMINISTRADOR");
        inicioPrueba = HoraOficial.ahora().minusSeconds(2);
    }

    /** Borra los intentos bloqueados que generó la prueba (se guardan fuera de la transacción). */
    @AfterEach
    void borrarIntentosDePrueba() {
        if (estudiantesUsados.isEmpty()) return;
        TransactionTemplate aparte = new TransactionTemplate(transactionManager);
        aparte.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        aparte.executeWithoutResult(estado -> intentoRepository.deleteAll(intentoRepository.findAll().stream()
                .filter(i -> estudiantesUsados.contains(i.getCodsisEstudiante()))
                .filter(i -> i.getHoraIntento() != null && !i.getHoraIntento().isBefore(inicioPrueba))
                .toList()));
        SecurityContextHolder.clearContext();
    }

    // ---------------------------------------------------------------------
    // Peticiones
    // ---------------------------------------------------------------------

    protected String token(Usuario u, String rol) {
        return jwtTokenProvider.generarToken(u.getCorreousuario(), rol, u.getIdusuario(), nombre(u));
    }

    /** Envía la petición con el token en la cabecera Authorization (null = sin sesión). */
    protected MockHttpServletResponse enviar(RequestBuilder peticion, String token) throws Exception {
        RequestBuilder conToken = servletContext -> {
            MockHttpServletRequest request = peticion.buildRequest(servletContext);
            if (token != null) request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
        return mvc.perform(conToken).andReturn().getResponse();
    }

    protected String texto(MockHttpServletResponse r) throws Exception {
        return r.getContentAsString(StandardCharsets.UTF_8);
    }

    /** Verificar ingreso, igual que el botón "Verificar ingreso" (extra = campos adicionales del JSON). */
    protected MockHttpServletResponse ingresar(String token, Ambiente aula, String identificador, String extra) throws Exception {
        String json = "{\"identificador\":\"" + identificador + "\",\"idasignatura\":" + aula.getIdAsignatura()
                + ",\"idexamen\":" + aula.getIdExamen() + ",\"idambiente\":" + aula.getIdAmbiente()
                + ",\"metodoIngreso\":\"MANUAL\"" + (extra == null ? "" : "," + extra) + "}";
        return enviar(post("/api/v1/control/ingresos").contentType("application/json").content(json), token);
    }

    protected MockHttpServletResponse ingresar(Ambiente aula, EstudiantePrueba e) throws Exception {
        return ingresar(tokenAdmin, aula, String.valueOf(e.codSis()), null);
    }

    protected String campo(String json, String nombre) {
        Matcher m = Pattern.compile("\"" + nombre + "\"\\s*:\\s*\"?([^\",}]*)\"?").matcher(json);
        return m.find() ? m.group(1) : null;
    }

    protected List<String> campos(String json, String nombre) {
        List<String> lista = new ArrayList<>();
        Matcher m = Pattern.compile("\"" + nombre + "\"\\s*:\\s*\"?([^\",}]*)\"?").matcher(json);
        while (m.find()) lista.add(m.group(1));
        return lista;
    }

    // ---------------------------------------------------------------------
    // Datos de prueba
    // ---------------------------------------------------------------------

    /** Aula de un examen que tiene una sola aula (así el estudiante habilitado va a esa aula). */
    protected Ambiente aulaUnicaDelExamen() {
        return ambienteRepository.findAll().stream()
                .filter(a -> ambienteRepository.findByIdExamen(a.getIdExamen()).size() == 1)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un examen con una sola aula para la prueba."));
    }

    /** Estudiante real sin habilitación ni ingreso para el examen del aula. */
    protected EstudiantePrueba estudianteLibre(Ambiente aula) {
        Set<Integer> conIngreso = ingresoRepository.findByIdAsignaturaAndIdExamen(aula.getIdAsignatura(), aula.getIdExamen())
                .stream().map(Ingreso::getCodsisEstudiante).collect(Collectors.toSet());
        return estudianteRepository.findAll().stream()
                .filter(e -> !estudiantesUsados.contains(e.getCodsisestudiante()))
                .filter(e -> !conIngreso.contains(e.getCodsisestudiante()))
                .filter(e -> habilitacionRepository.findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(
                        aula.getIdAsignatura(), aula.getIdExamen(), e.getCodsisestudiante()).isEmpty())
                .filter(e -> habilitacionRepository.findByIdAsignaturaAndIdExamenAndIdUsuario(
                        aula.getIdAsignatura(), aula.getIdExamen(), e.getIdusuario()).isEmpty())
                .map(e -> usuarioRepository.findById(e.getIdusuario())
                        .map(u -> new EstudiantePrueba(e.getCodsisestudiante(), u)).orElse(null))
                .filter(p -> p != null && p.usuario().getCiusuario() != null && !p.usuario().getCiusuario().isBlank())
                .findFirst()
                .map(p -> { estudiantesUsados.add(p.codSis()); return p; })
                .orElseThrow(() -> new IllegalStateException("No hay un estudiante disponible para la prueba."));
    }

    /** Registra la habilitación del estudiante para el examen del aula (se deshace al terminar). */
    protected void habilitar(Ambiente aula, EstudiantePrueba e, boolean habilitado) {
        Habilitacion h = new Habilitacion();
        h.setEstudiante(estudianteRepository.findByCodsisestudiante(e.codSis()).orElseThrow());
        h.setIdExamen(aula.getIdExamen());
        h.setIdAsignatura(aula.getIdAsignatura());
        h.setIdUsuario(e.usuario().getIdusuario());
        h.setEstadohabilitacion(habilitado);
        if (!habilitado) h.setObservacionhabilitacion("Prueba QA: no cumple requisitos.");
        h.setFecharegistro(HoraOficial.hoy());
        habilitacionRepository.saveAndFlush(h);
    }

    protected EstudiantePrueba estudianteHabilitado(Ambiente aula) {
        EstudiantePrueba e = estudianteLibre(aula);
        habilitar(aula, e, true);
        return e;
    }

    protected List<Ingreso> ingresosDe(Ambiente aula, EstudiantePrueba e) {
        return ingresoRepository.findByIdAsignaturaAndIdExamen(aula.getIdAsignatura(), aula.getIdExamen()).stream()
                .filter(i -> e.codSis().equals(i.getCodsisEstudiante())).toList();
    }

    protected List<IntentoNoAutorizado> intentosDe(Ambiente aula, EstudiantePrueba e, MotivoIntento motivo) {
        return intentoRepository.findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(
                        aula.getIdAsignatura(), aula.getIdExamen(), motivo).stream()
                .filter(i -> e.codSis().equals(i.getCodsisEstudiante()))
                .filter(i -> i.getHoraIntento() != null && !i.getHoraIntento().isBefore(inicioPrueba))
                .toList();
    }

    protected Usuario operadorActivo() {
        return ayudanteRepository.findAll().stream()
                .map(a -> usuarioRepository.findById(a.getIdusuario()).orElse(null))
                .filter(u -> u != null && Boolean.TRUE.equals(u.getEstadousuario()) && u.getCorreousuario() != null)
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un operador activo para la prueba."));
    }

    protected String nombre(Usuario u) {
        return (u.getNombreusuario() + " " + u.getApellidousuario()).trim();
    }

    /** Deja en la consola una línea que sirve como evidencia del test case. */
    protected void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }
}