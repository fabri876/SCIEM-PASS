package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CargaMasivaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.GrupoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayOutputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Prueba de carga de la HU01 (carga masiva) contra la base de datos real, desde el backend local.
 * La carga de 500 estudiantes corre dentro de una transacción que SIEMPRE se deshace (rollback):
 * no queda ningún usuario guardado. Al final la prueba lo comprueba buscando los 500 correos.
 * Solo queda la línea de auditoría "CARGA_MASIVA_USUARIOS", que el sistema guarda aparte.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@DisplayName("HU01 · Carga masiva (pruebas de carga)")
class CargaMasivaCargaTest {

    private static final String IP_LOCAL = "127.0.0.1";

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
    @Autowired GrupoRepository grupoRepository;
    @Autowired PlatformTransactionManager transactionManager;

    private Usuario admin;

    /** Estudiante inventado con nombre común y correo @gmail.com. */
    private record Persona(int sis, String correo, String ci, String apellidos, String nombres, int telefono) {}

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

    private static String sinTildes(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase();
    }

    /** Genera estudiantes distintos entre sí (las mismas personas que usan las pruebas de carga del frontend). */
    private static List<Persona> generarEstudiantes(int cantidad) {
        List<Persona> lista = new ArrayList<>();
        for (int n = 0; n < cantidad; n++) {
            String nombre = NOMBRES[n % NOMBRES.length];
            int i1 = (n / NOMBRES.length) % APELLIDOS.length;
            int i2 = (i1 + 1 + (n % 7)) % APELLIDOS.length;
            String correo = sinTildes(nombre) + "." + sinTildes(APELLIDOS[i1]) + "." + sinTildes(APELLIDOS[i2]) + "@gmail.com";
            lista.add(new Persona(202650000 + n, correo, String.valueOf(6100000 + n),
                    APELLIDOS[i1] + " " + APELLIDOS[i2], nombre, 71000000 + n));
        }
        return lista;
    }

    /** Excel en memoria con las columnas de la plantilla de estudiantes. */
    private static MockMultipartFile excel(List<Persona> personas) throws Exception {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet("Estudiantes");
            String[] encabezados = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"};
            var encabezado = hoja.createRow(0);
            for (int c = 0; c < encabezados.length; c++) encabezado.createCell(c).setCellValue(encabezados[c]);
            for (int f = 0; f < personas.size(); f++) {
                Persona p = personas.get(f);
                var fila = hoja.createRow(f + 1);
                fila.createCell(0).setCellValue(p.sis());
                fila.createCell(1).setCellValue(p.correo());
                fila.createCell(2).setCellValue(p.ci());
                fila.createCell(3).setCellValue(p.apellidos());
                fila.createCell(4).setCellValue(p.nombres());
                fila.createCell(5).setCellValue(p.telefono());
            }
            libro.write(salida);
            return new MockMultipartFile("archivo", "estudiantes-500.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", salida.toByteArray());
        }
    }

    private List<String> guardados(List<Persona> personas) {
        return personas.stream().filter(p -> usuarioRepository.existsByCorreousuario(p.correo()))
                .map(Persona::correo).toList();
    }

    private static void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-293 (C51) · Una carga masiva de 500 filas termina en menos de 10 segundos")
    void cargaDe500Filas_terminaEnMenosDe10Segundos() throws Exception {
        final int cantidad = 500;
        final long limiteMs = 10_000;

        Grupo grupo = grupoRepository.findAll().stream()
                .filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay grupos activos para la prueba."));
        List<Persona> personas = generarEstudiantes(cantidad);

        // Seguro: si alguno de los correos ya existe, la prueba se detiene sin cargar nada
        List<String> previos = guardados(personas);
        assertEquals(List.of(), previos, "Ninguno de los correos de prueba debe existir antes de empezar");

        MockMultipartFile archivo = excel(personas);

        // La carga corre en una transacción que se deshace siempre al terminar (rollback)
        TransactionTemplate transaccion = new TransactionTemplate(transactionManager);
        long[] ms = new long[1];
        CargaMasivaRespuestaDto r = transaccion.execute(estado -> {
            estado.setRollbackOnly();
            long inicio = System.nanoTime();
            CargaMasivaRespuestaDto respuesta = cargaMasivaService.procesarCargaMasiva(
                    archivo, "ESTUDIANTE", admin.getCorreousuario(), IP_LOCAL, grupo.getIdGrupo());
            ms[0] = (System.nanoTime() - inicio) / 1_000_000;
            return respuesta;
        });

        // Comprobación después del rollback: no debe quedar ninguno de los 500
        List<String> quedan = guardados(personas);
        String errores = r.getDetallesErrores().stream().limit(3)
                .map(e -> "Fila " + e.getFila() + ": " + e.getErrores()).collect(Collectors.joining(" | "));
        evidencia("TC-293", "Grupo usado: id " + grupo.getIdGrupo() + " (Grupo " + grupo.getNombreGrupo() + ") · "
                + "Archivo: " + cantidad + " filas (" + (archivo.getSize() / 1024) + " KB) · "
                + "Primeros: " + personas.stream().limit(3).map(p -> p.nombres() + " " + p.apellidos()).collect(Collectors.joining(", ")) + " · "
                + "Resultado: \"" + r.getMensaje() + "\" · Procesadas: " + r.getTotalProcesados()
                + ", nuevas: " + r.getExitosos() + ", con error: " + r.getFallidos()
                + (errores.isEmpty() ? "" : " (" + errores + ")") + " · "
                + "Tiempo de la carga: " + String.format("%.2f", ms[0] / 1000.0) + " s (límite " + limiteMs / 1000 + " s) · "
                + "Usuarios de prueba que quedaron guardados después del rollback: " + quedan.size());

        assertEquals(List.of(), quedan, "No debe quedar ningún estudiante de prueba en la base de datos");
        assertAll(
                () -> assertEquals(cantidad, r.getTotalProcesados(), "Deben procesarse las 500 filas"),
                () -> assertEquals(cantidad, r.getExitosos(), "Las 500 filas deben cargarse sin errores"),
                () -> assertTrue(ms[0] < limiteMs, "La carga debe terminar en menos de 10 s (tardó "
                        + String.format("%.2f", ms[0] / 1000.0) + " s)")
        );
    }
}