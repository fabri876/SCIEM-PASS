package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mock.web.MockMultipartFile;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class CargaMasivaAcademicaTest {
    @Mock UsuarioRepository usuarios;
    @Mock AdminRepository admins;
    @Mock DocenteRepository docentes;
    @Mock EstudianteRepository estudiantes;
    @Mock AyudanteRepository ayudantes;
    @Mock AsignaturaRepository asignaturas;
    @Mock GrupoRepository grupos;
    @Mock GrupoService grupoService;
    @Mock PasswordEncoder passwords;
    @Mock AuditoriaService auditoria;
    @Mock TipoUsuarioResolver roles;
    @InjectMocks CargaMasivaService servicio;
    private MockMultipartFile archivo(boolean relacion) throws Exception {
        return archivo(relacion ? "MATERIA INEXISTENTE" : "", relacion ? "2" : "");
    }
    private MockMultipartFile archivo(String materia, String grupo) throws Exception {
        return archivo(materia, grupo, "ASIGNATURA");
    }
    private MockMultipartFile archivo(String materia, String grupo, String encabezadoMateria) throws Exception {
        try(var w = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            var s = w.createSheet(); var encabezados = s.createRow(0); var fila = s.createRow(1);
            String[] nombres = {"CODSIS", "CORREO", "CI", "APELLIDO", "NOMBRE", encabezadoMateria, "GRUPO"};
            String[] valores = {"987000065", "persona@example.test", "1234567", "Apellido", "Nombre", materia, grupo};
            for(int i = 0; i < nombres.length; i++) { encabezados.createCell(i).setCellValue(nombres[i]); fila.createCell(i).setCellValue(valores[i]); }
            w.write(out); return new MockMultipartFile("archivo", "personas.xlsx", "application/octet-stream", out.toByteArray());
        }
    }
    @Test void docenteSeCreaUnaVezYSeVinculaAVariasMateriasYGrupos() throws Exception {
        ejecutor(); when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u = i.getArgument(0); u.setIdusuario(5); return u; });
        Asignatura calculo = new Asignatura(); calculo.setIdAsignatura(10);
        Asignatura algebra = new Asignatura(); algebra.setIdAsignatura(20);
        when(asignaturas.findByNombreAsignaturaIgnoreCase("CALCULO I")).thenReturn(Optional.of(calculo));
        when(asignaturas.findByNombreAsignaturaIgnoreCase("ALGEBRA I")).thenReturn(Optional.of(algebra));
        Grupo g1 = new Grupo(); g1.setIdGrupo(7); Grupo g2 = new Grupo(); g2.setIdGrupo(8);
        when(grupos.findByIdAsignaturaAndNombreGrupoIgnoreCase(10, "2")).thenReturn(Optional.of(g1));
        when(grupos.findByIdAsignaturaAndNombreGrupoIgnoreCase(20, "3")).thenReturn(Optional.of(g2));
        var resultado = servicio.procesarCargaMasiva(archivo("CALCULO I; ALGEBRA I; CALCULO I", "2; 3; 2"), "DOCENTE", "admin@example.test", "127.0.0.1", null);
        assertEquals(1, resultado.getExitosos());
        verify(docentes, times(1)).save(any());
        verify(grupoService, times(1)).asignarDocenteAGrupo(5, 987000065, 7);
        verify(grupoService, times(1)).asignarDocenteAGrupo(5, 987000065, 8);
        verify(asignaturas, times(1)).findByNombreAsignaturaIgnoreCase("CALCULO I");
        verify(grupos, times(1)).findByIdAsignaturaAndNombreGrupoIgnoreCase(10, "2");
        verify(usuarios, never()).existsByCiusuario(any());
    }
    @Test void idDeAsignaturaEnExcelSeResuelveSinBuscarNombres() throws Exception {
        ejecutor(); when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u=i.getArgument(0); u.setIdusuario(5); return u; });
        Asignatura materia=new Asignatura(); materia.setIdAsignatura(10);
        Grupo grupo=new Grupo(); grupo.setIdGrupo(7);
        when(asignaturas.findById(10)).thenReturn(Optional.of(materia));
        when(grupos.findByIdAsignaturaAndNombreGrupoIgnoreCase(10,"2")).thenReturn(Optional.of(grupo));
        var resultado=servicio.procesarCargaMasiva(archivo("10; 10","2; 2","ID_ASIGNATURA"),"DOCENTE","admin@example.test","127.0.0.1",null);
        assertEquals(1,resultado.getExitosos());
        verify(asignaturas,times(1)).findById(10);
        verify(asignaturas,never()).findByNombreAsignaturaIgnoreCase(any());
        verify(asignaturas,never()).findByCodigoOficial(any());
        verify(grupoService).asignarDocenteAGrupo(5,987000065,7);
    }
    @Test void codigoOficialTienePrioridadSobreElNombre() throws Exception {
        ejecutor(); when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u=i.getArgument(0); u.setIdusuario(5); return u; });
        Asignatura materia=new Asignatura(); materia.setIdAsignatura(10);
        Grupo grupo=new Grupo(); grupo.setIdGrupo(7);
        when(asignaturas.findByCodigoOficial("2001")).thenReturn(Optional.of(materia));
        when(grupos.findByIdAsignaturaAndNombreGrupoIgnoreCase(10,"2")).thenReturn(Optional.of(grupo));
        var resultado=servicio.procesarCargaMasiva(archivo("2001","2","CODIGO_ASIGNATURA"),"DOCENTE","admin@example.test","127.0.0.1",null);
        assertEquals(1,resultado.getExitosos());
        verify(asignaturas,never()).findByNombreAsignaturaIgnoreCase(any());
        verify(grupoService).asignarDocenteAGrupo(5,987000065,7);
    }
    @Test void duplicadosExistentesSeRechazanConConsultaDeLote() throws Exception {
        ejecutor(); when(usuarios.buscarCisExistentes(anyList())).thenReturn(List.of("1234567"));
        var resultado=servicio.procesarCargaMasiva(archivo(false),"ESTUDIANTE","admin@example.test","127.0.0.1",7);
        assertEquals(1,resultado.getFallidos());
        verify(usuarios,never()).save(any());
        verify(usuarios,times(1)).buscarCisExistentes(anyList());
        verify(usuarios,never()).existsByCiusuario(any());
    }
    @Test void listasDesalineadasNoRegistranPersonasSinSusRelaciones() throws Exception {
        ejecutor(); var resultado = servicio.procesarCargaMasiva(archivo("CALCULO I; ALGEBRA I", "2"), "DOCENTE", "admin@example.test", "127.0.0.1", null);
        assertEquals(1, resultado.getFallidos()); verify(usuarios, never()).save(any());
    }
    private void ejecutor() {
        Usuario u = new Usuario(); u.setIdusuario(1);
        when(usuarios.findByCorreousuario("admin@example.test")).thenReturn(Optional.of(u));
        when(roles.resolver(1)).thenReturn("ADMINISTRADOR");
    }
    private void docenteExistente() {
        when(usuarios.buscarCisExistentes(anyList())).thenReturn(List.of("1234567"));
        Usuario persona = new Usuario("1234567", "Nombre", "Apellido", null, "persona@example.test", "hash-original", true);
        persona.setIdusuario(5);
        when(usuarios.findByCiusuario("1234567")).thenReturn(Optional.of(persona));
        when(docentes.findByCodsisdocente(987000065)).thenReturn(Optional.of(new Docente(5, 987000065)));
    }
    @Test void docenteExistenteRecibeSoloNuevasAsignacionesSinCrearCuenta() throws Exception {
        ejecutor(); docenteExistente();
        var resultado = servicio.procesarCargaMasiva(archivo(false), "DOCENTE", "admin@example.test", "127.0.0.1", 7);
        assertEquals(0, resultado.getExitosos()); assertEquals(0, resultado.getFallidos());
        assertEquals(1, resultado.getExistentes());
        assertTrue(resultado.getAvisos().getFirst().contains("Se añadieron 1"));
        verify(grupoService).asignarDocenteAGrupo(5, 987000065, 7);
        verify(usuarios, never()).save(any()); verifyNoInteractions(passwords);
    }
    @Test void reimportarDocenteConGrupoExistenteInformaSinDuplicarlo() throws Exception {
        ejecutor(); docenteExistente(); when(grupoService.docenteTieneGrupo(5, 7)).thenReturn(true);
        var resultado = servicio.procesarCargaMasiva(archivo(false), "DOCENTE", "admin@example.test", "127.0.0.1", 7);
        assertEquals(1, resultado.getExistentes()); assertEquals(0, resultado.getFallidos());
        assertTrue(resultado.getAvisos().getFirst().contains("ya estaban asignados"));
        verify(usuarios, never()).save(any()); verifyNoInteractions(passwords);
    }
    @Test void identificadoresDeDistintosDocentesNoSeVinculan() throws Exception {
        ejecutor();
        when(usuarios.buscarCisExistentes(anyList())).thenReturn(List.of("1234567"));
        Usuario persona = new Usuario(); persona.setIdusuario(5);
        when(usuarios.findByCiusuario("1234567")).thenReturn(Optional.of(persona));
        when(docentes.findByCodsisdocente(987000065)).thenReturn(Optional.of(new Docente(6, 987000065)));
        var resultado = servicio.procesarCargaMasiva(archivo(false), "DOCENTE", "admin@example.test", "127.0.0.1", 7);
        assertEquals(1, resultado.getFallidos()); assertEquals(0, resultado.getExistentes());
        verify(grupoService, never()).asignarDocenteAGrupo(any(), any(), any());
        verify(usuarios, never()).save(any());
    }
    @Test void mismoDocenteEnDosFilasSeCreaUnaVezYRecibeAmbosGrupos() throws Exception {
        ejecutor(); when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u = i.getArgument(0); u.setIdusuario(5); return u; });
        Asignatura materia = new Asignatura(); materia.setIdAsignatura(10);
        when(asignaturas.findById(10)).thenReturn(Optional.of(materia));
        Grupo g1 = new Grupo(); g1.setIdGrupo(7); Grupo g2 = new Grupo(); g2.setIdGrupo(8);
        when(grupos.findByIdAsignaturaAndNombreGrupoIgnoreCase(10, "2")).thenReturn(Optional.of(g1));
        when(grupos.findByIdAsignaturaAndNombreGrupoIgnoreCase(10, "3")).thenReturn(Optional.of(g2));
        var original = archivo("10", "2", "ID_ASIGNATURA");
        java.io.ByteArrayOutputStream salida = new java.io.ByteArrayOutputStream();
        try (var libro = org.apache.poi.ss.usermodel.WorkbookFactory.create(original.getInputStream())) {
            var hoja = libro.getSheetAt(0); var primera = hoja.getRow(1); var segunda = hoja.createRow(2);
            for (int i = 0; i < primera.getLastCellNum(); i++) segunda.createCell(i).setCellValue(primera.getCell(i).getStringCellValue());
            segunda.getCell(6).setCellValue("3"); libro.write(salida);
        }
        var lote = new MockMultipartFile("archivo", "docentes.xlsx", "application/octet-stream", salida.toByteArray());
        var resultado = servicio.procesarCargaMasiva(lote, "DOCENTE", "admin@example.test", "127.0.0.1", null);
        assertEquals(1, resultado.getExitosos()); assertEquals(1, resultado.getExistentes()); assertEquals(0, resultado.getFallidos());
        verify(usuarios, times(1)).save(any()); verify(passwords, times(1)).encode(any());
        verify(grupoService).asignarDocenteAGrupo(5, 987000065, 7);
        verify(grupoService).asignarDocenteAGrupo(5, 987000065, 8);
    }
    @Test void loteSinGrupoRechazaLasFilasAntesDeCrearPersonas() throws Exception {
        ejecutor();
        var resultado = servicio.procesarCargaMasiva(archivo(false), "DOCENTE", "admin@example.test", "127.0.0.1", null);
        assertEquals(0, resultado.getExitosos()); assertEquals(1, resultado.getFallidos());
        verify(usuarios, never()).save(any()); verifyNoInteractions(passwords);
    }
    @Test void vistaPreviaLeeRegistrosYRelacionesSinGuardarUsuarios() throws Exception {
        ejecutor();
        var preview = servicio.previsualizar(archivo("CALCULO I; ALGEBRA I", "2; 3"), "DOCENTE", "admin@example.test", null);
        assertEquals(1, preview.filas().size());
        var fila = preview.filas().getFirst();
        assertEquals("1234567", fila.ci()); assertEquals(987000065, fila.codigoSis());
        assertEquals("DOCENTE", fila.rol()); assertEquals("CALCULO I; ALGEBRA I", fila.asignatura());
        assertEquals("2; 3", fila.grupo());
        verify(usuarios, never()).save(any()); verifyNoInteractions(passwords, auditoria, docentes, estudiantes);
    }
    @Test void docenteNoPuedePrevisualizarCargaDeOtrosDocentes() throws Exception {
        Usuario u = new Usuario(); u.setIdusuario(1);
        when(usuarios.findByCorreousuario("docente@example.test")).thenReturn(Optional.of(u));
        when(roles.resolver(1)).thenReturn("DOCENTE");
        var excel = archivo(false);
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> servicio.previsualizar(excel, "DOCENTE", "docente@example.test", null));
        verify(usuarios, never()).save(any());
    }
    @Test void plantillasDocentesConRelacionesYEstudiantesConGrupoDelPanel() throws Exception {
        ejecutor();
        for (String tipo : List.of("docentes", "estudiantes")) {
            var ruta=java.nio.file.Path.of("../control-ingreso-frontend/public/plantillas/plantilla-"+tipo+".xlsx");
            var archivo=new MockMultipartFile("archivo", "plantilla-"+tipo+".xlsx", "application/octet-stream",java.nio.file.Files.readAllBytes(ruta));
            String rol=tipo.equals("docentes") ? "DOCENTE" : "ESTUDIANTE";
            var preview=servicio.previsualizar(archivo,rol,"admin@example.test",tipo.equals("docentes") ? null : 7);
            assertEquals(2,preview.filas().size());
            var primera=preview.filas().getFirst();
            assertEquals(rol,primera.rol());
            assertFalse(primera.ci().isBlank());
            assertNotNull(primera.codigoSis());
            assertNotNull(primera.telefono());
            if (tipo.equals("docentes")) {
                assertEquals("ID:10",primera.asignatura()); assertEquals("2",primera.grupo());
                assertEquals("ID:10;ID:20",preview.filas().get(1).asignatura());
                assertEquals("2; 3",preview.filas().get(1).grupo());
            } else {
                assertTrue(primera.asignatura().isBlank()); assertTrue(primera.grupo().isBlank());
            }
        }
        verify(usuarios,never()).save(any());
        verifyNoInteractions(passwords,docentes,estudiantes,auditoria);
    }
    @Test void docenteCargaPlantillaEstudiantesEnElGrupoSeleccionado() throws Exception {
        Usuario docente = new Usuario(); docente.setIdusuario(2);
        when(usuarios.findByCorreousuario("docente@example.test")).thenReturn(Optional.of(docente));
        when(roles.resolver(2)).thenReturn("DOCENTE");
        when(passwords.encode(any())).thenReturn("hash");
        java.util.concurrent.atomic.AtomicInteger ids = new java.util.concurrent.atomic.AtomicInteger(20);
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u = i.getArgument(0); u.setIdusuario(ids.incrementAndGet()); return u; });
        var ruta=java.nio.file.Path.of("../control-ingreso-frontend/public/plantillas/plantilla-estudiantes.xlsx");
        var archivo=new MockMultipartFile("archivo","estudiantes.xlsx","application/octet-stream",java.nio.file.Files.readAllBytes(ruta));
        var resultado=servicio.procesarCargaMasiva(archivo,"ESTUDIANTE","docente@example.test","127.0.0.1",7);
        assertEquals(2,resultado.getExitosos()); assertEquals(0,resultado.getFallidos());
        verify(grupoService).inscribirEstudianteAGrupo(21,987000101,7);
        verify(grupoService).inscribirEstudianteAGrupo(22,987000102,7);
        verify(docentes,never()).save(any());
    }
    @Test void vistaPreviaDelExcelDePruebaConservaLos77Docentes() throws Exception {
        String ruta = System.getProperty("docentes.test.xlsx");
        org.junit.jupiter.api.Assumptions.assumeTrue(ruta != null);
        ejecutor();
        var excel = new MockMultipartFile("archivo", "docentes.xlsx", "application/octet-stream",
                java.nio.file.Files.readAllBytes(java.nio.file.Path.of(ruta)));
        var preview = servicio.previsualizar(excel, "DOCENTE", "admin@example.test", null);
        assertEquals(77, preview.filas().size());
        assertEquals("96000001", preview.filas().getFirst().ci());
        assertEquals(910600001, preview.filas().getFirst().codigoSis());
        assertEquals("docente001@example.test", preview.filas().getFirst().correo());
        verify(usuarios, never()).save(any());
    }
    @Test void relacionNoEncontradaSeReportaSinCrearUsuarioSuelto() throws Exception {
        ejecutor(); var resultado = servicio.procesarCargaMasiva(archivo(true), "ESTUDIANTE", "admin@example.test", "127.0.0.1", null);
        assertEquals(0, resultado.getExitosos()); assertEquals(1, resultado.getFallidos());
        verify(usuarios, never()).save(any());
    }
    @Test void grupoSeleccionadoEnLaPantallaSeVinculaAlLote() throws Exception {
        ejecutor(); when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u = i.getArgument(0); u.setIdusuario(5); return u; });
        var resultado = servicio.procesarCargaMasiva(archivo(false), "ESTUDIANTE", "admin@example.test", "127.0.0.1", 7);
        assertEquals(1, resultado.getExitosos()); assertEquals(0, resultado.getFallidos());
        verify(grupoService).inscribirEstudianteAGrupo(5, 987000065, 7);
    }
}
