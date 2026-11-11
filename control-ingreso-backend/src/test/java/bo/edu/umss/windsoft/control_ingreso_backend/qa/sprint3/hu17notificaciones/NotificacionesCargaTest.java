package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint3.hu17notificaciones;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CambioExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenPublicoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HU17 · Gestión de Notificaciones según el Rol del Usuario (pruebas de carga y estrés).
 *
 * TC-313 y estrés de 50 cambios: los datos de la prueba (grupos, estudiantes, exámenes, aulas y cambios) se crean en
 * tablas TEMPORALES dentro de una transacción que SIEMPRE se deshace. Las tablas temporales tapan a las
 * reales solo en esta conexión: nadie más las ve y no se escribe nada en las tablas reales.
 *
 * TC-314 y estrés de 500 consultas: solo consultan las notificaciones de usuarios que ya existen. No escriben nada.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@DisplayName("HU17 · Notificaciones (pruebas de carga y estrés)")
class NotificacionesCargaTest {

    private static final ZoneId ZONA = ZoneId.of("America/La_Paz");

    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired ExamenPublicoRepository examenes;
    @Autowired CambioExamenRepository cambios;

    // ------------------------------------------------------------ tablas temporales

    /** Crea las tablas temporales con la estructura que usan las consultas de la campana. */
    private void crearTablasTemporales(JdbcTemplate t) {
        t.execute("CREATE TEMP TABLE semestre(idsemestre integer PRIMARY KEY, estado text)");
        t.execute("INSERT INTO pg_temp.semestre VALUES (1,'ACTUAL')");
        t.execute("CREATE TEMP TABLE asignatura(idasignatura integer, nombreasignatura text)");
        t.execute("INSERT INTO pg_temp.asignatura VALUES (101,'MATERIA DE PRUEBA')");
        t.execute("CREATE TEMP TABLE usuario(idusuario integer, nombreusuario text, apellidousuario text)");
        t.execute("CREATE TEMP TABLE aula(idaula integer, nombreaula text, ubicacionaula text)");
        t.execute("CREATE TEMP TABLE grupo(idgrupo integer, idasignatura integer, idsemestre integer)");
        for (String tabla : List.of("docentegrupo", "estudiantegrupo", "ayudantegrupo"))
            t.execute("CREATE TEMP TABLE " + tabla + "(idusuario integer, idgrupo integer)");
        t.execute("CREATE TEMP TABLE examen(idexamen integer, idgrupo integer, idasignatura integer, idsemestre integer,"
                + " idusuario integer, estadoexamen boolean, fechaexamen date)");
        t.execute("CREATE TEMP TABLE ambiente(idambiente integer, idexamen integer, idasignatura integer, idaula integer,"
                + " horainicio time, horafin time)");
        t.execute("CREATE TEMP TABLE cambio_examen(id bigint, idexamen integer, tipo text, anterior text, actual text,"
                + " fecha timestamptz)");
    }

    // ---------------------------------------------------------------- TC-313

    private static final int INSCRITOS = 600;
    private static final int OTRO_GRUPO = 100;
    private static final int AULAS = 4;
    private static final int ID_EXAMEN = 501;

    /** Grupo 11 con 600 inscritos y grupo 12 con 100; examen del grupo 11 para mañana, repartido en 4 aulas. */
    private void crearDatosTC313(JdbcTemplate t, LocalDate hoy) {
        t.execute("INSERT INTO pg_temp.usuario VALUES (9,'DOCENTE','DE PRUEBA')");
        t.execute("INSERT INTO pg_temp.grupo VALUES (11,101,1),(12,101,1)");
        t.execute("INSERT INTO pg_temp.docentegrupo VALUES (9,11)");
        List<Object[]> inscritos = new ArrayList<>();
        for (int i = 1; i <= INSCRITOS; i++) inscritos.add(new Object[]{i, 11});
        for (int i = 1; i <= OTRO_GRUPO; i++) inscritos.add(new Object[]{1000 + i, 12});
        t.batchUpdate("INSERT INTO pg_temp.estudiantegrupo VALUES (?,?)", inscritos);
        t.update("INSERT INTO pg_temp.examen VALUES (?,11,101,1,9,true,?)", ID_EXAMEN, hoy.plusDays(1));
        for (int a = 1; a <= AULAS; a++) {
            t.update("INSERT INTO pg_temp.aula VALUES (?,?,?)", a, "Aula " + (690 + a), "Edificio de prueba");
            t.update("INSERT INTO pg_temp.ambiente VALUES (?,?,101,?,'08:15','10:15')", a, ID_EXAMEN, a);
        }
        t.update("INSERT INTO pg_temp.cambio_examen VALUES (1,?,'AULA','Aula 690','Aula 691',CURRENT_TIMESTAMP)", ID_EXAMEN);
    }

    @Test
    @DisplayName("TC-313 · Un examen de un grupo de 600 inscritos llega a los 600 una sola vez")
    void examenDe600InscritosLlegaUnaSolaVez() {
        LocalDate hoy = LocalDate.now(ZONA);
        LocalTime hora = LocalTime.now(ZONA);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        tx.executeWithoutResult(estado -> {
            estado.setRollbackOnly(); // pase lo que pase, al final se deshace todo
            crearTablasTemporales(jdbc);
            crearDatosTC313(jdbc, hoy);

            // Cuántas veces le aparece el examen a cada uno (recordatorio y aviso de cambio)
            Map<Integer, Integer> vecesRecordatorio = new TreeMap<>();
            Map<Integer, Integer> vecesCambio = new TreeMap<>();
            int sinAviso = 0;
            long inicio = System.nanoTime();
            for (int id = 1; id <= INSCRITOS; id++) {
                int r = (int) examenes.proximosParaUsuario(hoy, hora, id, "ESTUDIANTE").stream()
                        .filter(e -> e.intId() == ID_EXAMEN).count();
                int c = cambios.recientesParaUsuario(id, "ESTUDIANTE").size();
                vecesRecordatorio.merge(r, 1, Integer::sum);
                vecesCambio.merge(c, 1, Integer::sum);
                if (r == 0) sinAviso++;
            }
            long ms = (System.nanoTime() - inicio) / 1_000_000;

            // Los del otro grupo de la misma materia no deben recibir nada
            int otroGrupoConAviso = 0;
            for (int id = 1001; id <= 1000 + OTRO_GRUPO; id++) {
                if (!examenes.proximosParaUsuario(hoy, hora, id, "ESTUDIANTE").isEmpty()
                        || !cambios.recientesParaUsuario(id, "ESTUDIANTE").isEmpty()) otroGrupoConAviso++;
            }

            System.out.println();
            System.out.println("[EVIDENCIA] TC-313 · Examen de un grupo de " + INSCRITOS + " inscritos, repartido en " + AULAS + " aulas");
            System.out.println("[EVIDENCIA]   Recordatorio del examen (veces que le aparece -> cantidad de estudiantes): " + vecesRecordatorio);
            System.out.println("[EVIDENCIA]   Aviso de cambio de aula   (veces que le aparece -> cantidad de estudiantes): " + vecesCambio);
            System.out.println("[EVIDENCIA]   Inscritos sin ningún aviso del examen: " + sinAviso);
            System.out.println("[EVIDENCIA]   Estudiantes del otro grupo que recibieron algo: " + otroGrupoConAviso + " de " + OTRO_GRUPO);
            System.out.println("[EVIDENCIA]   Tiempo para consultar las " + INSCRITOS + " campanas: " + ms + " ms");
            System.out.println();

            assertEquals(0, sinAviso, "Todos los inscritos deben recibir el aviso del examen");
            assertEquals(0, otroGrupoConAviso, "Ningún estudiante de otro grupo debe recibir el aviso");
            assertEquals(Map.of(1, INSCRITOS), vecesCambio, "Cada inscrito debe recibir el aviso de cambio una sola vez");
            assertEquals(Map.of(1, INSCRITOS), vecesRecordatorio,
                    "Cada inscrito debe recibir el recordatorio del examen una sola vez, pero lo recibe una vez por cada aula del examen");
        });
    }

    // ------------------------------------------------- Estrés · 50 cambios juntos

    private static final int GRUPOS = 50;
    private static final int POR_GRUPO = 10;

    // Números de cada persona de prueba según su grupo (g va de 1 a 50)
    private static int estudiante(int g, int i) { return g * 100 + i; }
    private static int docente(int g) { return 90_000 + g; }
    private static int ayudante(int g) { return 80_000 + g; }
    private static int examenDelGrupo(int g) { return 2_000 + g; }

    /** 50 grupos de la misma materia, cada uno con 10 estudiantes, su docente, su ayudante y su examen de mañana. */
    private void crearDatosCambiosJuntos(JdbcTemplate t, LocalDate hoy) {
        List<Object[]> grupos = new ArrayList<>(), est = new ArrayList<>(), doc = new ArrayList<>(),
                ay = new ArrayList<>(), exa = new ArrayList<>(), amb = new ArrayList<>();
        for (int g = 1; g <= GRUPOS; g++) {
            grupos.add(new Object[]{g, 101, 1});
            for (int i = 1; i <= POR_GRUPO; i++) est.add(new Object[]{estudiante(g, i), g});
            doc.add(new Object[]{docente(g), g});
            ay.add(new Object[]{ayudante(g), g});
            exa.add(new Object[]{examenDelGrupo(g), g, 101, 1, docente(g), true, java.sql.Date.valueOf(hoy.plusDays(1))});
            amb.add(new Object[]{g, examenDelGrupo(g), 101, 1});
        }
        t.execute("INSERT INTO pg_temp.aula VALUES (1,'Aula 691','Edificio de prueba')");
        t.batchUpdate("INSERT INTO pg_temp.grupo VALUES (?,?,?)", grupos);
        t.batchUpdate("INSERT INTO pg_temp.estudiantegrupo VALUES (?,?)", est);
        t.batchUpdate("INSERT INTO pg_temp.docentegrupo VALUES (?,?)", doc);
        t.batchUpdate("INSERT INTO pg_temp.ayudantegrupo VALUES (?,?)", ay);
        t.batchUpdate("INSERT INTO pg_temp.examen VALUES (?,?,?,?,?,?,?)", exa);
        t.batchUpdate("INSERT INTO pg_temp.ambiente VALUES (?,?,?,?,'08:15','10:15')", amb);
    }

    /** Los 50 cambios se registran juntos, en una sola instrucción y con la misma hora. El aviso del grupo g tiene id g. */
    private void registrarCambiosJuntos(JdbcTemplate t) {
        t.update("INSERT INTO pg_temp.cambio_examen (id, idexamen, tipo, anterior, actual, fecha)"
                + " SELECT e.idgrupo, e.idexamen, 'HORARIO', 'Antes grupo ' || e.idgrupo, 'Ahora grupo ' || e.idgrupo,"
                + " CURRENT_TIMESTAMP FROM pg_temp.examen e");
    }

    /** Revisa que el usuario vea exactamente el aviso de su grupo. Devuelve una descripción del problema o null. */
    private String revisar(int idUsuario, String rol, int g) {
        List<Long> ids = cambios.recientesParaUsuario(idUsuario, rol).stream().map(c -> c.id()).toList();
        return ids.equals(List.of((long) g)) ? null : rol + " " + idUsuario + " del grupo " + g + " vio los avisos " + ids;
    }

    @Test
    @DisplayName("Estrés · 50 cambios de examen registrados juntos no mezclan avisos entre grupos")
    void cincuentaCambiosJuntosNoMezclanAvisos() {
        LocalDate hoy = LocalDate.now(ZONA);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        tx.executeWithoutResult(estado -> {
            estado.setRollbackOnly(); // pase lo que pase, al final se deshace todo
            crearTablasTemporales(jdbc);
            crearDatosCambiosJuntos(jdbc, hoy);
            registrarCambiosJuntos(jdbc);
            int registrados = jdbc.queryForObject("SELECT count(DISTINCT fecha) FROM pg_temp.cambio_examen", Integer.class);

            List<String> problemas = new ArrayList<>();
            int revisados = 0;
            long inicio = System.nanoTime();
            for (int g = 1; g <= GRUPOS; g++) {
                for (int i = 1; i <= POR_GRUPO; i++) {
                    String p = revisar(estudiante(g, i), "ESTUDIANTE", g);
                    revisados++;
                    if (p != null) problemas.add(p);
                }
                String pd = revisar(docente(g), "DOCENTE", g);
                String pa = revisar(ayudante(g), "AYUDANTE", g);
                revisados += 2;
                if (pd != null) problemas.add(pd);
                if (pa != null) problemas.add(pa);
            }
            long ms = (System.nanoTime() - inicio) / 1_000_000;

            System.out.println();
            System.out.println("[EVIDENCIA] Estrés · " + GRUPOS + " cambios de examen registrados juntos (misma hora: "
                    + (registrados == 1 ? "sí" : "no") + "), uno por grupo");
            System.out.println("[EVIDENCIA]   Usuarios revisados: " + revisados + " (" + GRUPOS * POR_GRUPO
                    + " estudiantes, " + GRUPOS + " docentes y " + GRUPOS + " ayudantes)");
            System.out.println("[EVIDENCIA]   Usuarios que vieron solo el aviso de su grupo: " + (revisados - problemas.size()));
            System.out.println("[EVIDENCIA]   Usuarios con avisos de otro grupo o sin el suyo: " + problemas.size());
            problemas.stream().limit(10).forEach(p -> System.out.println("[EVIDENCIA]     " + p));
            System.out.println("[EVIDENCIA]   Tiempo para revisar las " + revisados + " campanas: " + ms + " ms");
            System.out.println();

            assertEquals(1, registrados, "Los 50 cambios deben quedar registrados en el mismo instante");
            assertTrue(problemas.isEmpty(), "Cada usuario debe ver solo el aviso de cambio de su grupo");
        });
    }

    // ------------------------------------------- TC-314 y estrés · 500 consultas

    private record Usuario(int id, String rol) {}

    /**
     * Usuarios reales del semestre actual: primero los que tienen un examen entre hoy y pasado mañana
     * (así tienen avisos en la campana) y, si faltan, otros con grupo. Solo consulta.
     */
    private List<Usuario> usuariosReales(int estudiantes, int docentes, int ayudantes) {
        String sql = """
            WITH actual AS (SELECT idsemestre FROM semestre WHERE estado = 'ACTUAL'),
                 con_examen AS (
                   SELECT DISTINCT g.idgrupo FROM grupo g
                   JOIN examen e ON e.idasignatura = g.idasignatura AND e.idsemestre = g.idsemestre
                                AND (e.idgrupo IS NULL OR e.idgrupo = g.idgrupo)
                   WHERE g.idsemestre = (SELECT idsemestre FROM actual) AND e.estadoexamen = true
                     AND e.fechaexamen BETWEEN (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
                                           AND (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date + 2)
            SELECT v.idusuario FROM %s v
            JOIN grupo g ON g.idgrupo = v.idgrupo
            LEFT JOIN con_examen c ON c.idgrupo = v.idgrupo
            WHERE g.idsemestre = (SELECT idsemestre FROM actual)
            GROUP BY v.idusuario
            ORDER BY count(c.idgrupo) DESC, v.idusuario
            LIMIT %d
            """;
        List<Usuario> lista = new ArrayList<>();
        jdbc.queryForList(sql.formatted("estudiantegrupo", estudiantes), Integer.class)
                .forEach(id -> lista.add(new Usuario(id, "ESTUDIANTE")));
        jdbc.queryForList(sql.formatted("docentegrupo", docentes), Integer.class)
                .forEach(id -> lista.add(new Usuario(id, "DOCENTE")));
        jdbc.queryForList(sql.formatted("ayudantegrupo", ayudantes), Integer.class)
                .forEach(id -> lista.add(new Usuario(id, "AYUDANTE")));
        return lista;
    }

    /** Lo que vería el usuario en su campana: la lista de avisos y, con ella, su contador. */
    private List<String> campana(Usuario u, LocalDate hoy, LocalTime hora) {
        List<String> avisos = new ArrayList<>();
        cambios.recientesParaUsuario(u.id(), u.rol()).forEach(c -> avisos.add("cambio-" + c.id()));
        examenes.proximosParaUsuario(hoy, hora, u.id(), u.rol())
                .forEach(e -> avisos.add("examen-" + e.intId() + "-" + e.idAmbiente()));
        return avisos;
    }

    /** Resultado de lanzar muchas consultas a la vez. */
    private record Resultado(int usuarios, int conAvisos, int correctas, int incorrectas, int errores,
                             long promedio, long maximo, long total) {}

    /** Consulta la referencia de cada usuario de uno en uno y después lanza todas las consultas a la vez. */
    private Resultado consultasSimultaneas(String tc, List<Usuario> usuarios, int consultas) throws Exception {
        LocalDate hoy = LocalDate.now(ZONA);
        LocalTime hora = LocalTime.now(ZONA);

        Map<Integer, List<String>> referencia = new TreeMap<>();
        for (Usuario u : usuarios) referencia.put(u.id(), campana(u, hoy, hora));
        int conAvisos = (int) referencia.values().stream().filter(l -> !l.isEmpty()).count();

        ExecutorService pool = Executors.newFixedThreadPool(consultas);
        List<Callable<long[]>> tareas = new ArrayList<>();
        for (int i = 0; i < consultas; i++) {
            Usuario u = usuarios.get(i % usuarios.size());
            tareas.add(() -> {
                long inicio = System.nanoTime();
                List<String> obtenido = campana(u, hoy, hora);
                long ms = (System.nanoTime() - inicio) / 1_000_000;
                return new long[]{obtenido.equals(referencia.get(u.id())) ? 1 : 0, ms};
            });
        }
        int correctas = 0, incorrectas = 0, errores = 0;
        long maximo = 0, suma = 0;
        long inicioTotal = System.nanoTime();
        for (Future<long[]> f : pool.invokeAll(tareas)) {
            try {
                long[] r = f.get();
                if (r[0] == 1) correctas++; else incorrectas++;
                maximo = Math.max(maximo, r[1]);
                suma += r[1];
            } catch (Exception e) {
                errores++;
            }
        }
        long total = (System.nanoTime() - inicioTotal) / 1_000_000;
        pool.shutdown();
        Resultado res = new Resultado(usuarios.size(), conAvisos, correctas, incorrectas, errores,
                suma / Math.max(1, correctas + incorrectas), maximo, total);

        System.out.println();
        System.out.println("[EVIDENCIA] " + tc + " · " + consultas + " consultas simultáneas entre " + usuarios.size()
                + " usuarios reales (" + conAvisos + " con avisos en su campana)");
        for (Usuario u : usuarios)
            System.out.println("[EVIDENCIA]   " + u.rol() + " " + u.id() + " -> contador esperado: " + referencia.get(u.id()).size());
        System.out.println("[EVIDENCIA]   Respuestas iguales a las de su usuario: " + correctas
                + " · distintas: " + incorrectas + " · con error: " + errores);
        System.out.println("[EVIDENCIA]   Tiempo por consulta: promedio " + res.promedio() + " ms · máximo " + maximo
                + " ms · total " + total + " ms");
        System.out.println();
        return res;
    }

    @Test
    @DisplayName("TC-314 · 100 consultas a la vez a la campana devuelven a cada usuario su propio contador")
    void cienConsultasALaVezDevuelvenSuContador() throws Exception {
        List<Usuario> usuarios = usuariosReales(10, 5, 5);
        assertFalse(usuarios.isEmpty(), "Debe haber usuarios con grupos en el semestre actual");
        Resultado r = consultasSimultaneas("TC-314", usuarios, 100);
        assertTrue(r.conAvisos() > 0, "Al menos un usuario debe tener avisos, si no la prueba no compara nada");
        assertEquals(0, r.errores(), "Ninguna consulta debe fallar");
        assertEquals(100, r.correctas(), "Cada consulta debe devolver la misma lista (y el mismo contador) que su usuario ve solo");
    }

    @Test
    @DisplayName("Estrés · Con 500 consultas a la vez a la campana nadie recibe avisos de otro usuario")
    void quinientasConsultasNadieRecibeAvisosDeOtro() throws Exception {
        List<Usuario> usuarios = usuariosReales(20, 10, 10);
        assertFalse(usuarios.isEmpty(), "Debe haber usuarios con grupos en el semestre actual");
        Resultado r = consultasSimultaneas("Estrés", usuarios, 500);
        assertTrue(r.conAvisos() > 0, "Al menos un usuario debe tener avisos, si no la prueba no compara nada");
        // En estrés se acepta que alguna consulta falle por sobrecarga, pero ninguna puede devolver avisos ajenos
        assertEquals(0, r.incorrectas(), "Ninguna consulta debe devolver avisos de otro usuario");
    }
}