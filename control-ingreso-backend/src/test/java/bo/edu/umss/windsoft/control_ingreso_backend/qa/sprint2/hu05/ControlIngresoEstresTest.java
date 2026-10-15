package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu05;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ControlIngresoAyudanteService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoNoAutorizadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ResultadoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Prueba de estrés de la HU05 (control de ingreso) desde el backend local, contra la base de datos real.
 * NO guarda ingresos ni habilitaciones: cada verificación corre en su propia transacción, que se deshace
 * siempre (rollback). Los intentos bloqueados que el sistema guarda aparte se borran al terminar.
 * Usa las mismas 10 conexiones a la base de datos que el sistema publicado. Solo se alarga la espera por una
 * conexión (2 min), porque la prueba hace trabajo extra de preparación que el sistema real no hace.
 * Si no hay 100 estudiantes reales disponibles, los que faltan se crean dentro de cada transacción
 * (con nombres comunes) y también se deshacen.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off",
        "spring.datasource.hikari.connection-timeout=120000"})
@ActiveProfiles("local")
@DisplayName("HU05 · Control de ingreso (pruebas de estrés)")
class ControlIngresoEstresTest {

    @Autowired ControlIngresoAyudanteService controlIngresoService;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired AmbienteRepository ambienteRepository;
    @Autowired HabilitacionRepository habilitacionRepository;
    @Autowired IntentoNoAutorizadoRepository intentoRepository;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;

    private Usuario admin;
    private LocalDateTime inicioPrueba;
    private final Set<Integer> estudiantesUsados = java.util.concurrent.ConcurrentHashMap.newKeySet();

    /** Resultado de una verificación. */
    private record Verificacion(int operador, int codSis, long ms, long fin, String estado) {}

    @BeforeEach
    void preparar() {
        admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
        SecurityContextHolder.getContext().setAuthentication(sesionAdmin());
        inicioPrueba = HoraOficial.ahora().minusSeconds(2);
    }

    /** Borra los intentos bloqueados que generó la prueba (el sistema los guarda aparte). */
    @AfterEach
    void borrarIntentosDePrueba() {
        if (!estudiantesUsados.isEmpty()) {
            TransactionTemplate aparte = new TransactionTemplate(transactionManager);
            aparte.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            aparte.executeWithoutResult(estado -> intentoRepository.deleteAll(intentoRepository.findAll().stream()
                    .filter(i -> estudiantesUsados.contains(i.getCodsisEstudiante()))
                    .filter(i -> i.getHoraIntento() != null && !i.getHoraIntento().isBefore(inicioPrueba))
                    .toList()));
        }
        SecurityContextHolder.clearContext();
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    private UsernamePasswordAuthenticationToken sesionAdmin() {
        UsernamePasswordAuthenticationToken sesion = new UsernamePasswordAuthenticationToken(
                admin.getCorreousuario(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")));
        sesion.setDetails(admin.getIdusuario());
        return sesion;
    }

    /** Aula de un examen que tiene una sola aula (así el estudiante habilitado va a esa aula). */
    private Ambiente aulaUnicaDelExamen() {
        return ambienteRepository.findAll().stream()
                .filter(a -> ambienteRepository.findByIdExamen(a.getIdExamen()).size() == 1)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un examen con una sola aula para la prueba."));
    }

    /** Estudiantes reales sin habilitación ni ingreso para el examen del aula. */
    private List<Integer> estudiantesLibres(Ambiente aula, int cantidad) {
        return jdbc.queryForList("SELECT e.codsisestudiante FROM estudiante e JOIN usuario u ON u.idusuario = e.idusuario "
                + "WHERE u.ciusuario IS NOT NULL AND u.ciusuario <> '' "
                + "AND NOT EXISTS (SELECT 1 FROM habilitacion h WHERE h.codsisestudiante = e.codsisestudiante "
                + "  AND (h.idexamen = ? OR (h.idexamen IS NULL AND h.idasignatura = ?))) "
                + "AND NOT EXISTS (SELECT 1 FROM ingreso i WHERE i.codsisestudiante = e.codsisestudiante "
                + "  AND i.idexamen = ? AND i.idasignatura = ?) "
                + "ORDER BY e.codsisestudiante LIMIT ?", Integer.class,
                aula.getIdExamen(), aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAsignatura(), cantidad);
    }

    /** Habilita al estudiante para el examen dentro de la transacción en curso (se deshace al terminar). */
    private void habilitar(Ambiente aula, int codSis) {
        var estudiante = estudianteRepository.findByCodsisestudiante(codSis).orElseThrow();
        Habilitacion h = new Habilitacion();
        h.setEstudiante(estudiante);
        h.setIdExamen(aula.getIdExamen());
        h.setIdAsignatura(aula.getIdAsignatura());
        h.setIdUsuario(estudiante.getIdusuario());
        h.setEstadohabilitacion(true);
        h.setFecharegistro(HoraOficial.hoy());
        habilitacionRepository.saveAndFlush(h);
    }

    private static final String[] NOMBRES = {"Mariana", "Jorge", "Lucía", "Andrés", "Valeria", "Carlos", "Camila",
            "Luis", "Daniela", "Miguel"};
    private static final String[] APELLIDOS = {"López", "Vargas", "Rojas", "Mendoza", "Gutiérrez", "Fernández",
            "Quispe", "Mamani", "Flores", "Torrez"};

    /** Crea un estudiante temporal dentro de la transacción en curso (se deshace al terminar). */
    private void crearEstudianteTemporal(int codSis, int n) {
        String nombre = NOMBRES[n % NOMBRES.length];
        String apellidos = APELLIDOS[(n / NOMBRES.length) % APELLIDOS.length] + " " + APELLIDOS[(n + 3) % APELLIDOS.length];
        String correo = java.text.Normalizer.normalize(nombre + "." + apellidos.replace(' ', '.') + n,
                java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase() + "@gmail.com";
        Usuario u = usuarioRepository.saveAndFlush(new Usuario(String.valueOf(6200000 + n), nombre, apellidos,
                72000000 + n, correo, "-", true));
        estudianteRepository.saveAndFlush(new Estudiante(u.getIdusuario(), codSis));
    }

    /** Códigos SIS libres para estudiantes temporales (ninguno existe en la base). */
    private List<Integer> codigosTemporales(int cantidad) {
        int base = 202660000;
        Integer ocupados = jdbc.queryForObject("SELECT count(*) FROM estudiante WHERE codsisestudiante BETWEEN ? AND ?",
                Integer.class, base, base + cantidad);
        assertEquals(0, ocupados == null ? 0 : ocupados, "Los códigos SIS temporales deben estar libres");
        List<Integer> lista = new ArrayList<>();
        for (int i = 0; i < cantidad; i++) lista.add(base + i);
        return lista;
    }

    private String verificar(Ambiente aula, int codSis) {
        ResponseEntity<ResultadoIngresoDTO> r = controlIngresoService.registrarIngreso(new VerificarIngresoRequestDTO(
                String.valueOf(codSis), aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente(),
                MetodoIngreso.MANUAL), admin.getIdusuario());
        return r.getBody() == null ? String.valueOf(r.getStatusCode().value()) : r.getBody().estado();
    }

    private int ingresosGuardados(Ambiente aula, List<Integer> codigos) {
        if (codigos.isEmpty()) return 0;
        String lista = codigos.stream().map(String::valueOf).collect(Collectors.joining(","));
        Integer n = jdbc.queryForObject("SELECT count(*) FROM ingreso WHERE idexamen = ? AND idasignatura = ? "
                + "AND codsisestudiante IN (" + lista + ")", Integer.class, aula.getIdExamen(), aula.getIdAsignatura());
        return n == null ? 0 : n;
    }

    private int habilitacionesGuardadas(Ambiente aula, List<Integer> codigos) {
        if (codigos.isEmpty()) return 0;
        String lista = codigos.stream().map(String::valueOf).collect(Collectors.joining(","));
        Integer n = jdbc.queryForObject("SELECT count(*) FROM habilitacion WHERE idexamen = ? AND idasignatura = ? "
                + "AND codsisestudiante IN (" + lista + ")", Integer.class, aula.getIdExamen(), aula.getIdAsignatura());
        return n == null ? 0 : n;
    }

    private List<String> reglasUnicas(String... tablas) {
        String lista = java.util.Arrays.stream(tablas).map(t -> "'" + t + "'").collect(Collectors.joining(","));
        return jdbc.queryForList("SELECT tablename || '.' || indexname || ' ' || substring(indexdef from '\\((.*)\\)') "
                + "FROM pg_indexes WHERE schemaname = 'public' AND tablename IN (" + lista + ") "
                + "AND indexdef ILIKE 'CREATE UNIQUE%'", String.class);
    }

    private static void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-309 (C49) · Parte 1: 100 usuarios verificando a la vez no pierden ingresos")
    void cienVerificacionesSimultaneas_noSePierdenIngresos() throws Exception {
        final int operadores = 100;
        Ambiente aula = aulaUnicaDelExamen();
        List<Integer> reales = estudiantesLibres(aula, operadores);
        List<Integer> temporales = codigosTemporales(operadores - reales.size());
        List<Integer> estudiantes = new ArrayList<>(reales);
        estudiantes.addAll(temporales);
        Set<Integer> esTemporal = new java.util.HashSet<>(temporales);
        estudiantesUsados.addAll(estudiantes);

        // Cada operador verifica a un estudiante distinto, todos al mismo tiempo.
        // Cada verificación corre en su propia transacción y se deshace al terminar (no se guarda).
        ExecutorService hilos = Executors.newFixedThreadPool(estudiantes.size());
        CountDownLatch largada = new CountDownLatch(1);
        List<Future<Verificacion>> futuros = new ArrayList<>();
        for (int i = 0; i < estudiantes.size(); i++) {
            final int operador = i + 1;
            final int codSis = estudiantes.get(i);
            futuros.add(hilos.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(sesionAdmin());
                largada.await();
                long t0 = System.nanoTime();
                String estado;
                try {
                    TransactionTemplate transaccion = new TransactionTemplate(transactionManager);
                    estado = transaccion.execute(st -> {
                        st.setRollbackOnly();
                        if (esTemporal.contains(codSis)) crearEstudianteTemporal(codSis, operador);
                        habilitar(aula, codSis);
                        String e = verificar(aula, codSis);
                        st.flush(); // el ingreso se escribe de verdad en la base (dentro de la transacción)
                        return e;
                    });
                } catch (Exception e) {
                    estado = "ERROR: " + e.getMessage();
                }
                long fin = System.nanoTime();
                return new Verificacion(operador, codSis, (fin - t0) / 1_000_000, fin, estado);
            }));
        }
        largada.countDown();
        List<Verificacion> resultados = new ArrayList<>();
        for (Future<Verificacion> f : futuros) resultados.add(f.get(10, TimeUnit.MINUTES));
        hilos.shutdown();

        Map<String, Long> porEstado = resultados.stream().collect(Collectors.groupingBy(
                v -> v.estado().startsWith("ERROR") ? "ERROR" : v.estado(), LinkedHashMap::new, Collectors.counting()));
        List<String> errores = resultados.stream().filter(v -> !"PERMITIDO".equals(v.estado()))
                .limit(3).map(v -> "operador " + v.operador() + ": " + v.estado()).toList();
        long masLento = resultados.stream().mapToLong(Verificacion::ms).max().orElse(0);
        int quedanIngresos = ingresosGuardados(aula, estudiantes);
        int quedanHabilitaciones = habilitacionesGuardadas(aula, estudiantes);
        Integer quedanTemporales = temporales.isEmpty() ? 0 : jdbc.queryForObject(
                "SELECT count(*) FROM estudiante WHERE codsisestudiante BETWEEN ? AND ?", Integer.class,
                temporales.getFirst(), temporales.getLast());

        evidencia("TC-309-PARTE1", estudiantes.size() + " operadores verificando a la vez a " + estudiantes.size()
                + " estudiantes distintos (examen " + aula.getIdExamen() + ", aula " + aula.getIdAmbiente() + "; "
                + reales.size() + " estudiantes reales y " + temporales.size() + " temporales creados solo durante la prueba)"
                + " · Resultados: " + porEstado + " · Verificación más lenta: " + String.format("%.2f", masLento / 1000.0) + " s"
                + (errores.isEmpty() ? "" : " · Ejemplos de lo que no se registró: " + String.join(" | ", errores))
                + " · Quedaron guardados después del rollback: " + quedanIngresos + " ingresos, "
                + quedanHabilitaciones + " habilitaciones, " + quedanTemporales + " estudiantes temporales");

        assertEquals(0, quedanIngresos + quedanHabilitaciones + quedanTemporales,
                "No debe quedar nada de la prueba en la base de datos");
        assertEquals(estudiantes.size(), porEstado.getOrDefault("PERMITIDO", 0L).intValue(),
                "Todas las verificaciones deben registrarse como Ingreso permitido (ninguna se pierde)");
    }

    @Test
    @DisplayName("TC-309 (C49) · Parte 2: 10 usuarios verificando al mismo estudiante no duplican el ingreso")
    void mismoEstudianteVerificadoALaVez_noDuplicaIngreso() throws Exception {
        final int operadores = 10;
        final long esperaMs = 15_000;

        // Se busca un estudiante YA habilitado (habilitación real) sin ingreso, en un examen de una sola aula.
        // Si no hay, se habilita dentro de cada transacción (se deshace al terminar).
        List<Map<String, Object>> filas = jdbc.queryForList("SELECT h.codsisestudiante AS codsis, a.idambiente AS idambiente "
                + "FROM habilitacion h JOIN ambiente a ON a.idexamen = h.idexamen AND a.idasignatura = h.idasignatura "
                + "WHERE h.estadohabilitacion = true "
                + "AND (SELECT count(*) FROM ambiente a2 WHERE a2.idexamen = a.idexamen) = 1 "
                + "AND NOT EXISTS (SELECT 1 FROM ingreso i WHERE i.codsisestudiante = h.codsisestudiante "
                + "  AND i.idexamen = a.idexamen AND i.idasignatura = a.idasignatura) "
                + "ORDER BY h.idhabilitacion LIMIT 1");
        final Ambiente aula;
        final int codSis;
        final boolean habilitacionReal = !filas.isEmpty();
        if (habilitacionReal) {
            aula = ambienteRepository.findById(((Number) filas.getFirst().get("idambiente")).intValue()).orElseThrow();
            codSis = ((Number) filas.getFirst().get("codsis")).intValue();
        } else {
            aula = aulaUnicaDelExamen();
            codSis = estudiantesLibres(aula, 1).getFirst();
        }
        estudiantesUsados.add(codSis);

        // Los 10 operadores verifican al mismo estudiante a la vez. Cada verificación queda abierta (sin confirmar)
        // hasta que terminen todas o pasen 15 s, y luego se deshace.
        // - Si el sistema NO protege, las 10 registran el ingreso juntas: se habría duplicado.
        // - Si SÍ protege, solo una lo registra; las demás esperan o reciben "duplicado".
        ExecutorService hilos = Executors.newFixedThreadPool(operadores);
        CountDownLatch largada = new CountDownLatch(1);
        CountDownLatch terminadas = new CountDownLatch(operadores);
        AtomicBoolean yaSeDeshizoAlguna = new AtomicBoolean(false);
        AtomicLong primerDeshacer = new AtomicLong(Long.MAX_VALUE);
        List<Future<Verificacion>> futuros = new ArrayList<>();
        for (int i = 1; i <= operadores; i++) {
            final int operador = i;
            futuros.add(hilos.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(sesionAdmin());
                largada.await();
                TransactionTemplate transaccion = new TransactionTemplate(transactionManager);
                return transaccion.execute(st -> {
                    st.setRollbackOnly();
                    long t0 = System.nanoTime();
                    String estado;
                    try {
                        if (!habilitacionReal) habilitar(aula, codSis);
                        estado = verificar(aula, codSis);
                        st.flush(); // el ingreso se escribe de verdad en la base (dentro de la transacción)
                    } catch (Exception e) {
                        estado = "ERROR: " + e.getMessage();
                    }
                    long fin = System.nanoTime();
                    terminadas.countDown();
                    if (!yaSeDeshizoAlguna.get()) {
                        try { terminadas.await(esperaMs, TimeUnit.MILLISECONDS); } catch (InterruptedException ignorada) { }
                    }
                    yaSeDeshizoAlguna.set(true);
                    primerDeshacer.accumulateAndGet(System.nanoTime(), Math::min);
                    return new Verificacion(operador, codSis, (fin - t0) / 1_000_000, fin, estado);
                });
            }));
        }
        largada.countDown();
        List<Verificacion> resultados = new ArrayList<>();
        for (Future<Verificacion> f : futuros) resultados.add(f.get(5, TimeUnit.MINUTES));
        hilos.shutdown();

        long permitidosALaVez = resultados.stream()
                .filter(v -> "PERMITIDO".equals(v.estado()) && v.fin() < primerDeshacer.get()).count();
        int quedanIngresos = ingresosGuardados(aula, List.of(codSis));

        evidencia("TC-309-PARTE2", operadores + " operadores verificando a la vez al mismo estudiante (SIS " + codSis
                + ", examen " + aula.getIdExamen() + ", " + (habilitacionReal ? "habilitación real" : "habilitado solo durante la prueba") + ")"
                + " · Ingresos registrados al mismo tiempo: " + permitidosALaVez + " de " + operadores
                + " · Resultado de cada operador: " + resultados.stream().sorted(Comparator.comparingLong(Verificacion::fin))
                        .map(v -> "op " + v.operador() + " " + String.format("%.2f", v.ms() / 1000.0) + " s " + v.estado())
                        .collect(Collectors.joining(" | "))
                + " · Reglas de valor único en la base de datos: "
                + (reglasUnicas("ingreso", "habilitacion").isEmpty() ? "ninguna" : String.join(" | ", reglasUnicas("ingreso", "habilitacion")))
                + " · Quedaron guardados después del rollback: " + quedanIngresos + " ingresos");

        assertEquals(0, quedanIngresos, "No debe quedar ningún ingreso de la prueba en la base de datos");
        assertTrue(permitidosALaVez <= 1, "Solo un operador debe poder registrar el ingreso del mismo estudiante "
                + "(" + permitidosALaVez + " de " + operadores + " lo registraron al mismo tiempo: se habría duplicado)");
    }
}