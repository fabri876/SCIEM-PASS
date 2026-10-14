package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CargaMasivaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.GrupoService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doCallRealMethod;

/**
 * TC-040: se simula que el servidor falla a mitad de la carga (en la segunda fila).
 * Esta prueba NO usa una transacción de prueba: la carga se guarda o se deshace sola,
 * como en el sistema real. Si por un error algo quedara guardado, se borra al final.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@DisplayName("HU01 · Carga masiva con falla del servidor (pruebas de integración)")
class CargaMasivaFallaServidorTest {

    @MockitoSpyBean GrupoService grupoService;

    @Autowired CargaMasivaService cargaMasivaService;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired EstudianteGrupoRepository estudianteGrupoRepository;
    @Autowired GrupoRepository grupoRepository;
    @Autowired PlatformTransactionManager transactionManager;

    private Usuario admin;
    private final List<String> correos = new java.util.ArrayList<>();

    @BeforeEach
    void iniciarSesionComoAdministrador() {
        admin = usuarioRepository.findById(adminRepository.findAll().getFirst().getIdusuario()).orElseThrow();
        UsernamePasswordAuthenticationToken sesion = new UsernamePasswordAuthenticationToken(
                admin.getCorreousuario(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")));
        sesion.setDetails(admin.getIdusuario());
        SecurityContextHolder.getContext().setAuthentication(sesion);
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
        // Solo por seguridad: si algo hubiera quedado guardado, se borra.
        new TransactionTemplate(transactionManager).executeWithoutResult(estado -> {
            for (String correo : correos) {
                usuarioRepository.findByCorreousuario(correo).ifPresent(u -> {
                    estudianteGrupoRepository.deleteAll(estudianteGrupoRepository.findByIdUsuario(u.getIdusuario()));
                    estudianteRepository.findByIdusuario(u.getIdusuario()).ifPresent(estudianteRepository::delete);
                    usuarioRepository.delete(u);
                });
            }
        });
    }

    @Test
    @DisplayName("TC-040 (C42) · Si el servidor falla al guardar no se guarda nada")
    void fallaDelServidor_noGuardaNada() throws Exception {
        Grupo grupo = grupoRepository.findAll().stream().filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).findFirst().orElseThrow();
        Random azar = new Random();
        String[][] filas = new String[2][];
        for (int i = 0; i < 2; i++) {
            String correo = "qa.falla" + azar.nextInt(1_000_000) + "@test.com";
            correos.add(correo);
            filas[i] = new String[]{String.valueOf(209800000 + azar.nextInt(100000)), correo, "96" + (10000 + azar.nextInt(90000)),
                    "Prueba Falla", "QA Masiva", "70000000"};
        }
        // La primera inscripción funciona; en la segunda el servidor "falla".
        doCallRealMethod()
                .doThrow(new RuntimeException("Falla simulada del servidor"))
                .when(grupoService).inscribirEstudianteAGrupo(any(), any(), any());

        RuntimeException error = assertThrows(RuntimeException.class, () -> cargaMasivaService.procesarCargaMasiva(
                excel(filas), "ESTUDIANTE", admin.getCorreousuario(), "QA-PRUEBA-INTEGRACION", grupo.getIdGrupo()));

        boolean primeraGuardada = usuarioRepository.findByCorreousuario(correos.get(0)).isPresent();
        boolean segundaGuardada = usuarioRepository.findByCorreousuario(correos.get(1)).isPresent();
        System.out.println("[EVIDENCIA TC-040] Falla en la fila 2 → error: \"" + error.getMessage() + "\" · fila 1 guardada: "
                + primeraGuardada + " · fila 2 guardada: " + segundaGuardada);

        assertAll(
                () -> assertFalse(primeraGuardada, "La primera fila no debe quedar guardada a medias"),
                () -> assertFalse(segundaGuardada, "La segunda fila no debe guardarse")
        );
    }

    private MockMultipartFile excel(String[][] filas) throws Exception {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet();
            String[] encabezados = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"};
            var encabezado = hoja.createRow(0);
            for (int c = 0; c < encabezados.length; c++) encabezado.createCell(c).setCellValue(encabezados[c]);
            for (int f = 0; f < filas.length; f++) {
                var fila = hoja.createRow(f + 1);
                for (int c = 0; c < filas[f].length; c++) fila.createCell(c).setCellValue(filas[f][c]);
            }
            libro.write(salida);
            return new MockMultipartFile("archivo", "carga-qa.xlsx", "application/octet-stream", salida.toByteArray());
        }
    }
}
