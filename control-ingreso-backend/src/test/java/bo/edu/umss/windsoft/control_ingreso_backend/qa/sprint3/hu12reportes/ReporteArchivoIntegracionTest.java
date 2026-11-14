package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint3.hu12reportes;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ReporteAsistenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;

/**
 * HU12 · Reportes de asistencia (contenido del PDF y del Excel que genera el servidor).
 *
 * Se usa el servicio real que arma el reporte, pero todos los datos de prueba (examen, aulas, estudiantes,
 * habilitaciones e ingresos) se crean en tablas TEMPORALES dentro de una transacción que SIEMPRE se deshace.
 * No se escribe nada en las tablas reales.
 *
 * TC-012 (archivo), TC-063, TC-064, TC-065, TC-066, TC-155, TC-247.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@DisplayName("HU12 · Reporte de asistencia (archivos PDF y Excel)")
class ReporteArchivoIntegracionTest {

    private static final int EXAMEN = 9001, ASIGNATURA = 9101, TIPO = 9401, GRUPO = 9501, DOCENTE = 9, OPERADOR = 8;
    private static final int AULA_A = 9201, AULA_B = 9202, AMB_A = 9301, AMB_B = 9302;
    private static final List<String> TABLAS = List.of("semestre", "examen", "habilitacion", "estudiante", "usuario",
            "ambiente", "aula", "cambioambiente", "ingreso", "credencial", "asignatura", "tipoexamen", "grupo");
    private static final String[][] NOMBRES = {
            {"Daniela", "Arce Guzmán"}, {"Camila", "Ramos Villarroel"}, {"Sebastián", "Herrera Condori"},
            {"Joaquín", "Soria Mendoza"}, {"Mateo", "Zurita Paredes"}, {"Andrea", "Quiroga Salinas"},
            {"Diego", "Medina Flores"}, {"Valentina", "Rocha Céspedes"}, {"Rodrigo", "Aguilar Torrico"},
            {"Lucía", "Cabrera Antezana"}};

    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired ReporteAsistenciaService reportes;
    @Autowired AsignacionIngresoService listaOficial;
    @PersistenceContext EntityManager em;

    private final ContextoUsuarioService.UsuarioActual docente =
            new ContextoUsuarioService.UsuarioActual(DOCENTE, "docente060@example.test", "DOCENTE");

    // ------------------------------------------------------------ datos de prueba

    private static int idUsuario(int i) { return 70_000 + i; }
    private static int sis(int i) { return 202_690_000 + i; }

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

    /** Examen ya finalizado (ayer) de Introducción a la Programación, Grupo 6, con N estudiantes habilitados. */
    private void crearExamen(int estudiantes, boolean dosAulas) {
        jdbc.execute("INSERT INTO pg_temp.semestre (idsemestre, estado) VALUES (1, 'ACTUAL')");
        jdbc.update("INSERT INTO pg_temp.asignatura (idasignatura, nombreasignatura) VALUES (?, 'INTRODUCCION A LA PROGRAMACION')", ASIGNATURA);
        jdbc.update("INSERT INTO pg_temp.tipoexamen (idtipoexamen, nombretipoexamen) VALUES (?, 'Segunda Instancia')", TIPO);
        jdbc.update("INSERT INTO pg_temp.grupo (idgrupo, idasignatura, nombregrupo) VALUES (?, ?, '6')", GRUPO, ASIGNATURA);
        jdbc.update("INSERT INTO pg_temp.usuario (idusuario, ciusuario, nombreusuario, apellidousuario) VALUES (?, '6060606', 'Carla', 'Salazar Serrudo')", DOCENTE);
        jdbc.update("INSERT INTO pg_temp.examen (idexamen, idasignatura, idsemestre, idusuario, idtipoexamen, idgrupo, estadoexamen, fechaexamen)"
                + " VALUES (?, ?, 1, ?, ?, ?, true, CURRENT_DATE - 1)", EXAMEN, ASIGNATURA, DOCENTE, TIPO, GRUPO);
        jdbc.update("INSERT INTO pg_temp.aula (idaula, nombreaula, capacidadaula, ubicacionaula, estadoaula) VALUES (?, 'Aula 691B', 100, 'Edificio de prueba', true)", AULA_A);
        jdbc.update("INSERT INTO pg_temp.ambiente (idambiente, idexamen, idasignatura, idaula, horainicio, horafin) VALUES (?, ?, ?, ?, '13:50', '19:50')", AMB_A, EXAMEN, ASIGNATURA, AULA_A);
        if (dosAulas) {
            jdbc.update("INSERT INTO pg_temp.aula (idaula, nombreaula, capacidadaula, ubicacionaula, estadoaula) VALUES (?, 'Aula 692A', 100, 'Edificio de prueba', true)", AULA_B);
            jdbc.update("INSERT INTO pg_temp.ambiente (idambiente, idexamen, idasignatura, idaula, horainicio, horafin) VALUES (?, ?, ?, ?, '13:50', '19:50')", AMB_B, EXAMEN, ASIGNATURA, AULA_B);
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
        jdbc.batchUpdate("INSERT INTO pg_temp.habilitacion (idhabilitacion, codsisestudiante, idexamen, idasignatura, estadohabilitacion) VALUES (?, ?, ?, ?, true)", hab);
    }

    private void inhabilitar(int i, String motivo) {
        jdbc.update("UPDATE pg_temp.habilitacion SET estadohabilitacion = false, observacionhabilitacion = ? WHERE codsisestudiante = ?", motivo, sis(i));
    }

    private void registrarIngreso(int idIngreso, int i, String hora, String tipo) {
        jdbc.update("INSERT INTO pg_temp.ingreso (idingreso, est_idusuario, codsisestudiante, idasignatura, idexamen, idambiente,"
                        + " idusuario, fechaingreso, horaingreso, tipoingreso, metodo_ingreso, audit_flag)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE - 1, (CURRENT_DATE - 1) + TIME '" + hora + "', '" + tipo + "', 'MANUAL', false)",
                idIngreso, idUsuario(i), sis(i), ASIGNATURA, EXAMEN, AMB_A, OPERADOR);
    }

    private byte[] generar(String formato, String... secciones) {
        em.flush();
        em.clear();
        return reportes.generar(EXAMEN, formato, Set.of(secciones), docente);
    }

    private static String textoPdf(byte[] pdf) {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(doc);
        } catch (Exception e) {
            throw new AssertionError("El PDF no se pudo abrir: " + e.getMessage(), e);
        }
    }

    private static int paginasPdf(byte[] pdf) {
        try (PDDocument doc = Loader.loadPDF(pdf)) { return doc.getNumberOfPages(); } catch (Exception e) { return -1; }
    }

    private static Workbook excel(byte[] xlsx) {
        try { return new XSSFWorkbook(new ByteArrayInputStream(xlsx)); }
        catch (Exception e) { throw new AssertionError("El Excel no se pudo abrir: " + e.getMessage(), e); }
    }

    private static List<List<String>> filas(Sheet hoja) {
        List<List<String>> r = new ArrayList<>();
        for (Row row : hoja) {
            List<String> celdas = new ArrayList<>();
            for (Cell c : row) celdas.add(c.toString());
            r.add(celdas);
        }
        return r;
    }

    private static List<String> filaQueEmpiezaCon(Sheet hoja, String inicio) {
        return filas(hoja).stream().filter(f -> !f.isEmpty() && f.get(0).equals(inicio)).findFirst().orElse(List.of());
    }

    private static String textoExcel(Workbook wb) {
        StringBuilder sb = new StringBuilder();
        wb.forEach(h -> filas(h).forEach(f -> sb.append(String.join(" ", f)).append('\n')));
        return sb.toString();
    }

    private void enTransaccionDeshecha(Consumer<Void> prueba) {
        new TransactionTemplate(transactionManager).executeWithoutResult(estado -> {
            estado.setRollbackOnly();
            crearTablasTemporales();
            prueba.accept(null);
        });
    }

    /** 6 estudiantes: 2 ingresaron, 2 ausentes, 1 inhabilitado y 1 inhabilitado que entró con ingreso excepcional. */
    private void examenDeSeis() {
        crearExamen(6, false);
        registrarIngreso(1, 1, "14:02:53.611208", "NORMAL");
        registrarIngreso(2, 2, "14:29:15", "NORMAL");
        inhabilitar(5, "copia en el primer parcial");
        inhabilitar(6, "deuda de laboratorio");
        registrarIngreso(3, 6, "14:40:00", "EXCEPCIONAL");
    }

    // ---------------------------------------------------------------- pruebas

    @Test
    @DisplayName("TC-012 · (archivo) Sin inscritos, el % de asistencia del archivo es 0%")
    void porcentajeSinInscritos() {
        enTransaccionDeshecha(v -> {
            crearExamen(0, false);
            List<String> total = filaQueEmpiezaCon(excel(generar("xlsx", "resumen")).getSheet("Resumen"), "Total");
            System.out.println("\n[EVIDENCIA] TC-012 · Examen sin inscritos · fila \"Total\" del Excel: " + total + " (esperado: 0 inscritos y 0%)\n");
            assertEquals("0", total.get(1));
            assertEquals("0%", total.get(5));
        });
    }

    @Test
    @DisplayName("TC-063 · Las listas del reporte traen SIS, C.I., aula, estado y motivo de cada estudiante")
    void listasConTodosLosEstudiantes() {
        enTransaccionDeshecha(v -> {
            crearExamen(80, true);
            for (int i = 1; i <= 40; i++) registrarIngreso(i, i, "14:30:00", "NORMAL");
            for (int i = 71; i <= 80; i++) inhabilitar(i, "deuda de laboratorio");
            byte[] pdf = generar("pdf", "asistentes", "ausentes", "inhabilitados");
            String texto = textoPdf(pdf);
            long enPdf = java.util.stream.IntStream.rangeClosed(1, 80).filter(i -> texto.contains(String.valueOf(sis(i)))).count();
            List<List<String>> detalle = filas(excel(generar("xlsx", "asistentes", "ausentes", "inhabilitados")).getSheet("Detalle"));
            List<String> columnasExcel = detalle.get(1);
            long enExcel = detalle.size() - 2;
            System.out.println("\n[EVIDENCIA] TC-063 · Examen de 80 estudiantes (40 asistieron, 30 ausentes, 10 inhabilitados) en 2 aulas");
            System.out.println("[EVIDENCIA]   PDF: " + paginasPdf(pdf) + " página(s) · estudiantes que aparecen: " + enPdf + " de 80 (esperado: 80)");
            System.out.println("[EVIDENCIA]   PDF, ¿aparece la sección \"Ausentes\"?: " + (texto.contains("Ausentes") ? "sí" : "no")
                    + " · ¿aparece la sección \"Inhabilitados\"?: " + (texto.contains("Inhabilitados") ? "sí" : "no"));
            System.out.println("[EVIDENCIA]   Excel, columnas de la hoja \"Detalle\": " + columnasExcel + " · estudiantes: " + enExcel + " de 80\n");
            assertEquals(80, enExcel, "El Excel debe listar a los 80 estudiantes");
            assertEquals(80, enPdf, "El PDF debe listar a los 80 estudiantes, pero se corta al llenarse la primera página");
        });
    }

    @Test
    @DisplayName("TC-064 · \"Descargar reporte\" genera un PDF o un Excel que se abre sin errores")
    void archivosSeAbren() {
        enTransaccionDeshecha(v -> {
            examenDeSeis();
            byte[] pdf = generar("pdf", "resumen", "asistentes", "ausentes", "inhabilitados");
            byte[] xlsx = generar("xlsx", "resumen", "asistentes", "ausentes", "inhabilitados");
            int paginas = paginasPdf(pdf);
            int hojas;
            try (Workbook wb = excel(xlsx)) { hojas = wb.getNumberOfSheets(); } catch (Exception e) { throw new AssertionError(e); }
            System.out.println("\n[EVIDENCIA] TC-064 · PDF: " + pdf.length + " bytes, se abre con " + paginas + " página(s) · Excel: " + xlsx.length
                    + " bytes, se abre con " + hojas + " hoja(s)\n");
            assertTrue(paginas >= 1);
            assertTrue(hojas >= 1);
        });
    }

    @Test
    @DisplayName("TC-065 · Los números del archivo coinciden con la tabla \"Resumen\" de la pantalla")
    void numerosCoincidenConPantalla() {
        enTransaccionDeshecha(v -> {
            examenDeSeis();
            em.flush(); em.clear();
            // La pantalla cuenta con la Lista oficial: un estudiante con "habilitado = false" es Inhabilitado,
            // aunque haya entrado (misma regla que estadoFila en SeccionReportesAsistencia.jsx).
            List<EstudianteListaOficialDTO> lista = listaOficial.obtenerListaOficial(EXAMEN, "");
            long inh = lista.stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado()) || Boolean.FALSE.equals(f.getHabilitado())).count();
            long asi = lista.stream().filter(f -> "INGRESO".equalsIgnoreCase(f.getEstado()) && !Boolean.FALSE.equals(f.getHabilitado())).count();
            List<String> pantalla = List.of(String.valueOf(lista.size()), String.valueOf(asi), String.valueOf(lista.size() - asi - inh), String.valueOf(inh));
            List<String> archivo = filaQueEmpiezaCon(excel(generar("xlsx", "resumen")).getSheet("Resumen"), "Total").subList(1, 5);
            System.out.println("\n[EVIDENCIA] TC-065 · 6 estudiantes: 2 ingresaron, 2 ausentes, 1 inhabilitado y 1 inhabilitado que entró con ingreso excepcional");
            System.out.println("[EVIDENCIA]   Pantalla, fila \"Total\" (Inscritos · Asistieron · Ausentes · Inhabilitados): " + String.join(" · ", pantalla));
            System.out.println("[EVIDENCIA]   Archivo, fila \"Total\"  (Inscritos · Asistieron · Ausentes · Inhabilitados): " + String.join(" · ", archivo) + "\n");
            assertEquals(pantalla, archivo, "El archivo debe tener los mismos números que la pantalla");
        });
    }

    @Test
    @DisplayName("TC-066 · Las horas de ingreso del archivo coinciden con las registradas en el sistema")
    void horasCoinciden() {
        enTransaccionDeshecha(v -> {
            examenDeSeis();
            String registrada = jdbc.queryForObject("SELECT to_char(horaingreso, 'HH24:MI:SS') FROM pg_temp.ingreso WHERE idingreso = 1", String.class);
            List<String> filaExcel = filas(excel(generar("xlsx", "asistentes")).getSheet("Detalle")).stream()
                    .filter(f -> f.size() > 1 && f.get(1).equals(String.valueOf(sis(1)))).findFirst().orElseThrow();
            String horaExcel = filaExcel.get(5);
            String textoPdf = textoPdf(generar("pdf", "asistentes"));
            boolean enPdf = textoPdf.contains(registrada.substring(0, 5));
            System.out.println("\n[EVIDENCIA] TC-066 · Hora registrada de Daniela Arce: " + registrada);
            System.out.println("[EVIDENCIA]   En el Excel: \"" + horaExcel + "\" · en el PDF aparece " + registrada.substring(0, 5) + ": " + (enPdf ? "sí" : "no") + "\n");
            assertTrue(horaExcel.startsWith(registrada), "La hora del Excel debe ser la hora registrada");
            assertTrue(enPdf, "La hora del PDF debe ser la hora registrada");
        });
    }

    @Test
    @DisplayName("TC-155 · El archivo trae SCIEM-PASS, examen, docente, quién lo generó y resultados por aula")
    void encabezadoDelArchivo() {
        enTransaccionDeshecha(v -> {
            crearExamen(10, true);
            for (int i = 1; i <= 6; i++) registrarIngreso(i, i, "14:30:00", "NORMAL");
            String pdf = textoPdf(generar("pdf", "resumen"));
            String xlsx = textoExcel(excel(generar("xlsx", "resumen")));
            String[] partes = {"SCIEM-PASS", "Segunda Instancia", "Docente: Carla Salazar Serrudo", "Generado por: Carla Salazar Serrudo", "Aula 691B", "Aula 692A"};
            List<String> faltanPdf = new ArrayList<>(), faltanExcel = new ArrayList<>();
            for (String p : partes) { if (!pdf.contains(p)) faltanPdf.add(p); if (!xlsx.contains(p)) faltanExcel.add(p); }
            System.out.println("\n[EVIDENCIA] TC-155 · Datos buscados: " + String.join(" · ", partes));
            System.out.println("[EVIDENCIA]   Faltan en el PDF: " + (faltanPdf.isEmpty() ? "ninguno" : faltanPdf));
            System.out.println("[EVIDENCIA]   Faltan en el Excel: " + (faltanExcel.isEmpty() ? "ninguno" : faltanExcel) + "\n");
            assertTrue(faltanPdf.isEmpty(), "Al PDF le falta: " + faltanPdf);
            assertTrue(faltanExcel.isEmpty(), "Al Excel le falta: " + faltanExcel);
        });
    }

    @Test
    @DisplayName("TC-247 · El archivo trae solo las secciones marcadas en \"Contenido del reporte\"")
    void soloSeccionesMarcadas() {
        enTransaccionDeshecha(v -> {
            examenDeSeis();
            String pdf = textoPdf(generar("pdf", "ausentes"));
            boolean pdfOk = pdf.contains("Ausentes") && !pdf.contains("Resumen") && !pdf.contains("Asistentes") && !pdf.contains("Inhabilitados");
            Workbook wb = excel(generar("xlsx", "ausentes"));
            List<String> hojas = new ArrayList<>();
            wb.forEach(h -> hojas.add(h.getSheetName()));
            List<List<String>> detalle = filas(wb.getSheet("Detalle"));
            boolean soloAusentes = detalle.stream().skip(2).allMatch(f -> f.get(4).equals("AUSENTE"));
            System.out.println("\n[EVIDENCIA] TC-247 · Marcada solo \"Lista de ausentes\"");
            System.out.println("[EVIDENCIA]   PDF con solo la sección Ausentes: " + (pdfOk ? "sí" : "no"));
            System.out.println("[EVIDENCIA]   Excel · hojas: " + hojas + " · filas de \"Detalle\": " + (detalle.size() - 2) + " · todas AUSENTE: " + (soloAusentes ? "sí" : "no") + "\n");
            assertTrue(pdfOk);
            assertEquals(List.of("Detalle"), hojas);
            assertTrue(soloAusentes);
        });
    }
}