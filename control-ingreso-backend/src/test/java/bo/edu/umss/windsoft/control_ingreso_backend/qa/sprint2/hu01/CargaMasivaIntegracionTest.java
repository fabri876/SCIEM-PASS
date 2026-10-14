package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu01;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CargaMasivaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.GrupoController;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaVistaPreviaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.GrupoResponseDto;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
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
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de integración de la carga masiva (HU01) contra la base de datos real.
 * Cada prueba corre en una transacción que se deshace al terminar: no queda ningún usuario creado.
 * Solo queda la línea de auditoría "CARGA_MASIVA_USUARIOS" (se guarda aparte), con la IP QA-PRUEBA-INTEGRACION.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@Transactional
@DisplayName("HU01 · Carga masiva (pruebas de integración)")
class CargaMasivaIntegracionTest {

    private static final String IP_QA = "QA-PRUEBA-INTEGRACION";
    private static final Random AZAR = new Random();

    @Autowired CargaMasivaService cargaMasivaService;
    @Autowired GrupoController grupoController;
    @Autowired TipoUsuarioResolver tipoUsuarioResolver;
    @Autowired AdminRepository adminRepository;
    @Autowired UsuarioRepository usuarioRepository;
    @Autowired EstudianteRepository estudianteRepository;
    @Autowired DocenteRepository docenteRepository;
    @Autowired AsignaturaRepository asignaturaRepository;
    @Autowired GrupoRepository grupoRepository;
    @Autowired EstudianteGrupoRepository estudianteGrupoRepository;
    @Autowired DocenteGrupoRepository docenteGrupoRepository;

    private Usuario admin;

    /** Datos de una persona nueva (CI, SIS y correo que no existen en la base). */
    private record Persona(String sis, String correo, String ci, String apellidos, String nombres, String telefono) {
        String[] fila() { return new String[]{sis, correo, ci, apellidos, nombres, telefono}; }
    }

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

    private Persona nueva(String apellidos, String nombres) {
        String ci;
        do { ci = "97" + (10000 + AZAR.nextInt(90000)); } while (usuarioRepository.findByCiusuario(ci).isPresent());
        int sis;
        do { sis = 209900000 + AZAR.nextInt(100000); }
        while (estudianteRepository.findByCodsisestudiante(sis).isPresent() || docenteRepository.findByCodsisdocente(sis).isPresent());
        String correo;
        do { correo = "qa.int" + AZAR.nextInt(1_000_000) + "@test.com"; } while (usuarioRepository.findByCorreousuario(correo).isPresent());
        return new Persona(String.valueOf(sis), correo, ci, apellidos, nombres, "7" + (1000000 + AZAR.nextInt(9000000)));
    }

    private Persona nueva() {
        return nueva("Prueba Integracion", "QA Masiva");
    }

    private List<Grupo> gruposActivos() {
        return grupoRepository.findAll().stream().filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).toList();
    }

    /** Excel con las columnas de la plantilla; si extras != null agrega ID_ASIGNATURA y GRUPO. */
    private MockMultipartFile excel(boolean conMateria, String[]... filas) throws Exception {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            var hoja = libro.createSheet();
            List<String> encabezados = new ArrayList<>(List.of("CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"));
            if (conMateria) {
                encabezados.addAll(List.of("ID_ASIGNATURA", "GRUPO"));
            }
            var encabezado = hoja.createRow(0);
            for (int c = 0; c < encabezados.size(); c++) {
                encabezado.createCell(c).setCellValue(encabezados.get(c));
            }
            for (int f = 0; f < filas.length; f++) {
                var fila = hoja.createRow(f + 1);
                for (int c = 0; c < filas[f].length; c++) {
                    fila.createCell(c).setCellValue(filas[f][c]);
                }
            }
            libro.write(salida);
            return new MockMultipartFile("archivo", "carga-qa.xlsx", "application/octet-stream", salida.toByteArray());
        }
    }

    /** PDF con una tabla escrita línea por línea (encabezado + filas), como un listado exportado. */
    private MockMultipartFile pdf(String... lineas) throws Exception {
        try (PDDocument documento = new PDDocument(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDPage pagina = new PDPage();
            documento.addPage(pagina);
            try (PDPageContentStream texto = new PDPageContentStream(documento, pagina)) {
                texto.beginText();
                texto.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                texto.setLeading(14);
                texto.newLineAtOffset(40, 740);
                for (String linea : lineas) {
                    texto.showText(linea);
                    texto.newLine();
                }
                texto.endText();
            }
            documento.save(salida);
            return new MockMultipartFile("archivo", "carga-qa.pdf", "application/pdf", salida.toByteArray());
        }
    }

    private CargaMasivaRespuestaDto cargarEstudiantes(MockMultipartFile archivo, Grupo grupo) {
        return cargaMasivaService.procesarCargaMasiva(archivo, "ESTUDIANTE", admin.getCorreousuario(), IP_QA, grupo.getIdGrupo());
    }

    private CargaMasivaRespuestaDto cargarDocentes(MockMultipartFile archivo) {
        return cargaMasivaService.procesarCargaMasiva(archivo, "DOCENTE", admin.getCorreousuario(), IP_QA, null);
    }

    private String[] conMateria(Persona p, String idsAsignatura, String grupos) {
        String[] base = p.fila();
        String[] fila = Arrays.copyOf(base, base.length + 2);
        fila[base.length] = idsAsignatura;
        fila[base.length + 1] = grupos;
        return fila;
    }

    private String errores(CargaMasivaRespuestaDto r) {
        return r.getDetallesErrores().stream().map(e -> "Fila " + e.getFila() + ": " + e.getErrores())
                .collect(Collectors.joining(" | "));
    }

    private void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-027 (C8) · La lista Asignatura de la carga del admin muestra todas las asignaturas")
    void listaAsignatura_muestraTodas() {
        var lista = grupoController.catalogo().getBody();
        long enBase = asignaturaRepository.count();
        long sinRepetir = lista.stream().map(a -> a.getIdAsignatura()).distinct().count();
        evidencia("TC-027", "Asignaturas en la base: " + enBase + " · en la lista: " + lista.size() + " · sin repetir: " + sinRepetir);

        assertAll(
                () -> assertEquals(enBase, lista.size(), "La lista debe mostrar todas las asignaturas registradas"),
                () -> assertEquals(lista.size(), sinRepetir, "No debe haber asignaturas repetidas"),
                () -> assertTrue(lista.stream().allMatch(a -> a.getNombreAsignatura() != null && !a.getNombreAsignatura().isBlank()),
                        "Cada asignatura debe tener nombre para mostrarse")
        );
    }

    @Test
    @DisplayName("TC-028 (C9) · La lista Grupo trae solo los grupos de la asignatura e indica cuáles están activos")
    void listaGrupo_soloDeLaAsignaturaYActivos() {
        // Si existe, se usa una asignatura que tenga grupos activos e inactivos.
        Map<Integer, List<Grupo>> porAsignatura = grupoRepository.findAll().stream()
                .collect(Collectors.groupingBy(Grupo::getIdAsignatura));
        Integer idAsignatura = null;
        for (Map.Entry<Integer, List<Grupo>> e : porAsignatura.entrySet()) {
            boolean mixto = e.getValue().stream().map(Grupo::getEstadoGrupo).distinct().count() > 1;
            if (idAsignatura == null || mixto) {
                idAsignatura = e.getKey();
            }
            if (mixto) {
                break;
            }
        }
        assertNotNull(idAsignatura, "No hay grupos registrados para la prueba.");
        final Integer asignaturaElegida = idAsignatura;

        List<GrupoResponseDto> grupos = grupoController.obtenerGruposPorAsignatura(asignaturaElegida).getBody();
        // El front muestra solo los que tienen estadoGrupo = true (SeleccionGrupoLote).
        List<String> visibles = grupos.stream().filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo()))
                .map(GrupoResponseDto::getNombreGrupo).toList();
        long activosEnBase = porAsignatura.get(asignaturaElegida).stream().filter(g -> Boolean.TRUE.equals(g.getEstadoGrupo())).count();
        evidencia("TC-028", "Asignatura " + asignaturaElegida + " · grupos devueltos: " + grupos.size()
                + " · activos (se muestran): " + visibles + " · activos en la base: " + activosEnBase);

        assertAll(
                () -> assertTrue(grupos.stream().allMatch(g -> asignaturaElegida.equals(g.getIdAsignatura())),
                        "Solo deben venir grupos de la asignatura elegida"),
                () -> assertTrue(grupos.stream().allMatch(g -> g.getEstadoGrupo() != null),
                        "Cada grupo debe indicar si está activo, para que la lista oculte los inactivos"),
                () -> assertEquals(activosEnBase, visibles.size(), "Deben mostrarse todos los grupos activos y ninguno inactivo")
        );
    }

    @Test
    @DisplayName("TC-029 (C26) · Excel: el error muestra el número de fila real contando el encabezado")
    void excel_errorConFilaReal() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Persona valida = nueva();
        Persona sinCi = nueva();
        String[] filaSinCi = sinCi.fila();
        filaSinCi[2] = "";

        CargaMasivaRespuestaDto r = cargarEstudiantes(excel(false, valida.fila(), filaSinCi), grupo);
        evidencia("TC-029", "Excel (encabezado en la fila 1, fila con error en la fila 3) → " + errores(r));

        assertAll(
                () -> assertEquals(1, r.getFallidos()),
                () -> assertEquals(3, r.getDetallesErrores().getFirst().getFila(),
                        "La fila sin C.I. es la fila 3 del Excel (contando el encabezado)")
        );
    }

    @Test
    @DisplayName("TC-029 (C26) · PDF: el error muestra el número de fila real contando el encabezado")
    void pdf_errorConFilaReal() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Persona valida = nueva();
        Persona duplicada = nueva();
        // La segunda fila de datos repite el C.I. de la primera → error en la fila 3 (fila 1 = encabezado).
        // Se usa "Apellido, Nombre" para que el lector de PDF separe bien los nombres y solo se evalúe el número de fila.
        MockMultipartFile archivo = pdf(
                "CODSIS CORREO CI APELLIDOS NOMBRES TELEFONO",
                String.join(" ", valida.sis(), valida.correo(), valida.ci(), "Prueba,", "QA", valida.telefono()),
                String.join(" ", duplicada.sis(), duplicada.correo(), valida.ci(), "Prueba,", "QA", duplicada.telefono()));

        CargaMasivaRespuestaDto r = cargarEstudiantes(archivo, grupo);
        evidencia("TC-029", "PDF (encabezado en la fila 1, fila con error en la fila 3) → " + errores(r));

        assertAll(
                () -> assertEquals(1, r.getFallidos()),
                () -> assertEquals(3, r.getDetallesErrores().isEmpty() ? -1 : r.getDetallesErrores().getFirst().getFila(),
                        "La fila con error es la fila 3 del PDF (contando el encabezado)")
        );
    }

    @Test
    @DisplayName("TC-030 (C28) · Un C.I. ya registrado muestra error y no crea otra cuenta")
    void ciYaRegistrado_noCreaCuenta() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Usuario existente = usuarioRepository.findAll().stream()
                .filter(u -> u.getCiusuario() != null && !u.getCiusuario().isBlank()).findFirst().orElseThrow();
        Persona p = nueva();
        String[] fila = p.fila();
        fila[2] = existente.getCiusuario();
        long cuentasAntes = usuarioRepository.count();

        CargaMasivaRespuestaDto r = cargarEstudiantes(excel(false, fila), grupo);
        long cuentasDespues = usuarioRepository.count();
        evidencia("TC-030", "C.I. " + existente.getCiusuario() + " (ya registrado) → " + errores(r)
                + " · cuentas " + cuentasAntes + " → " + cuentasDespues);

        assertAll(
                () -> assertEquals(1, r.getFallidos()),
                () -> assertTrue(errores(r).contains("Ya existe un usuario en la BD con el CI"), "Debe explicar que el C.I. ya existe"),
                () -> assertEquals(cuentasAntes, cuentasDespues, "No debe crearse otra cuenta")
        );
    }

    @Test
    @DisplayName("TC-031 (C29) · Nombres con tildes, ñ y apóstrofes se guardan y se ven bien")
    void nombresConTildesEnieYApostrofes() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Persona p = nueva("Peña O'Brien", "José María");

        CargaMasivaVistaPreviaDto vista = cargaMasivaService.previsualizar(excel(false, p.fila()), "ESTUDIANTE",
                admin.getCorreousuario(), grupo.getIdGrupo());
        CargaMasivaRespuestaDto r = cargarEstudiantes(excel(false, p.fila()), grupo);
        Usuario guardado = usuarioRepository.findByCorreousuario(p.correo()).orElse(null);
        evidencia("TC-031", "Vista previa: " + vista.filas().getFirst().nombre() + " " + vista.filas().getFirst().apellido()
                + " · guardado: " + (guardado == null ? "no se guardó (" + errores(r) + ")"
                : guardado.getNombreusuario() + " " + guardado.getApellidousuario()));

        assertAll(
                () -> assertEquals("José María", vista.filas().getFirst().nombre(), "La vista previa debe mostrar bien el nombre"),
                () -> assertEquals("Peña O'Brien", vista.filas().getFirst().apellido(), "La vista previa debe mostrar bien el apellido"),
                () -> assertNotNull(guardado, "El estudiante debe guardarse"),
                () -> assertEquals("José María", guardado == null ? null : guardado.getNombreusuario()),
                () -> assertEquals("Peña O'Brien", guardado == null ? null : guardado.getApellidousuario())
        );
    }

    @Test
    @DisplayName("TC-032 (C31) · En la vista previa los datos de un PDF quedan en su columna correcta")
    void pdf_vistaPreviaEnColumnasCorrectas() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Persona p = nueva("Prueba Cuatro", "QA Masiva");
        MockMultipartFile archivo = pdf(
                "CODSIS CORREO CI APELLIDOS NOMBRES TELEFONO",
                String.join(" ", p.sis(), p.correo(), p.ci(), p.apellidos(), p.nombres(), p.telefono()));

        CargaMasivaVistaPreviaDto.Fila f = cargaMasivaService.previsualizar(archivo, "ESTUDIANTE",
                admin.getCorreousuario(), grupo.getIdGrupo()).filas().getFirst();
        evidencia("TC-032", "PDF: \"" + String.join(" ", p.fila()) + "\" → SIS: [" + f.codigoSis() + "] · Correo: ["
                + f.correo() + "] · CI: [" + f.ci() + "] · Apellidos: [" + f.apellido() + "] · Nombres: [" + f.nombre()
                + "] · Teléfono: [" + f.telefono() + "]");

        assertAll(
                () -> assertEquals(Integer.valueOf(p.sis()), f.codigoSis(), "Código SIS"),
                () -> assertEquals(p.correo(), f.correo(), "Correo"),
                () -> assertEquals(p.ci(), f.ci(), "C.I."),
                () -> assertEquals(p.apellidos(), f.apellido(), "Apellidos"),
                () -> assertEquals(p.nombres(), f.nombre(), "Nombres"),
                () -> assertEquals(Integer.valueOf(p.telefono()), f.telefono(), "Teléfono")
        );
    }

    @Test
    @DisplayName("TC-033 (C32) · La vista previa trae todas las filas del archivo")
    void vistaPrevia_traeTodasLasFilas() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        String[][] filas = new String[5][];
        for (int i = 0; i < 5; i++) {
            filas[i] = nueva().fila();
        }
        CargaMasivaVistaPreviaDto vista = cargaMasivaService.previsualizar(excel(false, filas), "ESTUDIANTE",
                admin.getCorreousuario(), grupo.getIdGrupo());
        evidencia("TC-033", "Archivo con 5 filas → vista previa con " + vista.filas().size() + " registros (filas "
                + vista.filas().stream().map(CargaMasivaVistaPreviaDto.Fila::fila).toList() + ")");

        assertEquals(5, vista.filas().size(), "La vista previa debe traer las 5 filas");
    }

    @Test
    @DisplayName("TC-035 (C35) · Revisar la vista previa sin confirmar no guarda ningún dato")
    void vistaPreviaSinConfirmar_noGuarda() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Persona p1 = nueva();
        Persona p2 = nueva();
        long cuentasAntes = usuarioRepository.count();

        cargaMasivaService.previsualizar(excel(false, p1.fila(), p2.fila()), "ESTUDIANTE",
                admin.getCorreousuario(), grupo.getIdGrupo());
        long cuentasDespues = usuarioRepository.count();
        boolean seGuardo = usuarioRepository.findByCorreousuario(p1.correo()).isPresent()
                || usuarioRepository.findByCorreousuario(p2.correo()).isPresent();
        evidencia("TC-035", "Vista previa de 2 filas sin confirmar → cuentas " + cuentasAntes + " → " + cuentasDespues
                + " · se guardó alguna: " + seGuardo);

        assertAll(
                () -> assertEquals(cuentasAntes, cuentasDespues, "No debe crearse ninguna cuenta"),
                () -> assertFalse(seGuardo, "Las personas del archivo no deben existir")
        );
    }

    @Test
    @DisplayName("TC-036 (C38) · Cada usuario cargado queda con el rol Estudiante o Docente correcto")
    void rolCorrecto() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Persona est = nueva();
        Persona doc = nueva();

        cargarEstudiantes(excel(false, est.fila()), grupo);
        CargaMasivaRespuestaDto rDoc = cargarDocentes(excel(true,
                conMateria(doc, String.valueOf(grupo.getIdAsignatura()), grupo.getNombreGrupo())));
        Usuario uEst = usuarioRepository.findByCorreousuario(est.correo()).orElseThrow();
        Usuario uDoc = usuarioRepository.findByCorreousuario(doc.correo()).orElse(null);
        String rolEst = tipoUsuarioResolver.resolver(uEst.getIdusuario());
        String rolDoc = uDoc == null ? "no se guardó (" + errores(rDoc) + ")" : tipoUsuarioResolver.resolver(uDoc.getIdusuario());
        evidencia("TC-036", "Carga de estudiantes → rol " + rolEst + " · carga de docentes → rol " + rolDoc);

        assertAll(
                () -> assertEquals("ESTUDIANTE", rolEst),
                () -> assertEquals("DOCENTE", rolDoc)
        );
    }

    @Test
    @DisplayName("TC-037 (C39) · Cada estudiante cargado queda inscrito una sola vez en el grupo")
    void estudianteInscritoUnaVez() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Persona p = nueva();
        // El grupo llega dos veces: el elegido en pantalla y el mismo indicado en el archivo.
        cargarEstudiantes(excel(true, conMateria(p, String.valueOf(grupo.getIdAsignatura()), grupo.getNombreGrupo())), grupo);

        Usuario u = usuarioRepository.findByCorreousuario(p.correo()).orElseThrow();
        long inscripciones = estudianteGrupoRepository.findByIdUsuario(u.getIdusuario()).stream()
                .filter(eg -> grupo.getIdGrupo().equals(eg.getIdGrupo())).count();
        evidencia("TC-037", "Estudiante " + p.correo() + " · inscripciones en el grupo " + grupo.getIdGrupo() + ": " + inscripciones);

        assertEquals(1, inscripciones, "Debe quedar inscrito una sola vez");
    }

    @Test
    @DisplayName("TC-038 (C40) · El docente cargado queda en todos sus grupos sin repetidos")
    void docenteEnTodosSusGruposSinRepetidos() throws Exception {
        List<Grupo> activos = gruposActivos();
        Grupo g1 = activos.get(0);
        Grupo g2 = activos.stream().filter(g -> !g.getIdGrupo().equals(g1.getIdGrupo())).findFirst().orElseThrow();
        Persona p = nueva();
        // g1 aparece dos veces en el archivo.
        CargaMasivaRespuestaDto r = cargarDocentes(excel(true, conMateria(p,
                g1.getIdAsignatura() + "; " + g1.getIdAsignatura() + "; " + g2.getIdAsignatura(),
                g1.getNombreGrupo() + "; " + g1.getNombreGrupo() + "; " + g2.getNombreGrupo())));

        Usuario u = usuarioRepository.findByCorreousuario(p.correo()).orElse(null);
        List<Integer> grupos = u == null ? List.of()
                : docenteGrupoRepository.findByIdUsuario(u.getIdusuario()).stream().map(dg -> dg.getIdGrupo()).toList();
        evidencia("TC-038", "Archivo con grupos " + g1.getIdGrupo() + ", " + g1.getIdGrupo() + ", " + g2.getIdGrupo()
                + " → grupos del docente: " + grupos + (u == null ? " (" + errores(r) + ")" : ""));

        assertAll(
                () -> assertEquals(2, grupos.size(), "Debe quedar en 2 grupos"),
                () -> assertTrue(grupos.containsAll(List.of(g1.getIdGrupo(), g2.getIdGrupo())), "Debe estar en ambos grupos"),
                () -> assertEquals(grupos.size(), new HashSet<>(grupos).size(), "No debe haber grupos repetidos")
        );
    }

    @Test
    @DisplayName("TC-039 (C41) · El resumen final muestra nuevos, existentes y filas con errores")
    void resumenFinal() throws Exception {
        Grupo grupo = gruposActivos().getFirst();
        Docente docente = docenteRepository.findAll().stream()
                .filter(d -> usuarioRepository.findById(d.getIdusuario())
                        .map(u -> u.getCiusuario() != null && u.getCorreousuario() != null && Boolean.TRUE.equals(u.getEstadousuario()))
                        .orElse(false))
                .findFirst().orElseThrow();
        Usuario uExistente = usuarioRepository.findById(docente.getIdusuario()).orElseThrow();
        String materia = String.valueOf(grupo.getIdAsignatura());

        String[] nuevo = conMateria(nueva(), materia, grupo.getNombreGrupo());
        String[] existente = {String.valueOf(docente.getCodsisdocente()), uExistente.getCorreousuario(), uExistente.getCiusuario(),
                uExistente.getApellidousuario(), uExistente.getNombreusuario(), "", materia, grupo.getNombreGrupo()};
        String[] conError = conMateria(nueva(), materia, grupo.getNombreGrupo());
        conError[2] = ""; // sin C.I.

        CargaMasivaRespuestaDto r = cargarDocentes(excel(true, nuevo, existente, conError));
        evidencia("TC-039", "Mensaje: \"" + r.getMensaje() + "\" · Nuevos: " + r.getExitosos() + " · Existentes: "
                + r.getExistentes() + " · Con errores: " + r.getFallidos());

        assertAll(
                () -> assertEquals(1, r.getExitosos(), "1 nuevo"),
                () -> assertEquals(1, r.getExistentes(), "1 existente"),
                () -> assertEquals(1, r.getFallidos(), "1 con errores"),
                () -> assertTrue(r.getMensaje().contains("1 usuario(s) nuevos") && r.getMensaje().contains("1 fila(s) de docentes existentes")
                        && r.getMensaje().contains("1 fila(s) con errores"), "El mensaje debe resumir los tres valores")
        );
    }

    @Test
    @DisplayName("TC-042 (C54) · En la carga de docentes, uno existente reutiliza su cuenta y suma grupos")
    void docenteExistente_reutilizaCuentaYSumaGrupos() throws Exception {
        List<Grupo> activos = gruposActivos();
        Docente docente = null;
        Usuario uDoc = null;
        Grupo nuevoGrupo = null;
        for (Docente d : docenteRepository.findAll()) {
            Usuario u = usuarioRepository.findById(d.getIdusuario()).orElse(null);
            if (u == null || u.getCiusuario() == null || u.getCorreousuario() == null || !Boolean.TRUE.equals(u.getEstadousuario())) {
                continue;
            }
            Optional<Grupo> libre = activos.stream()
                    .filter(g -> !docenteGrupoRepository.existsByIdUsuarioAndIdGrupo(d.getIdusuario(), g.getIdGrupo())).findFirst();
            if (libre.isPresent()) {
                docente = d; uDoc = u; nuevoGrupo = libre.get();
                break;
            }
        }
        assertNotNull(docente, "No hay un docente activo con un grupo disponible para la prueba.");
        int gruposAntes = docenteGrupoRepository.findByIdUsuario(docente.getIdusuario()).size();
        long cuentasAntes = usuarioRepository.count();

        String[] fila = {String.valueOf(docente.getCodsisdocente()), uDoc.getCorreousuario(), uDoc.getCiusuario(),
                uDoc.getApellidousuario(), uDoc.getNombreusuario(), "", String.valueOf(nuevoGrupo.getIdAsignatura()), nuevoGrupo.getNombreGrupo()};
        CargaMasivaRespuestaDto r = cargarDocentes(excel(true, fila));

        int gruposDespues = docenteGrupoRepository.findByIdUsuario(docente.getIdusuario()).size();
        long cuentasDespues = usuarioRepository.count();
        evidencia("TC-042", "Docente " + uDoc.getCorreousuario() + " · cuentas " + cuentasAntes + " → " + cuentasDespues
                + " · grupos " + gruposAntes + " → " + gruposDespues + " · aviso: " + r.getAvisos() + " · errores: " + errores(r));

        assertAll(
                () -> assertEquals(1, r.getExistentes(), "Debe contarse como docente existente"),
                () -> assertEquals(cuentasAntes, cuentasDespues, "No debe crearse otra cuenta"),
                () -> assertEquals(gruposAntes + 1, gruposDespues, "Debe sumarse el grupo nuevo, conservando los anteriores")
        );
    }
}
