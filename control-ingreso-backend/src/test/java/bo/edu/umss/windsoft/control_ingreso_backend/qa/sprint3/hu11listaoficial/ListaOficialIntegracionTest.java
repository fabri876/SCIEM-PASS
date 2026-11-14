package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint3.hu11listaoficial;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HU11 · Lista oficial del aula en tiempo real (pruebas de integración y de carga).
 *
 * Se usa el servicio real de la Lista oficial contra la base de datos, pero todos los datos de prueba
 * (examen, aulas, estudiantes, habilitaciones e ingresos) se crean en tablas TEMPORALES dentro de una
 * transacción que SIEMPRE se deshace. Las tablas temporales tapan a las reales solo en esta conexión:
 * nadie más las ve y no se escribe nada en las tablas reales.
 *
 * Integración: TC-008 (servidor), TC-056, TC-057, TC-058, TC-059, TC-060 · Carga: TC-395.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@DisplayName("HU11 · Lista oficial (integración y carga)")
class ListaOficialIntegracionTest {

    private static final int EXAMEN = 9001;
    private static final int ASIGNATURA = 9101;
    private static final int AULA_A = 9201;
    private static final int AULA_B = 9202;
    private static final int AMBIENTE_A = 9301;
    private static final int AMBIENTE_B = 9302;
    private static final int OPERADOR = 9;
    private static final int OTRO_OPERADOR = 8;

    private static final List<String> TABLAS = List.of("semestre", "examen", "habilitacion", "estudiante", "usuario",
            "ambiente", "aula", "cambioambiente", "ingreso", "credencial");

    private static final String[][] NOMBRES = {
            {"Daniela", "Arce Guzmán"}, {"Camila", "Ramos Villarroel"}, {"Sebastián", "Herrera Condori"},
            {"Joaquín", "Soria Mendoza"}, {"Mateo", "Zurita Paredes"}, {"Andrea", "Quiroga Salinas"},
            {"Diego", "Medina Flores"}, {"Valentina", "Rocha Céspedes"}, {"Rodrigo", "Aguilar Torrico"},
            {"Lucía", "Cabrera Antezana"}};

    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired AsignacionIngresoService servicio;
    @PersistenceContext EntityManager em;

    // ------------------------------------------------------------ datos de prueba

    private static int idUsuario(int i) { return 70_000 + i; }
    private static int sis(int i) { return 202_690_000 + i; }

    /** Crea tablas temporales con la misma estructura que las reales y les quita los "NOT NULL". */
    private void crearTablasTemporales() {
        for (String tabla : TABLAS) {
            jdbc.execute("CREATE TEMP TABLE " + tabla + " (LIKE public." + tabla + " INCLUDING DEFAULTS)");
            List<String> obligatorias = jdbc.queryForList(
                    "SELECT column_name FROM information_schema.columns WHERE table_schema ="
                            + " (SELECT nspname FROM pg_namespace WHERE oid = pg_my_temp_schema())"
                            + " AND table_name = ? AND is_nullable = 'NO'", String.class, tabla);
            for (String columna : obligatorias)
                jdbc.execute("ALTER TABLE pg_temp." + tabla + " ALTER COLUMN \"" + columna + "\" DROP NOT NULL");
        }
    }

    /** Examen de hoy en el Aula 691B (y opcionalmente una segunda aula) con N estudiantes habilitados. */
    private void crearExamen(int estudiantes, boolean dosAulas) {
        jdbc.execute("INSERT INTO pg_temp.semestre (idsemestre, estado) VALUES (1, 'ACTUAL')");
        jdbc.update("INSERT INTO pg_temp.examen (idexamen, idasignatura, idsemestre, idusuario, estadoexamen, fechaexamen)"
                + " VALUES (?, ?, 1, ?, true, CURRENT_DATE)", EXAMEN, ASIGNATURA, OPERADOR);
        jdbc.update("INSERT INTO pg_temp.aula (idaula, nombreaula, capacidadaula, ubicacionaula, estadoaula) VALUES (?, 'Aula 691B', 100, 'Edificio de prueba', true)", AULA_A);
        jdbc.update("INSERT INTO pg_temp.ambiente (idambiente, idexamen, idasignatura, idaula, horainicio, horafin)"
                + " VALUES (?, ?, ?, ?, '13:50', '19:50')", AMBIENTE_A, EXAMEN, ASIGNATURA, AULA_A);
        if (dosAulas) {
            jdbc.update("INSERT INTO pg_temp.aula (idaula, nombreaula, capacidadaula, ubicacionaula, estadoaula) VALUES (?, 'Aula 692A', 100, 'Edificio de prueba', true)", AULA_B);
            jdbc.update("INSERT INTO pg_temp.ambiente (idambiente, idexamen, idasignatura, idaula, horainicio, horafin)"
                    + " VALUES (?, ?, ?, ?, '13:50', '19:50')", AMBIENTE_B, EXAMEN, ASIGNATURA, AULA_B);
        }
        List<Object[]> usuarios = new ArrayList<>(), est = new ArrayList<>(), hab = new ArrayList<>();
        for (int i = 1; i <= estudiantes; i++) {
            String[] n = NOMBRES[(i - 1) % NOMBRES.length];
            usuarios.add(new Object[]{idUsuario(i), String.valueOf(9_900_000 + i), n[0], n[1] + (i > NOMBRES.length ? " " + i : "")});
            est.add(new Object[]{idUsuario(i), sis(i)});
            hab.add(new Object[]{80_000 + i, sis(i), EXAMEN, ASIGNATURA});
        }
        jdbc.batchUpdate("INSERT INTO pg_temp.usuario (idusuario, ciusuario, nombreusuario, apellidousuario) VALUES (?, ?, ?, ?)", usuarios);
        jdbc.batchUpdate("INSERT INTO pg_temp.estudiante (idusuario, codsisestudiante) VALUES (?, ?)", est);
        jdbc.batchUpdate("INSERT INTO pg_temp.habilitacion (idhabilitacion, codsisestudiante, idexamen, idasignatura, estadohabilitacion)"
                + " VALUES (?, ?, ?, ?, true)", hab);
    }

    /** Registra el ingreso del estudiante i a la hora indicada, como lo haría cualquier equipo de control. */
    private void registrarIngreso(int idIngreso, int i, String hora, int operador, String equipo) {
        jdbc.update("INSERT INTO pg_temp.ingreso (idingreso, est_idusuario, codsisestudiante, idasignatura, idexamen,"
                        + " idambiente, idusuario, fechaingreso, horaingreso, tipoingreso, metodo_ingreso, audit_flag, device_id)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, CURRENT_DATE + TIME '" + hora + "', 'NORMAL', 'MANUAL', false, ?)",
                idIngreso, idUsuario(i), sis(i), ASIGNATURA, EXAMEN, AMBIENTE_A, operador, equipo);
    }

    /** Lista oficial tal como la entrega el servidor (sin datos guardados en memoria de consultas anteriores). */
    private List<EstudianteListaOficialDTO> lista() {
        em.flush();
        em.clear();
        return servicio.obtenerListaOficial(EXAMEN, "");
    }

    private static EstudianteListaOficialDTO fila(List<EstudianteListaOficialDTO> lista, int i) {
        return lista.stream().filter(f -> Integer.valueOf(sis(i)).equals(f.getCodSisEstudiante())).findFirst().orElseThrow();
    }

    private static Map<String, Long> conteo(List<EstudianteListaOficialDTO> lista) {
        Map<String, Long> c = new TreeMap<>(Map.of("INGRESO", 0L, "PENDIENTE", 0L, "INHABILITADO", 0L));
        lista.forEach(f -> c.merge(f.getEstado(), 1L, Long::sum));
        return c;
    }

    private static String texto(Map<String, Long> c) {
        return "Ingresaron " + c.get("INGRESO") + " · Ausentes " + c.get("PENDIENTE") + " · Inhabilitados " + c.get("INHABILITADO");
    }

    /** Ejecuta la prueba dentro de una transacción que siempre se deshace. */
    private void enTransaccionDeshecha(Consumer<Void> prueba) {
        new TransactionTemplate(transactionManager).executeWithoutResult(estado -> {
            estado.setRollbackOnly();
            crearTablasTemporales();
            prueba.accept(null);
        });
    }

    // ---------------------------------------------------------------- pruebas

    @Test
    @DisplayName("TC-008 · (servidor) El total corresponde a los estudiantes asignados al aula")
    void totalCorrespondeAlAula() {
        enTransaccionDeshecha(v -> {
            crearExamen(10, true);
            List<EstudianteListaOficialDTO> l = lista();
            Map<String, Long> porAula = l.stream().collect(Collectors.groupingBy(
                    f -> String.valueOf(f.getAulaAsignada()), TreeMap::new, Collectors.counting()));
            System.out.println("\n[EVIDENCIA] TC-008 · Examen con 10 habilitados repartidos en 2 aulas: " + porAula);
            System.out.println("[EVIDENCIA]   Estudiantes en la Lista oficial del Aula 691B: " + l.size()
                    + " (esperado: " + porAula.get("Aula 691B") + ", los asignados a esa aula)\n");
            assertEquals(porAula.get("Aula 691B").intValue(), l.size(),
                    "La Lista oficial del aula debe tener solo a los estudiantes asignados a esa aula");
        });
    }

    @Test
    @DisplayName("TC-056 · Un ingreso hecho en otro equipo cambia \"Ausente\" a \"Ingresó\"")
    void ingresoEnOtroEquipo() {
        enTransaccionDeshecha(v -> {
            crearExamen(6, false);
            String antes = fila(lista(), 1).getEstado();
            registrarIngreso(1, 1, "14:02:53", OTRO_OPERADOR, "celular-ayudante-2");
            String despues = fila(lista(), 1).getEstado();
            System.out.println("\n[EVIDENCIA] TC-056 · Daniela Arce: antes " + antes + " → después del ingreso en otro equipo " + despues
                    + " (esperado: PENDIENTE → INGRESO)\n");
            assertEquals("PENDIENTE", antes);
            assertEquals("INGRESO", despues);
        });
    }

    @Test
    @DisplayName("TC-057 · Tras un ingreso sube \"Ingresaron\" y baja \"Ausentes\"")
    void ingresoActualizaConteos() {
        enTransaccionDeshecha(v -> {
            crearExamen(6, false);
            Map<String, Long> antes = conteo(lista());
            registrarIngreso(1, 2, "14:29:15", OPERADOR, "laptop-docente");
            Map<String, Long> despues = conteo(lista());
            System.out.println("\n[EVIDENCIA] TC-057 · Antes: " + texto(antes) + " → después: " + texto(despues)
                    + " (esperado: Ingresaron +1 · Ausentes -1)\n");
            assertEquals(antes.get("INGRESO") + 1, despues.get("INGRESO"));
            assertEquals(antes.get("PENDIENTE") - 1, despues.get("PENDIENTE"));
        });
    }

    @Test
    @DisplayName("TC-058 · La hora de \"Ingresó HH:MM\" es la hora de ingreso guardada en el servidor")
    void horaDeIngresoDelServidor() {
        enTransaccionDeshecha(v -> {
            crearExamen(6, false);
            registrarIngreso(1, 3, "10:15:42", OPERADOR, "laptop-docente");
            String guardada = jdbc.queryForObject("SELECT to_char(horaingreso, 'HH24:MI:SS') FROM pg_temp.ingreso WHERE idingreso = 1", String.class);
            String enLista = fila(lista(), 3).getHoraIngreso();
            System.out.println("\n[EVIDENCIA] TC-058 · Hora guardada en el servidor: " + guardada + " · hora en la Lista oficial: " + enLista
                    + " · en pantalla: \"Ingresó " + enLista.substring(0, 5) + "\"\n");
            assertEquals(guardada, enLista);
        });
    }

    @Test
    @DisplayName("TC-059 · Al inhabilitar a un estudiante pasa a \"Inhabilitado\" y cambian los conteos")
    void inhabilitarCambiaEstadoYConteos() {
        enTransaccionDeshecha(v -> {
            crearExamen(6, false);
            Map<String, Long> antes = conteo(lista());
            jdbc.update("UPDATE pg_temp.habilitacion SET estadohabilitacion = false, observacionhabilitacion = 'copia en el primer parcial'"
                    + " WHERE codsisestudiante = ?", sis(4));
            List<EstudianteListaOficialDTO> l = lista();
            Map<String, Long> despues = conteo(l);
            EstudianteListaOficialDTO joaquin = fila(l, 4);
            System.out.println("\n[EVIDENCIA] TC-059 · Joaquín Soria inhabilitado: estado " + joaquin.getEstado() + " · motivo \"" + joaquin.getObservacion() + "\"");
            System.out.println("[EVIDENCIA]   Antes: " + texto(antes) + " → después: " + texto(despues)
                    + " (esperado: Ausentes -1 · Inhabilitados +1)\n");
            assertEquals("INHABILITADO", joaquin.getEstado());
            assertEquals(antes.get("PENDIENTE") - 1, despues.get("PENDIENTE"));
            assertEquals(antes.get("INHABILITADO") + 1, despues.get("INHABILITADO"));
        });
    }

    @Test
    @DisplayName("TC-060 · Tras varios ingresos la Lista oficial coincide con los registros del servidor")
    void listaCoincideConRegistros() {
        enTransaccionDeshecha(v -> {
            crearExamen(10, false);
            String[] horas = {"14:01:10", "14:03:25", "14:05:40", "14:08:05", "14:11:30"};
            int[] estudiantes = {1, 3, 5, 7, 9};
            for (int k = 0; k < estudiantes.length; k++)
                registrarIngreso(k + 1, estudiantes[k], horas[k], k % 2 == 0 ? OPERADOR : OTRO_OPERADOR, "equipo-" + (k % 2 + 1));
            Set<Integer> enServidor = new TreeSet<>(jdbc.queryForList(
                    "SELECT codsisestudiante FROM pg_temp.ingreso WHERE idexamen = ?", Integer.class, EXAMEN));
            Set<Integer> enLista = lista().stream().filter(f -> "INGRESO".equals(f.getEstado()))
                    .map(EstudianteListaOficialDTO::getCodSisEstudiante).collect(Collectors.toCollection(TreeSet::new));
            System.out.println("\n[EVIDENCIA] TC-060 · Ingresos registrados en el servidor: " + enServidor.size() + " · \"Ingresó\" en la Lista oficial: " + enLista.size());
            System.out.println("[EVIDENCIA]   ¿Son los mismos estudiantes?: " + (enServidor.equals(enLista) ? "sí" : "no") + "\n");
            assertEquals(enServidor, enLista);
        });
    }

    @Test
    @DisplayName("TC-395 · 100 ingresos se ven en la Lista oficial sin perderse ni duplicarse")
    void cienIngresosSinPerdidasNiDuplicados() {
        enTransaccionDeshecha(v -> {
            crearExamen(100, false);
            for (int k = 1; k <= 100; k++)
                registrarIngreso(k, k, "14:30:00", k % 2 == 0 ? OPERADOR : OTRO_OPERADOR, "equipo-" + (k % 4));
            // El mismo ingreso llega dos veces (por ejemplo, un equipo que sincroniza de nuevo)
            registrarIngreso(101, 1, "14:30:05", OTRO_OPERADOR, "equipo-repetido");
            long inicio = System.nanoTime();
            List<EstudianteListaOficialDTO> l = lista();
            long ms = (System.nanoTime() - inicio) / 1_000_000;
            long ingresaron = l.stream().filter(f -> "INGRESO".equals(f.getEstado())).count();
            long distintos = l.stream().map(EstudianteListaOficialDTO::getCodSisEstudiante).distinct().count();
            System.out.println("\n[EVIDENCIA] TC-395 · 100 ingresos registrados (uno de ellos llegó dos veces)");
            System.out.println("[EVIDENCIA]   Filas en la Lista oficial: " + l.size() + " · \"Ingresó\": " + ingresaron
                    + " · estudiantes distintos: " + distintos + " (esperado: 100 · 100 · 100)");
            System.out.println("[EVIDENCIA]   Tiempo para armar la lista: " + ms + " ms\n");
            assertEquals(100, l.size(), "No debe haber filas perdidas ni repetidas");
            assertEquals(100, ingresaron, "Los 100 ingresos deben verse como \"Ingresó\"");
            assertEquals(100, distintos, "Cada estudiante debe aparecer una sola vez");
        });
    }
}