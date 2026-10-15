package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CargaMasivaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.GrupoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaVistaPreviaDto;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
 * Pruebas de estrés de la HU01 (carga masiva) desde el backend local, contra la base de datos real.
 * NO guardan nada en la base de datos:
 * - TC-307 solo usa la vista previa (lee el archivo; no guarda).
 * - TC-308 hace las 10 cargas dentro de transacciones que se deshacen siempre (rollback).
 * Solo quedan las líneas de auditoría "CARGA_MASIVA_USUARIOS" de TC-308, que el sistema guarda aparte.
 * Se usan 25 conexiones solo en esta prueba, para que 10 cargas a la vez no se traben por falta de conexiones (BUG-18).
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off",
        "spring.datasource.hikari.maximum-pool-size=25"})
@ActiveProfiles("local")
@DisplayName("HU01 · Carga masiva (pruebas de estrés)")
class CargaMasivaEstresTest {

    private static final String IP_LOCAL = "127.0.0.1";
    private static final long MAX_ARCHIVO = 10L * 1024 * 1024;

    private static final String[] NOMBRES = {
            "Mariana", "Jorge", "Lucía", "Andrés", "Valeria", "Carlos", "Camila", "Luis", "Daniela", "Miguel",
            "Gabriela", "José", "Natalia", "Fernando", "Sofía", "Ricardo", "Paula", "Sergio", "Andrea", "Javier",
            "Fabiola", "Marcelo", "Carolina", "Diego", "Vanessa", "Rodrigo", "Patricia", "Álvaro", "Mónica", "Gonzalo",
            "Verónica", "Hugo", "Claudia", "Raúl", "Elena", "Mauricio", "Silvia", "Óscar", "Rocío", "Iván"};
    private static final String[] APELLIDOS = {
            "López", "Vargas", "Rojas", "Mendoza", "Gutiérrez", "Fernández", "Quispe", "Mamani", "Flores", "Torrez",
            "Choque", "Romero", "Herrera", "Salazar", "Castillo", "Ortiz", "Morales", "Suárez", "Peña", "Rivera",
            "Montaño", "Villarroel", "Zurita", "Arce", "Camacho", "Paredes", "Soria", "Terrazas", "Ugarte", "Vega",
            "Aguirre", "Barrientos", "Cabrera", "Delgado", "Escobar", "Fuentes", "Guzmán", "Iriarte", "Jiménez", "Lara",
            "Medina", "Navarro", "Orellana", "Pinto", "Ramírez", "Saavedra", "Tapia", "Urquidi", "Valdez", "Zambrana"};

    @Autowired CargaMasivaService cargaMasivaService;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired GrupoRepository grupoRepository;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;

    private Usuario admin;

    /** Estudiante inventado con nombre común y correo @gmail.com. */
    private record Persona(int sis, String correo, String ci, String apellidos, String nombres, int telefono) {}

    /** Resultado de una de las 10 cargas simultáneas. */
    private record Carga(int numero, long msCarga, long finCarga, String resultado) {}

    @BeforeEach
    void iniciarSesionComoAdministrador() {
        admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
        SecurityContextHolder.getContext().setAuthentication(sesionAdmin());
    }

    @AfterEach
    void cerrarSesion() {
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

    private Grupo grupoActivo() {
        return grupoRepository.findAll().stream().filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay grupos activos para la prueba."));
    }

    private static String sinTildes(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase();
    }

    /** La persona número n (las mismas que usan las demás pruebas de carga). */
    private static Persona persona(int n) {
        String nombre = NOMBRES[n % NOMBRES.length];
        int i1 = (n / NOMBRES.length) % APELLIDOS.length;
        int i2 = (i1 + 1 + (n % 7)) % APELLIDOS.length;
        int vuelta = n / (NOMBRES.length * APELLIDOS.length);
        String correo = sinTildes(nombre) + "." + sinTildes(APELLIDOS[i1]) + "." + sinTildes(APELLIDOS[i2])
                + (vuelta > 0 ? String.valueOf(vuelta) : "") + "@gmail.com";
        return new Persona(202650000 + n, correo, String.valueOf(6100000 + n),
                APELLIDOS[i1] + " " + APELLIDOS[i2], nombre, 71000000 + n);
    }

    /** Excel en memoria con las columnas de la plantilla de estudiantes (escrito por partes para no gastar memoria). */
    private static byte[] excel(int desde, int cantidad) throws Exception {
        try (SXSSFWorkbook libro = new SXSSFWorkbook(1000); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet("Estudiantes");
            String[] encabezados = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"};
            var encabezado = hoja.createRow(0);
            for (int c = 0; c < encabezados.length; c++) encabezado.createCell(c).setCellValue(encabezados[c]);
            for (int f = 0; f < cantidad; f++) {
                Persona p = persona(desde + f);
                var fila = hoja.createRow(f + 1);
                fila.createCell(0).setCellValue(p.sis());
                fila.createCell(1).setCellValue(p.correo());
                fila.createCell(2).setCellValue(p.ci());
                fila.createCell(3).setCellValue(p.apellidos());
                fila.createCell(4).setCellValue(p.nombres());
                fila.createCell(5).setCellValue(p.telefono());
            }
            libro.write(salida);
            return salida.toByteArray();
        }
    }

    private static MockMultipartFile archivo(String nombre, byte[] datos) {
        return new MockMultipartFile("archivo", nombre,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", datos);
    }

    private static String mb(long bytes) {
        return String.format("%.2f MB", bytes / 1024.0 / 1024.0);
    }

    private static void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-307 (C57) · Un Excel de 10 MB con miles de filas se procesa sin caídas")
    void excelDe10Mb_seProcesaSinCaidas() throws Exception {
        Grupo grupo = grupoActivo();

        // 1. Excel de casi 10 MB (se ajusta la cantidad de filas hasta quedar entre 9,3 y 9,8 MB)
        long objetivo = (long) (9.8 * 1024 * 1024);
        int filas = 150_000;
        byte[] datos = excel(0, filas);
        for (int intento = 0; intento < 4 && (datos.length > objetivo || datos.length < objetivo * 0.95); intento++) {
            filas = (int) (filas * (objetivo * 0.98 / datos.length));
            datos = excel(0, filas);
        }
        assertTrue(datos.length <= MAX_ARCHIVO, "El archivo de prueba debe quedar por debajo de 10 MB");

        // 2. Vista previa (lee el archivo completo; no guarda nada), midiendo tiempo y memoria
        Runtime rt = Runtime.getRuntime();
        System.gc();
        long memoriaAntes = rt.totalMemory() - rt.freeMemory();
        AtomicLong memoriaMaxima = new AtomicLong(memoriaAntes);
        AtomicBoolean midiendo = new AtomicBoolean(true);
        Thread medidor = new Thread(() -> {
            while (midiendo.get()) {
                memoriaMaxima.accumulateAndGet(rt.totalMemory() - rt.freeMemory(), Math::max);
                try { Thread.sleep(20); } catch (InterruptedException e) { return; }
            }
        });
        medidor.start();
        CargaMasivaVistaPreviaDto vista = null;
        Throwable caida = null;
        long inicio = System.nanoTime();
        try {
            vista = cargaMasivaService.previsualizar(archivo("estudiantes-10mb.xlsx", datos), "ESTUDIANTE",
                    admin.getCorreousuario(), grupo.getIdGrupo());
        } catch (Throwable t) {
            caida = t;
        } finally {
            midiendo.set(false);
            medidor.join();
        }
        long ms = (System.nanoTime() - inicio) / 1_000_000;
        int leidas = vista == null ? 0 : vista.filas().size();

        // Si no se pudo leer: se abre el mismo archivo igual que lo hace el sistema, para conocer la causa real
        String causaReal = "";
        if (caida != null) {
            try (var libro = WorkbookFactory.create(new ByteArrayInputStream(datos))) {
                causaReal = " · Causa real: el archivo se abre bien por fuera (" + libro.getSheetAt(0).getLastRowNum() + " filas)";
            } catch (Throwable t) {
                causaReal = " · Causa real (al abrir el Excel como lo hace el sistema): " + t.getClass().getSimpleName()
                        + ": " + t.getMessage();
            }
        }

        // Control: un Excel chico con exactamente el mismo formato (1000 filas) sí debe leerse
        String control;
        try {
            int filasControl = cargaMasivaService.previsualizar(archivo("control-1000.xlsx", excel(0, 1000)), "ESTUDIANTE",
                    admin.getCorreousuario(), grupo.getIdGrupo()).filas().size();
            control = "se leyó bien (" + filasControl + " filas)";
        } catch (Throwable t) {
            control = "tampoco se pudo leer (" + t.getMessage() + ")";
        }

        // 3. Un archivo de 10,5 MB debe rechazarse con un mensaje claro (sin error interno)
        byte[] grande = new byte[(int) (10.5 * 1024 * 1024)];
        String rechazo;
        try {
            cargaMasivaService.previsualizar(archivo("estudiantes-10-5mb.xlsx", grande), "ESTUDIANTE",
                    admin.getCorreousuario(), grupo.getIdGrupo());
            rechazo = "(no se rechazó)";
        } catch (SolicitudInvalidaException e) {
            rechazo = "rechazado con el mensaje \"" + e.getMessage() + "\"";
        } catch (Throwable t) {
            rechazo = "error interno: " + t.getClass().getSimpleName() + " " + t.getMessage();
        }
        final String rechazoFinal = rechazo;

        evidencia("TC-307", "Excel de " + mb(datos.length) + " con " + filas + " filas · Vista previa: "
                + (caida == null ? "terminó sin errores, " + leidas + " filas leídas"
                        : "NO SE PUDO LEER (" + caida.getClass().getSimpleName() + ")" + " " + caida.getMessage())
                + " · Tiempo: " + String.format("%.2f", ms / 1000.0) + " s · Memoria usada: antes " + mb(memoriaAntes)
                + ", máxima " + mb(memoriaMaxima.get()) + " (disponible " + mb(rt.maxMemory()) + ") · "
                + causaReal + " · Excel de control con el mismo formato y 1000 filas: " + control
                + " · Archivo de 10,50 MB: " + rechazoFinal + " · No se guardó nada (solo vista previa)");

        assertNull(caida, "El archivo de casi 10 MB debe procesarse sin caídas");
        final int leidasFinal = leidas;
        final int filasFinal = filas;
        assertAll(
                () -> assertEquals(filasFinal, leidasFinal, "Deben leerse todas las filas del archivo"),
                () -> assertTrue(rechazoFinal.startsWith("rechazado") && rechazoFinal.contains("10 MB"),
                        "Un archivo de más de 10 MB debe rechazarse con un mensaje claro")
        );
    }

    @Test
    @DisplayName("TC-308 (C58) · 10 cargas simultáneas con las mismas personas no duplican cuentas")
    void diezCargasSimultaneas_noDuplicanCuentas() throws Exception {
        final int cargas = 10;
        final long esperaMs = 15_000;
        final int desde = 500;
        final int cantidadPersonas = 3;

        Grupo grupo = grupoActivo();
        List<Persona> personas = new ArrayList<>();
        for (int n = desde; n < desde + cantidadPersonas; n++) personas.add(persona(n));

        // Seguro: si alguna de esas personas ya existe, la prueba se detiene sin cargar nada
        List<String> previas = personas.stream()
                .filter(p -> usuarioRepository.existsByCorreousuario(p.correo()) || usuarioRepository.existsByCiusuario(p.ci())
                        || estudianteRepository.findByCodsisestudiante(p.sis()).isPresent())
                .map(Persona::correo).toList();
        assertEquals(List.of(), previas, "Ninguna de las personas de prueba debe existir antes de empezar");

        // Solo lectura: qué reglas de "valor único" tiene la base de datos en usuario y estudiante
        List<String> reglasUnicas = jdbc.queryForList("SELECT tablename || '.' || indexname || ' ' || "
                + "substring(indexdef from '\\((.*)\\)') FROM pg_indexes WHERE schemaname = 'public' "
                + "AND tablename IN ('usuario', 'estudiante') AND indexdef ILIKE 'CREATE UNIQUE%'", String.class);

        byte[] datos = excel(desde, cantidadPersonas);

        // Las 10 cargas arrancan a la vez. Cada una corre en una transacción que se deshace siempre (rollback)
        // y se queda abierta (sin confirmar) hasta que terminen todas o pasen 15 s.
        // - Si la base de datos NO protege, las 10 terminan juntas: se habrían creado 10 veces las mismas personas.
        // - Si SÍ protege, las demás quedan esperando a la primera: solo 1 termina mientras las otras siguen abiertas.
        ExecutorService hilos = Executors.newFixedThreadPool(cargas);
        CountDownLatch largada = new CountDownLatch(1);
        CountDownLatch terminadas = new CountDownLatch(cargas);
        AtomicBoolean yaSeDeshizoAlguna = new AtomicBoolean(false);
        AtomicLong primerDeshacer = new AtomicLong(Long.MAX_VALUE);

        List<Future<Carga>> futuros = new ArrayList<>();
        for (int i = 1; i <= cargas; i++) {
            final int numero = i;
            futuros.add(hilos.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(sesionAdmin());
                largada.await();
                TransactionTemplate transaccion = new TransactionTemplate(transactionManager);
                return transaccion.execute(estado -> {
                    estado.setRollbackOnly();
                    long t0 = System.nanoTime();
                    String resultado;
                    try {
                        CargaMasivaRespuestaDto r = cargaMasivaService.procesarCargaMasiva(
                                archivo("carga-" + numero + ".xlsx", datos), "ESTUDIANTE", admin.getCorreousuario(),
                                IP_LOCAL, grupo.getIdGrupo());
                        resultado = r.getExitosos() + " nuevas, " + r.getFallidos() + " con error";
                    } catch (Exception e) {
                        resultado = "error: " + e.getMessage();
                    }
                    long fin = System.nanoTime();
                    terminadas.countDown();
                    if (!yaSeDeshizoAlguna.get()) {
                        try { terminadas.await(esperaMs, TimeUnit.MILLISECONDS); } catch (InterruptedException ignorada) { }
                    }
                    yaSeDeshizoAlguna.set(true);
                    primerDeshacer.accumulateAndGet(System.nanoTime(), Math::min);
                    return new Carga(numero, (fin - t0) / 1_000_000, fin, resultado);
                });
            }));
        }
        largada.countDown();
        List<Carga> resultados = new ArrayList<>();
        for (Future<Carga> f : futuros) resultados.add(f.get(5, TimeUnit.MINUTES));
        hilos.shutdown();

        long abiertasALaVez = resultados.stream().filter(c -> c.finCarga() < primerDeshacer.get()).count();

        // Comprobación final: no debe quedar ninguna de esas personas en la base de datos
        long quedanUsuarios = personas.stream().filter(p -> usuarioRepository.existsByCorreousuario(p.correo())).count();
        long quedanEstudiantes = personas.stream()
                .filter(p -> estudianteRepository.findByCodsisestudiante(p.sis()).isPresent()).count();

        evidencia("TC-308", cargas + " cargas simultáneas del mismo Excel con " + cantidadPersonas + " personas ("
                + personas.stream().map(p -> p.nombres() + " " + p.apellidos()).collect(Collectors.joining(", ")) + ") · "
                + "Cargas que llegaron a crear a las mismas personas al mismo tiempo: " + abiertasALaVez + " de " + cargas
                + " · Resultado de cada carga: " + resultados.stream().sorted(Comparator.comparingLong(Carga::finCarga))
                        .map(c -> "carga " + c.numero() + " " + String.format("%.2f", c.msCarga() / 1000.0) + " s (" + c.resultado() + ")")
                        .collect(Collectors.joining(" | "))
                + " · Reglas de valor único en la base de datos: " + (reglasUnicas.isEmpty() ? "ninguna" : String.join(" | ", reglasUnicas))
                + " · Quedaron guardados después del rollback: " + quedanUsuarios + " usuarios, " + quedanEstudiantes + " estudiantes");

        assertEquals(0, quedanUsuarios + quedanEstudiantes, "No debe quedar ninguna persona de prueba en la base de datos");
        assertTrue(abiertasALaVez <= 1, "Solo una carga debe poder crear a las mismas personas a la vez "
                + "(" + abiertasALaVez + " de " + cargas + " las crearon al mismo tiempo: se habrían duplicado las cuentas)");
    }
}