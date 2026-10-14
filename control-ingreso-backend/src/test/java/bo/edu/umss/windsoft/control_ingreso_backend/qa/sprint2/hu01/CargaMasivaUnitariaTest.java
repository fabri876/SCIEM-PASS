package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuditoriaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CargaMasivaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.GrupoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaErrorFilaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de la carga masiva de estudiantes (HU01).
 * No usan la base de datos: los repositorios se simulan (mocks) y el Excel se arma en memoria.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("HU01 · Carga masiva (pruebas unitarias)")
class CargaMasivaUnitariaTest {

    private static final String ADMIN = "admin@gmail.com";
    private static final int ID_GRUPO = 7;

    @Mock UsuarioRepository usuarios;
    @Mock AdminRepository admins;
    @Mock DocenteRepository docentes;
    @Mock AyudanteRepository ayudantes;
    @Mock EstudianteRepository estudiantes;
    @Mock AsignaturaRepository asignaturas;
    @Mock GrupoRepository grupos;
    @Mock GrupoService grupoService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuditoriaService auditoria;
    @Mock TipoUsuarioResolver roles;

    @InjectMocks CargaMasivaService servicio;

    @BeforeEach
    void prepararAdministrador() {
        Usuario admin = new Usuario();
        admin.setIdusuario(112);
        when(usuarios.findByCorreousuario(ADMIN)).thenReturn(Optional.of(admin));
        when(roles.resolver(112)).thenReturn("ADMINISTRADOR");
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(usuarios.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setIdusuario(500);
            return u;
        });
    }

    /** Excel con el formato de la plantilla de estudiantes (CODSIS, CORREO, CI, APELLIDOS, NOMBRES, TELEFONO). */
    private MockMultipartFile excel(String[]... filas) throws Exception {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet();
            String[] encabezados = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"};
            var filaEncabezado = hoja.createRow(0);
            for (int c = 0; c < encabezados.length; c++) {
                filaEncabezado.createCell(c).setCellValue(encabezados[c]);
            }
            for (int f = 0; f < filas.length; f++) {
                var fila = hoja.createRow(f + 1);
                for (int c = 0; c < filas[f].length; c++) {
                    fila.createCell(c).setCellValue(filas[f][c]);
                }
            }
            libro.write(salida);
            return new MockMultipartFile("archivo", "estudiantes.xlsx", "application/octet-stream", salida.toByteArray());
        }
    }

    @Test
    @DisplayName("TC-006 · La segunda fila con el mismo C.I. se marca como duplicada")
    void segundaFilaConMismoCi_seMarcaDuplicada() throws Exception {
        MockMultipartFile archivo = excel(
                new String[]{"202301901", "qa.dup01@test.com", "9900901", "Prueba Uno", "QA Duplicado", "70000001"},
                new String[]{"202301902", "qa.dup02@test.com", "9900901", "Prueba Dos", "QA Duplicado", "70000002"});

        CargaMasivaRespuestaDto resultado = servicio.procesarCargaMasiva(archivo, "ESTUDIANTE", ADMIN, "127.0.0.1", ID_GRUPO);

        CargaMasivaErrorFilaDto error = resultado.getDetallesErrores().isEmpty() ? null : resultado.getDetallesErrores().get(0);
        System.out.println("[EVIDENCIA TC-006] Nuevos: " + resultado.getExitosos() + " · Fallidos: " + resultado.getFallidos()
                + (error == null ? "" : " · Fila " + error.getFila() + ": " + error.getErrores()));

        assertAll(
                () -> assertEquals(1, resultado.getExitosos(), "La primera fila debe registrarse"),
                () -> assertEquals(1, resultado.getFallidos(), "La segunda fila debe rechazarse"),
                () -> assertNotNull(error, "Debe informarse el error de la fila duplicada"),
                () -> assertEquals(3, error == null ? -1 : error.getFila(), "El error debe ser de la segunda fila de datos (fila 3 del Excel)"),
                () -> assertTrue(error != null && error.getErrores().stream().anyMatch(e -> e.contains("duplicado en el mismo archivo")),
                        "El mensaje debe indicar que el C.I. está duplicado en el archivo"),
                () -> verify(usuarios, times(1)).save(any(Usuario.class))
        );
    }

    @Test
    @DisplayName("TC-007 · Se quitan los espacios sobrantes y el correo se guarda en minúsculas")
    void quitaEspaciosYCorreoEnMinusculas() throws Exception {
        MockMultipartFile archivo = excel(
                new String[]{"202301907", "   QA.Masiva07@TEST.Com   ", "   9900907   ", "   Prueba Siete   ", "   QA Masiva   ", "70000007"});

        CargaMasivaRespuestaDto resultado = servicio.procesarCargaMasiva(archivo, "ESTUDIANTE", ADMIN, "127.0.0.1", ID_GRUPO);

        ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).save(guardado.capture());
        Usuario u = guardado.getValue();
        System.out.println("[EVIDENCIA TC-007] Guardado → CI: [" + u.getCiusuario() + "] · Nombre: [" + u.getNombreusuario()
                + "] · Apellido: [" + u.getApellidousuario() + "] · Correo: [" + u.getCorreousuario() + "]");

        assertAll(
                () -> assertEquals(1, resultado.getExitosos()),
                () -> assertEquals("9900907", u.getCiusuario(), "El C.I. debe guardarse sin espacios"),
                () -> assertEquals("QA Masiva", u.getNombreusuario(), "El nombre debe guardarse sin espacios sobrantes"),
                () -> assertEquals("Prueba Siete", u.getApellidousuario(), "El apellido debe guardarse sin espacios sobrantes"),
                () -> assertEquals("qa.masiva07@test.com", u.getCorreousuario(), "El correo debe guardarse sin espacios y en minúsculas")
        );
    }
}