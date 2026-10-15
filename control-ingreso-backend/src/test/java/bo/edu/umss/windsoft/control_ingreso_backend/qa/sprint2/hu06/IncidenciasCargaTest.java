package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaListaDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Prueba de carga de la HU06 (incidencias) contra la base de datos real, desde el backend local.
 * Las 1000 incidencias se crean dentro de una transacción que SIEMPRE se deshace (rollback):
 * nadie más las ve y no queda ninguna guardada. Usan los números 900001 a 901000 en lugar de
 * pedírselos al sistema, así el contador de incidencias no cambia (la siguiente incidencia real
 * conserva su número normal). Listar incidencias no escribe nada en la auditoría.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@DisplayName("HU06 · Incidencias (pruebas de carga)")
class IncidenciasCargaTest {

    private static final String IP_LOCAL = "127.0.0.1";
    private static final int PRIMER_ID = 900_001;

    private static final String[] TIPOS = {"SUPLANTACION", "OBJETO_PROHIBIDO", "CONDUCTA_INAPROPIADA",
            "FALLA_TECNICA", "PROBLEMA_AULA", "OTRO"};
    private static final String[] DESCRIPCIONES = {
            "El documento presentado no coincide con la persona que rinde el examen.",
            "Estudiante con celular encendido durante el examen.",
            "Estudiante conversando con su compañero después de la advertencia.",
            "El proyector del aula dejó de funcionar.",
            "El aula no tiene suficientes sillas para todos los estudiantes.",
            "Estudiante solicitó salir del aula por un momento."};
    private static final String[] ESTADOS = {"ABIERTA", "EN_REVISION", "CERRADA"};
    private static final String[] SEVERIDADES = {"BAJA", "MEDIA", "ALTA"};

    @Autowired IncidenciaService incidenciaService;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired AmbienteRepository ambienteRepository;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;

    private Usuario admin;

    /** Una incidencia inventada de la prueba. */
    private record Inc(int id, String tipo, String estado) {}

    /** Un filtro de la sección Incidencias y su resultado. */
    private record Medicion(String filtro, long ms, int filas, long esperadasDePrueba) {}

    @BeforeEach
    void iniciarSesionComoAdministrador() {
        admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
        UsernamePasswordAuthenticationToken sesion = new UsernamePasswordAuthenticationToken(
                admin.getCorreousuario(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")));
        sesion.setDetails(admin.getIdusuario());
        SecurityContextHolder.getContext().setAuthentication(sesion);
    }

    @AfterEach
    void cerrarSesion() {
        SecurityContextHolder.clearContext();
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    private int incidenciasDePruebaGuardadas(int cantidad) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM incidencia WHERE idincidencia BETWEEN ? AND ?",
                Integer.class, PRIMER_ID, PRIMER_ID + cantidad - 1);
        return n == null ? 0 : n;
    }

    /** Tipo real de cada columna (por si la base usa tipos propios para tipo, severidad y estado). */
    private Map<String, String> tiposDeColumna() {
        Map<String, String> tipos = new HashMap<>();
        jdbc.query("SELECT column_name, udt_name FROM information_schema.columns "
                        + "WHERE table_schema = 'public' AND table_name = 'incidencia'",
                rs -> { tipos.put(rs.getString(1), rs.getString(2)); });
        return tipos;
    }

    /** Inserta las incidencias de prueba con sus propios números (no usa el contador del sistema). */
    private void insertar(List<Inc> incidencias, Ambiente aula) {
        Map<String, String> t = tiposDeColumna();
        String sql = "INSERT INTO incidencia (idincidencia, clavesolicitud, idambiente, idusuarioreporta, tipoincidencia, "
                + "severidad, descripcion, estadoincidencia, fechahora, fecharevision, idusuariorevisa, resolucion, "
                + "fecharesolucion, idusuarioresuelve) VALUES (?, CAST(? AS \"" + t.get("clavesolicitud") + "\"), ?, ?, "
                + "CAST(? AS \"" + t.get("tipoincidencia") + "\"), CAST(? AS \"" + t.get("severidad") + "\"), ?, "
                + "CAST(? AS \"" + t.get("estadoincidencia") + "\"), ?, ?, ?, ?, ?, ?)";
        LocalDateTime ahora = LocalDateTime.now().withNano(0);
        List<Object[]> filas = new ArrayList<>();
        for (int n = 0; n < incidencias.size(); n++) {
            Inc inc = incidencias.get(n);
            int iTipo = java.util.Arrays.asList(TIPOS).indexOf(inc.tipo());
            Timestamp fecha = Timestamp.valueOf(ahora.minusMinutes(n));
            boolean revisada = !inc.estado().equals("ABIERTA");
            boolean cerrada = inc.estado().equals("CERRADA");
            filas.add(new Object[]{
                    inc.id(), UUID.randomUUID().toString(), aula.getIdAmbiente(), admin.getIdusuario(), inc.tipo(),
                    SEVERIDADES[n % SEVERIDADES.length], DESCRIPCIONES[iTipo], inc.estado(), fecha,
                    revisada ? fecha : null, revisada ? admin.getIdusuario() : null,
                    cerrada ? "Se conversó con el estudiante y se registró lo ocurrido." : null,
                    cerrada ? fecha : null, cerrada ? admin.getIdusuario() : null});
        }
        int[] tiposSql = {Types.INTEGER, Types.VARCHAR, Types.INTEGER, Types.INTEGER, Types.VARCHAR, Types.VARCHAR,
                Types.VARCHAR, Types.VARCHAR, Types.TIMESTAMP, Types.TIMESTAMP, Types.INTEGER, Types.VARCHAR,
                Types.TIMESTAMP, Types.INTEGER};
        jdbc.batchUpdate(sql, filas, tiposSql);
    }

    private Medicion medir(String nombre, Integer idAmbiente, String tipo, String estado, List<Inc> dePrueba) {
        long inicio = System.nanoTime();
        IncidenciaListaDto lista = incidenciaService.listar(null, idAmbiente, tipo, estado, IP_LOCAL);
        long ms = (System.nanoTime() - inicio) / 1_000_000;
        long esperadas = dePrueba.stream()
                .filter(i -> tipo == null || i.tipo().equals(tipo))
                .filter(i -> estado == null || i.estado().equals(estado))
                .count();
        return new Medicion(nombre, ms, lista.incidencias().size(), esperadas);
    }

    private static void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-299 (C47) · Con 1000 incidencias, cada filtro responde en menos de 2 s")
    void conMilIncidencias_losFiltrosRespondenEnMenosDe2Segundos() {
        final int cantidad = 1000;
        final long limiteMs = 2000;

        Ambiente aula = ambienteRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay aulas de examen para la prueba."));

        // Seguro: los números 900001 a 901000 deben estar libres antes de empezar
        assertEquals(0, incidenciasDePruebaGuardadas(cantidad),
                "Los números de incidencia de la prueba deben estar libres antes de empezar");

        List<Inc> dePrueba = new ArrayList<>();
        for (int n = 0; n < cantidad; n++) {
            dePrueba.add(new Inc(PRIMER_ID + n, TIPOS[n % TIPOS.length], ESTADOS[(n / TIPOS.length) % ESTADOS.length]));
        }

        // Todo ocurre dentro de una transacción que se deshace siempre al terminar (rollback)
        TransactionTemplate transaccion = new TransactionTemplate(transactionManager);
        long[] msInsercion = new long[1];
        List<Medicion> mediciones = transaccion.execute(estado -> {
            estado.setRollbackOnly();
            long t0 = System.nanoTime();
            insertar(dePrueba, aula);
            msInsercion[0] = (System.nanoTime() - t0) / 1_000_000;

            // Primera consulta de calentamiento (no se cuenta): prepara la conexión
            incidenciaService.listar(null, null, null, null, IP_LOCAL);

            Integer a = aula.getIdAmbiente();
            List<Medicion> m = new ArrayList<>();
            m.add(medir("Sin filtro", null, null, null, dePrueba));
            m.add(medir("Abiertas", null, null, "ABIERTA", dePrueba));
            m.add(medir("En revisión", null, null, "EN_REVISION", dePrueba));
            m.add(medir("Cerradas", null, null, "CERRADA", dePrueba));
            m.add(medir("Tipo Objeto prohibido", null, "OBJETO_PROHIBIDO", null, dePrueba));
            m.add(medir("Aula " + a, a, null, null, dePrueba));
            m.add(medir("Aula + Objeto prohibido + Abiertas", a, "OBJETO_PROHIBIDO", "ABIERTA", dePrueba));
            return m;
        });

        // Comprobación después del rollback: no debe quedar ninguna de las 1000
        int quedan = incidenciasDePruebaGuardadas(cantidad);
        long masLento = mediciones.stream().mapToLong(Medicion::ms).max().orElse(0);
        evidencia("TC-299", "Aula usada: id " + aula.getIdAmbiente() + " · " + cantidad + " incidencias creadas en "
                + String.format("%.2f", msInsercion[0] / 1000.0) + " s (6 tipos, 3 estados) · Tiempo de cada filtro: "
                + mediciones.stream().map(m -> m.filtro() + " " + String.format("%.2f", m.ms() / 1000.0) + " s ("
                        + m.filas() + " filas)").collect(Collectors.joining(" | "))
                + " · El más lento: " + String.format("%.2f", masLento / 1000.0) + " s (límite " + limiteMs / 1000 + " s)"
                + " · Incidencias de prueba que quedaron guardadas después del rollback: " + quedan);

        assertEquals(0, quedan, "No debe quedar ninguna incidencia de prueba en la base de datos");
        assertAll(mediciones.stream().map(m -> (Executable) () -> {
            assertTrue(m.filas() >= m.esperadasDePrueba(), "El filtro \"" + m.filtro() + "\" debe incluir las "
                    + m.esperadasDePrueba() + " incidencias de prueba que le corresponden (devolvió " + m.filas() + ")");
            assertTrue(m.ms() < limiteMs, "El filtro \"" + m.filtro() + "\" debe responder en menos de 2 s (tardó "
                    + String.format("%.2f", m.ms() / 1000.0) + " s)");
        }));
    }
}