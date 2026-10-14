package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuditoriaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CargaMasivaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.GrupoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaErrorFilaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaVistaPreviaDto;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pruebas de validación de la carga masiva (HU01).
 * No usan la base de datos: los repositorios se simulan (mocks) y el Excel se arma en memoria.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("HU01 · Carga masiva (pruebas de validación)")
class CargaMasivaValidacionTest {

    private static final String ADMIN = "admin@gmail.com";
    private static final int ID_GRUPO = 7;
    private static final String[] ENC_ESTUDIANTES = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"};
    private static final String[] ENC_DOCENTES = {"CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO", "ID_ASIGNATURA", "GRUPO"};

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
        when(asignaturas.findById(any())).thenReturn(Optional.empty()); // ninguna asignatura existe
    }

    /** Excel con los encabezados indicados y las filas de datos. */
    private MockMultipartFile excel(String[] encabezados, String[]... filas) throws Exception {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet();
            var filaEncabezado = hoja.createRow(0);
            for (int c = 0; c < encabezados.length; c++) {
                filaEncabezado.createCell(c).setCellValue(encabezados[c]);
            }
            for (int f = 0; f < filas.length; f++) {
                var fila = hoja.createRow(f + 1);
                for (int c = 0; c < filas[f].length; c++) {
                    if (filas[f][c] != null) fila.createCell(c).setCellValue(filas[f][c]);
                }
            }
            libro.write(salida);
            return new MockMultipartFile("archivo", "lista.xlsx", "application/octet-stream", salida.toByteArray());
        }
    }

    private CargaMasivaRespuestaDto cargarEstudiantes(MockMultipartFile archivo) {
        return servicio.procesarCargaMasiva(archivo, "ESTUDIANTE", ADMIN, "127.0.0.1", ID_GRUPO);
    }

    /** Errores informados para una fila del Excel (lista vacía si la fila no tuvo errores). */
    private List<String> erroresDeFila(CargaMasivaRespuestaDto resultado, int fila) {
        return resultado.getDetallesErrores().stream()
                .filter(e -> e.getFila() == fila)
                .map(CargaMasivaErrorFilaDto::getErrores)
                .findFirst().orElse(List.of());
    }

    private boolean menciona(List<String> errores, String... palabras) {
        return errores.stream().anyMatch(e -> {
            for (String p : palabras) if (e.toUpperCase().contains(p.toUpperCase())) return true;
            return false;
        });
    }

    private void evidencia(String tc, CargaMasivaRespuestaDto r, int... filas) {
        StringBuilder sb = new StringBuilder("[EVIDENCIA " + tc + "] Nuevos: " + r.getExitosos() + " · Fallidos: " + r.getFallidos());
        for (int f : filas) sb.append(" · Fila ").append(f).append(": ").append(erroresDeFila(r, f).isEmpty() ? "sin error" : erroresDeFila(r, f));
        System.out.println(sb);
    }

    @Test
    @DisplayName("TC-156 · Un Excel solo con encabezados muestra el aviso de sin filas")
    void excelSoloEncabezados_avisaSinFilas() throws Exception {
        MockMultipartFile vacio = excel(ENC_ESTUDIANTES);

        SolicitudInvalidaException alRevisar = assertThrows(SolicitudInvalidaException.class,
                () -> servicio.previsualizar(vacio, "ESTUDIANTE", ADMIN, ID_GRUPO));
        SolicitudInvalidaException alGuardar = assertThrows(SolicitudInvalidaException.class,
                () -> cargarEstudiantes(vacio));
        System.out.println("[EVIDENCIA TC-156] Al revisar: \"" + alRevisar.getMessage() + "\" · Al guardar: \"" + alGuardar.getMessage() + "\"");

        assertAll(
                () -> assertTrue(alRevisar.getMessage().contains("no contiene filas"), "Al revisar debe avisar que no hay filas"),
                () -> assertTrue(alGuardar.getMessage().contains("no contiene filas"), "Al guardar debe avisar que no hay filas"),
                () -> verify(usuarios, never()).save(any(Usuario.class))
        );
    }

    @Test
    @DisplayName("TC-157 · Un Excel con las columnas en otro orden se lee sin errores")
    void columnasEnOtroOrden_seLeenBien() throws Exception {
        String[] desordenados = {"NOMBRES", "TELEFONO", "CI", "CORREO", "APELLIDOS", "CODSIS"};
        MockMultipartFile archivo = excel(desordenados,
                new String[]{"QA Orden", "70000157", "9900157", "qa.orden157@test.com", "Prueba Orden", "202301157"});

        CargaMasivaVistaPreviaDto.Fila leida = servicio.previsualizar(archivo, "ESTUDIANTE", ADMIN, ID_GRUPO).filas().get(0);
        CargaMasivaRespuestaDto resultado = cargarEstudiantes(archivo);
        System.out.println("[EVIDENCIA TC-157] Leído → Nombre: " + leida.nombre() + " · Apellido: " + leida.apellido() + " · CI: " + leida.ci()
                + " · SIS: " + leida.codigoSis() + " · Correo: " + leida.correo() + " · Teléfono: " + leida.telefono()
                + " · Nuevos: " + resultado.getExitosos() + " · Fallidos: " + resultado.getFallidos());

        assertAll(
                () -> assertEquals("QA Orden", leida.nombre()),
                () -> assertEquals("Prueba Orden", leida.apellido()),
                () -> assertEquals("9900157", leida.ci()),
                () -> assertEquals(202301157, leida.codigoSis()),
                () -> assertEquals("qa.orden157@test.com", leida.correo()),
                () -> assertEquals(70000157, leida.telefono()),
                () -> assertEquals(1, resultado.getExitosos(), "La fila debe registrarse"),
                () -> assertEquals(0, resultado.getFallidos(), "No debe haber errores")
        );
    }

    @Test
    @DisplayName("TC-158 · Al procesar una fila sin C.I. se marca con error obligatorio")
    void filaSinCi_marcaErrorObligatorio() throws Exception {
        MockMultipartFile archivo = excel(ENC_ESTUDIANTES,
                new String[]{"202301158", "qa.sinci158@test.com", null, "Prueba", "QA Sin CI", "70000158"});

        CargaMasivaRespuestaDto resultado = cargarEstudiantes(archivo);
        evidencia("TC-158", resultado, 2);

        assertAll(
                () -> assertEquals(0, resultado.getExitosos()),
                () -> assertEquals(1, resultado.getFallidos()),
                () -> assertTrue(erroresDeFila(resultado, 2).contains("El Carnet de Identidad (CI) es obligatorio."),
                        "La fila 2 debe marcar que el C.I. es obligatorio"),
                () -> verify(usuarios, never()).save(any(Usuario.class))
        );
    }

    @Test
    @DisplayName("TC-159 · Un C.I. con letras o fuera de 6 a 8 dígitos marca error en C.I.")
    void ciInvalido_marcaErrorEnCi() throws Exception {
        MockMultipartFile archivo = excel(ENC_ESTUDIANTES,
                new String[]{"202301591", "qa.ci1591@test.com", "ABCDEFG", "Prueba", "QA Letras", "70001591"},
                new String[]{"202301592", "qa.ci1592@test.com", "12345", "Prueba", "QA Corto", "70001592"},
                new String[]{"202301593", "qa.ci1593@test.com", "123456789", "Prueba", "QA Largo", "70001593"});

        CargaMasivaRespuestaDto resultado = cargarEstudiantes(archivo);
        evidencia("TC-159", resultado, 2, 3, 4);

        assertAll(
                () -> assertTrue(menciona(erroresDeFila(resultado, 2), "Carnet", "(CI)", "EL CI", "C.I."), "Fila 2 (C.I. con letras) debe marcar error en el C.I."),
                () -> assertTrue(menciona(erroresDeFila(resultado, 3), "Carnet", "(CI)", "EL CI", "C.I."), "Fila 3 (C.I. de 5 dígitos) debe marcar error en el C.I."),
                () -> assertTrue(menciona(erroresDeFila(resultado, 4), "Carnet", "(CI)", "EL CI", "C.I."), "Fila 4 (C.I. de 9 dígitos) debe marcar error en el C.I."),
                () -> assertEquals(0, resultado.getExitosos(), "Ninguna de las 3 filas debe registrarse")
        );
    }

    @Test
    @DisplayName("TC-160 · Un Código SIS distinto de 9 dígitos marca error en el SIS")
    void sisDistintoDeNueveDigitos_marcaError() throws Exception {
        MockMultipartFile archivo = excel(ENC_ESTUDIANTES,
                new String[]{"20230160", "qa.sis1601@test.com", "9901601", "Prueba", "QA SIS Corto", "70001601"},
                new String[]{"2023016022", "qa.sis1602@test.com", "9901602", "Prueba", "QA SIS Largo", "70001602"});

        CargaMasivaRespuestaDto resultado = cargarEstudiantes(archivo);
        evidencia("TC-160", resultado, 2, 3);

        assertAll(
                () -> assertTrue(menciona(erroresDeFila(resultado, 2), "SIS"), "Fila 2 (SIS de 8 dígitos) debe marcar error en el SIS"),
                () -> assertTrue(menciona(erroresDeFila(resultado, 3), "SIS"), "Fila 3 (SIS de 10 dígitos) debe marcar error en el SIS"),
                () -> assertEquals(0, resultado.getExitosos(), "Ninguna de las 2 filas debe registrarse")
        );
    }

    @Test
    @DisplayName("TC-161 · Un correo sin dominio o un teléfono inválido marca error")
    void correoSinDominioOTelefonoInvalido_marcaError() throws Exception {
        MockMultipartFile archivo = excel(ENC_ESTUDIANTES,
                new String[]{"202301611", "qa.sindominio161@", "9901611", "Prueba", "QA Correo", "70001611"},
                new String[]{"202301612", "qa.telefono161@test.com", "9901612", "Prueba", "QA Telefono", "12ab"});

        CargaMasivaRespuestaDto resultado = cargarEstudiantes(archivo);
        evidencia("TC-161", resultado, 2, 3);

        assertAll(
                () -> assertTrue(menciona(erroresDeFila(resultado, 2), "correo"), "Fila 2 (correo sin dominio) debe marcar error en el correo"),
                () -> assertTrue(menciona(erroresDeFila(resultado, 3), "tel"), "Fila 3 (teléfono \"12ab\") debe marcar error en el teléfono"),
                () -> assertEquals(0, resultado.getExitosos(), "Ninguna de las 2 filas debe registrarse")
        );
    }

    @Test
    @DisplayName("TC-162 · En carga de docentes una asignatura inexistente marca error")
    void docenteConAsignaturaInexistente_marcaError() throws Exception {
        MockMultipartFile archivo = excel(ENC_DOCENTES,
                new String[]{"202301162", "qa.docente162@test.com", "9901162", "Prueba", "QA Docente", "70001162", "999999", "1"});

        CargaMasivaRespuestaDto resultado = servicio.procesarCargaMasiva(archivo, "DOCENTE", ADMIN, "127.0.0.1", null);
        evidencia("TC-162", resultado, 2);

        assertAll(
                () -> assertEquals(0, resultado.getExitosos()),
                () -> assertEquals(1, resultado.getFallidos()),
                () -> assertTrue(erroresDeFila(resultado, 2).contains("La asignatura indicada no existe. Registre primero el horario o la asignatura."),
                        "La fila 2 debe marcar que la asignatura no existe"),
                () -> verify(usuarios, never()).save(any(Usuario.class))
        );
    }
}