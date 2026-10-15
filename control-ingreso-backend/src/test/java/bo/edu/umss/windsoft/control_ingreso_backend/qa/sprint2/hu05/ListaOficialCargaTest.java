package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu05;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

/**
 * TC-298 (parte SERVIDOR) · Lista oficial del aula con 300 estudiantes, contra la base de datos real.
 * Los 300 estudiantes (usuario + estudiante + habilitación en el examen de prueba) se crean dentro de una
 * transacción que SIEMPRE se deshace (rollback): nadie más los ve y no queda nada guardado.
 * Usan números propios (900001 a 900300) en lugar de pedírselos al sistema, así los contadores no cambian.
 * Armar la lista oficial solo consulta: no escribe nada en la base.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off",
        "spring.jpa.properties.hibernate.generate_statistics=true"})
@ActiveProfiles("local")
@DisplayName("HU05 · Lista oficial del aula (pruebas de carga)")
class ListaOficialCargaTest {

    // Examen de prueba: ARQUITECTURA DE COMPUTADORAS I · Segundo parcial (el mismo de las pruebas de sistema)
    private static final int ID_EXAMEN = 824;
    private static final int ID_ASIGNATURA = 2010013;
    private static final int CANTIDAD = 300;
    private static final int PRIMER_ID = 900_001;
    private static final int PRIMER_SIS = 202_690_000;
    private static final int PRIMER_CI = 6_300_000;
    private static final long LIMITE_MS = 2000;

    private static final String[] NOMBRES = {"Mariana", "Jorge", "Lucía", "Andrés", "Valeria", "Carlos", "Camila",
            "Luis", "Daniela", "Miguel", "Gabriela", "José", "Natalia", "Fernando", "Sofía"};
    private static final String[] APELLIDOS = {"López", "Vargas", "Rojas", "Mendoza", "Gutiérrez", "Fernández",
            "Quispe", "Mamani", "Flores", "Torrez", "Paredes", "Salazar", "Herrera", "Choque", "Arce"};

    @Autowired AsignacionIngresoService asignacionIngresoService;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired EntityManagerFactory entityManagerFactory;

    /** Una medición: qué se buscó, cuánto tardó, cuántas filas devolvió y cuántas consultas a la base hizo. */
    private record Medicion(String filtro, long ms, int filas, long consultas) {}

    private static String nombre(int n) { return NOMBRES[n % NOMBRES.length]; }

    private static String apellidos(int n) {
        return APELLIDOS[(n / NOMBRES.length) % APELLIDOS.length] + " " + APELLIDOS[(n + 4) % APELLIDOS.length];
    }

    private static String correo(int n) {
        String base = (nombre(n) + "." + apellidos(n).replace(' ', '.') + (n + 1));
        return java.text.Normalizer.normalize(base, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT) + "@gmail.com";
    }

    private int contar(String sql, Object... args) {
        Integer n = jdbc.queryForObject(sql, Integer.class, args);
        return n == null ? 0 : n;
    }

    /** Comprueba que los números de la prueba estén libres (no pisa a nadie). */
    private void verificarNumerosLibres() {
        assertEquals(1, contar("SELECT count(*) FROM examen WHERE idexamen = ?", ID_EXAMEN), "Debe existir el examen de prueba");
        int ultimo = PRIMER_ID + CANTIDAD - 1;
        assertEquals(0, contar("SELECT count(*) FROM usuario WHERE idusuario BETWEEN ? AND ?", PRIMER_ID, ultimo),
                "Los números de usuario de la prueba deben estar libres");
        assertEquals(0, contar("SELECT count(*) FROM habilitacion WHERE idhabilitacion BETWEEN ? AND ?", PRIMER_ID, ultimo),
                "Los números de habilitación de la prueba deben estar libres");
        assertEquals(0, contar("SELECT count(*) FROM estudiante WHERE codsisestudiante BETWEEN ? AND ?",
                PRIMER_SIS, PRIMER_SIS + CANTIDAD - 1), "Los códigos SIS de la prueba deben estar libres");
        assertEquals(0, contar("SELECT count(*) FROM usuario WHERE length(ciusuario) = 7 AND ciusuario BETWEEN ? AND ?",
                String.valueOf(PRIMER_CI), String.valueOf(PRIMER_CI + CANTIDAD - 1)), "Los C.I. de la prueba deben estar libres");
    }

    /** Crea los 300 estudiantes habilitados dentro de la transacción en curso (se deshacen al terminar). */
    private void crearEstudiantesTemporales() {
        List<Object[]> usuarios = new ArrayList<>();
        List<Object[]> estudiantes = new ArrayList<>();
        List<Object[]> habilitaciones = new ArrayList<>();
        Date hoy = Date.valueOf(LocalDate.now());
        for (int i = 0; i < CANTIDAD; i++) {
            int idUsuario = PRIMER_ID + i;
            int codSis = PRIMER_SIS + i;
            usuarios.add(new Object[]{idUsuario, String.valueOf(PRIMER_CI + i), nombre(i), apellidos(i), 73000000 + i, correo(i), "-", true, 0});
            estudiantes.add(new Object[]{idUsuario, codSis});
            boolean habilitado = i % 30 != 0; // algunos inhabilitados, como en una lista real
            habilitaciones.add(new Object[]{PRIMER_ID + i, codSis, ID_EXAMEN, ID_ASIGNATURA, idUsuario, habilitado, hoy});
        }
        jdbc.batchUpdate("INSERT INTO usuario (idusuario, ciusuario, nombreusuario, apellidousuario, telefonousuario, "
                + "correousuario, contraseniausuario, estadousuario, intentos_fallidos) VALUES (?,?,?,?,?,?,?,?,?)", usuarios);
        jdbc.batchUpdate("INSERT INTO estudiante (idusuario, codsisestudiante) VALUES (?,?)", estudiantes);
        jdbc.batchUpdate("INSERT INTO habilitacion (idhabilitacion, codsisestudiante, idexamen, idasignatura, idusuario, "
                + "estadohabilitacion, fecharegistro) VALUES (?,?,?,?,?,?,?)", habilitaciones);
    }

    /** Arma la lista oficial (como lo pide la pantalla) y mide tiempo, filas y consultas a la base. */
    private Medicion medir(Statistics estadisticas, String filtro) {
        estadisticas.clear();
        long inicio = System.nanoTime();
        List<EstudianteListaOficialDTO> lista = asignacionIngresoService.obtenerListaOficial(ID_EXAMEN, filtro);
        long ms = (System.nanoTime() - inicio) / 1_000_000;
        return new Medicion(filtro, ms, lista.size(), estadisticas.getPrepareStatementCount());
    }

    /** Tiempo de ida y vuelta de una consulta mínima desde esta computadora hasta la base de datos. */
    private long latenciaPromedioMs() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        long inicio = System.nanoTime();
        for (int i = 0; i < 10; i++) jdbc.queryForObject("SELECT 1", Integer.class);
        return (System.nanoTime() - inicio) / 10_000_000;
    }

    @Test
    @DisplayName("TC-298 · La lista oficial con 300 estudiantes se arma y filtra en menos de 2 s (servidor)")
    void listaOficialCon300Estudiantes() {
        Statistics estadisticas = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        estadisticas.setStatisticsEnabled(true);
        int ejemploCi = PRIMER_CI + 150;
        int ejemploSis = PRIMER_SIS + 220;

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        List<Medicion> mediciones = new ArrayList<>();
        long[] latencia = new long[1];
        int[] filasBase = new int[1];
        tx.executeWithoutResult(estado -> {
            estado.setRollbackOnly(); // pase lo que pase, al final se deshace todo
            filasBase[0] = asignacionIngresoService.obtenerListaOficial(ID_EXAMEN, "").size();
            verificarNumerosLibres();
            crearEstudiantesTemporales();
            latencia[0] = latenciaPromedioMs();

            medir(estadisticas, "zzz"); // primera vuelta de calentamiento (no se cuenta)
            mediciones.add(medir(estadisticas, ""));
            mediciones.add(medir(estadisticas, "Paredes"));
            mediciones.add(medir(estadisticas, String.valueOf(ejemploCi)));
            mediciones.add(medir(estadisticas, String.valueOf(ejemploSis)));
        });

        // Después del rollback no debe quedar nada de la prueba
        int quedaron = contar("SELECT count(*) FROM usuario WHERE idusuario BETWEEN ? AND ?", PRIMER_ID, PRIMER_ID + CANTIDAD - 1)
                + contar("SELECT count(*) FROM habilitacion WHERE idhabilitacion BETWEEN ? AND ?", PRIMER_ID, PRIMER_ID + CANTIDAD - 1);

        StringBuilder sb = new StringBuilder("[EVIDENCIA TC-298 servidor] Lista oficial del examen ")
                .append(ID_EXAMEN).append(" · Antes de la prueba tenía ").append(filasBase[0]).append(" estudiante(s); se agregaron ")
                .append(CANTIDAD).append(" temporales · Ida y vuelta de una consulta a la base desde esta computadora: ")
                .append(latencia[0]).append(" ms");
        for (Medicion m : mediciones) {
            sb.append(" · ").append(m.filtro().isEmpty() ? "Sin filtro" : "Filtro \"" + m.filtro() + "\"")
                    .append(" → ").append(m.filas()).append(" fila(s) en ").append(String.format(Locale.ROOT, "%.2f", m.ms() / 1000.0))
                    .append(" s con ").append(m.consultas()).append(" consultas a la base");
        }
        sb.append(" · Datos de la prueba que quedaron guardados: ").append(quedaron);
        System.out.println(sb);

        assertEquals(0, quedaron, "No debe quedar nada guardado de la prueba");
        assertTrue(mediciones.get(0).filas() >= CANTIDAD, "Sin filtro deben salir al menos los 300 estudiantes");
        assertEquals(1, mediciones.get(2).filas(), "El filtro por C.I. debe devolver a un solo estudiante");
        assertEquals(1, mediciones.get(3).filas(), "El filtro por SIS debe devolver a un solo estudiante");
        assertAll(mediciones.stream().map(m -> () -> assertTrue(m.ms() < LIMITE_MS,
                (m.filtro().isEmpty() ? "Sin filtro" : "Filtro \"" + m.filtro() + "\"") + " debe responder en menos de 2 s y tardó "
                        + m.ms() + " ms")));
    }
}