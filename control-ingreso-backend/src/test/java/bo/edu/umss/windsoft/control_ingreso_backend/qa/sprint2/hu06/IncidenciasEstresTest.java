package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Prueba de estrés de la HU06 (incidencias) desde el backend local, contra la base de datos real.
 * Las 30 incidencias se registran a la vez, cada una en su propia transacción que se deshace siempre (rollback):
 * no queda ninguna guardada. Quedan dos rastros acordados: la numeración de incidencias avanza 30 números
 * y el historial de auditoría guarda una línea por cada incidencia registrada.
 * La base de datos (Supabase) solo entrega 16 conexiones. Cada registro necesita 2 a la vez (el registro y la
 * auditoría, ver BUG-18), así que como máximo 7 registros avanzan al mismo tiempo y el resto espera su turno;
 * así se puede revisar lo que pide el test case: que los códigos no se repitan.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off",
        "spring.datasource.hikari.maximum-pool-size=16", "spring.datasource.hikari.connection-timeout=120000"})
@ActiveProfiles("local")
@DisplayName("HU06 · Incidencias (pruebas de estrés)")
class IncidenciasEstresTest {

    private static final String IP_LOCAL = "127.0.0.1";
    private static final String[][] TIPOS = {
            {"OBJETO_PROHIBIDO", "Estudiante con celular encendido durante el examen."},
            {"CONDUCTA_INAPROPIADA", "Estudiante conversando con su compañero después de la advertencia."},
            {"FALLA_TECNICA", "El proyector del aula dejó de funcionar."},
            {"PROBLEMA_AULA", "El aula no tiene suficientes sillas para todos los estudiantes."},
            {"OTRO", "Estudiante solicitó salir del aula por un momento."}};

    @Autowired IncidenciaService incidenciaService;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;

    private Usuario admin;

    /** Resultado de un registro. */
    private record Registro(int usuario, long ms, Integer id, String codigo, String error) {}

    @BeforeEach
    void iniciarSesionComoAdministrador() {
        admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
        SecurityContextHolder.getContext().setAuthentication(sesionAdmin());
    }

    @AfterEach
    void cerrarSesion() {
        SecurityContextHolder.clearContext();
    }

    private UsernamePasswordAuthenticationToken sesionAdmin() {
        UsernamePasswordAuthenticationToken sesion = new UsernamePasswordAuthenticationToken(
                admin.getCorreousuario(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")));
        sesion.setDetails(admin.getIdusuario());
        return sesion;
    }

    /** Aula de un examen que ya empezó (ahí se permite registrar incidencias): la de una incidencia existente. */
    private Integer aulaDeExamenIniciado() {
        List<Integer> conIncidencias = jdbc.queryForList(
                "SELECT idambiente FROM incidencia ORDER BY idincidencia LIMIT 1", Integer.class);
        if (!conIncidencias.isEmpty()) return conIncidencias.getFirst();
        List<Integer> pasadas = jdbc.queryForList("SELECT a.idambiente FROM ambiente a JOIN examen e ON e.idexamen = a.idexamen "
                + "WHERE e.fechaexamen < CURRENT_DATE ORDER BY e.fechaexamen DESC LIMIT 1", Integer.class);
        if (!pasadas.isEmpty()) return pasadas.getFirst();
        throw new IllegalStateException("No hay un examen que ya haya empezado para registrar incidencias.");
    }

    private static void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    @Test
    @DisplayName("TC-310 (C48) · Con 30 usuarios registrando a la vez, los códigos INC son únicos")
    void treintaRegistrosSimultaneos_codigosUnicos() throws Exception {
        final int usuarios = 30;
        final int simultaneos = 7;
        final Integer idAmbiente = aulaDeExamenIniciado();
        Integer ultimoAntes = jdbc.queryForObject("SELECT COALESCE(max(idincidencia), 0) FROM incidencia", Integer.class);

        // Los 30 usuarios arrancan a la vez; como máximo 7 registran al mismo tiempo (límite de conexiones).
        // Cada registro corre en su propia transacción y se deshace al terminar (no se guarda).
        ExecutorService hilos = Executors.newFixedThreadPool(usuarios);
        CountDownLatch largada = new CountDownLatch(1);
        Semaphore turnos = new Semaphore(simultaneos);
        List<Future<Registro>> futuros = new ArrayList<>();
        for (int i = 1; i <= usuarios; i++) {
            final int usuario = i;
            final String[] tipo = TIPOS[i % TIPOS.length];
            futuros.add(hilos.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(sesionAdmin());
                largada.await();
                long t0 = System.nanoTime();
                turnos.acquire();
                try {
                    TransactionTemplate transaccion = new TransactionTemplate(transactionManager);
                    return transaccion.execute(st -> {
                        st.setRollbackOnly();
                        IncidenciaDetalleDto d = incidenciaService.registrar(UUID.randomUUID().toString(), idAmbiente,
                                tipo[0], "BAJA", tipo[1], null, false, null, IP_LOCAL);
                        return new Registro(usuario, (System.nanoTime() - t0) / 1_000_000, d.idIncidencia(), d.codigo(), null);
                    });
                } catch (Exception e) {
                    return new Registro(usuario, (System.nanoTime() - t0) / 1_000_000, null, null, e.getMessage());
                } finally {
                    turnos.release();
                }
            }));
        }
        largada.countDown();
        List<Registro> resultados = new ArrayList<>();
        for (Future<Registro> f : futuros) resultados.add(f.get(5, TimeUnit.MINUTES));
        hilos.shutdown();

        List<Registro> exitosos = resultados.stream().filter(r -> r.codigo() != null).toList();
        List<Registro> conError = resultados.stream().filter(r -> r.codigo() == null).toList();
        Map<String, Long> repetidos = exitosos.stream()
                .collect(Collectors.groupingBy(Registro::codigo, Collectors.counting()))
                .entrySet().stream().filter(e -> e.getValue() > 1)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        Set<String> codigos = exitosos.stream().map(Registro::codigo).collect(Collectors.toCollection(HashSet::new));
        String rango = exitosos.stream().map(Registro::id).filter(Objects::nonNull).min(Comparator.naturalOrder())
                .map(min -> "INC-" + String.format("%03d", min) + " a INC-" + String.format("%03d",
                        exitosos.stream().map(Registro::id).max(Comparator.naturalOrder()).orElse(min)))
                .orElse("(ninguno)");
        long masLento = resultados.stream().mapToLong(Registro::ms).max().orElse(0);

        // Comprobación después del rollback: no debe quedar ninguna de esas incidencias
        String ids = exitosos.stream().map(r -> String.valueOf(r.id())).collect(Collectors.joining(","));
        Integer quedan = ids.isEmpty() ? 0 : jdbc.queryForObject(
                "SELECT count(*) FROM incidencia WHERE idincidencia IN (" + ids + ")", Integer.class);

        evidencia("TC-310", usuarios + " usuarios registrando incidencias a la vez, hasta " + simultaneos
                + " al mismo tiempo por el límite de conexiones (aula " + idAmbiente + ") · "
                + "Registradas: " + exitosos.size() + ", con error: " + conError.size()
                + (conError.isEmpty() ? "" : " (" + conError.stream().limit(3).map(Registro::error)
                        .collect(Collectors.joining(" | ")) + ")")
                + " · Códigos distintos: " + codigos.size() + " de " + exitosos.size()
                + " · Códigos repetidos: " + (repetidos.isEmpty() ? "ninguno" : repetidos)
                + " · Códigos usados: " + rango + " (la última incidencia real antes de la prueba era INC-"
                + String.format("%03d", ultimoAntes) + ")"
                + " · Registro más lento: " + String.format("%.2f", masLento / 1000.0) + " s"
                + " · Incidencias que quedaron guardadas después del rollback: " + quedan);

        assertEquals(0, quedan, "No debe quedar ninguna incidencia de la prueba en la base de datos");
        assertAll(
                () -> assertEquals(Map.of(), repetidos, "Ningún código INC debe repetirse"),
                () -> assertEquals(usuarios, exitosos.size(), "Las 30 incidencias deben registrarse sin errores")
        );
    }
}