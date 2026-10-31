package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class HorarioImportacionServiceTest {
    @Mock LectorHorarioPdf lector;
    @Mock AsignaturaRepository asignaturas;
    @Mock GrupoRepository grupos;
    @Mock HorarioCatalogoJdbcRepository escritura;
    @InjectMocks HorarioImportacionService servicio;
    private final MockMultipartFile archivo = new MockMultipartFile("archivo", "horario.pdf", "application/pdf", new byte[]{1});
    private AsignacionHorario fila(String nombre, String tipo) { return new AsignacionHorario(2008054, "CALCULO I", "2", tipo, nombre); }
    private Asignatura materia(Integer id, String nombre) { var a = new Asignatura(); a.setIdAsignatura(id); a.setNombreAsignatura(nombre); return a; }
    @Test void previewDescartaPersonalYDeduplicaPorCodigoYGrupo() {
        when(lector.leer(any())).thenReturn(List.of(fila("DOCENTE UNO", "DOCENTE"), fila("AUXILIAR UNO", "TP"), fila("POR DESIGNAR", "DOCENTE")));
        var preview = servicio.previsualizar(archivo);
        assertEquals(1, preview.filas().size());
        assertEquals(2008054, preview.filas().getFirst().codigoAsignatura());
        assertEquals("2", preview.filas().getFirst().nombreGrupo());
        verifyNoInteractions(grupos); verify(asignaturas, never()).save(any());
    }
    @Test void gruposIgualesEnMateriasDistintasSeConservan() {
        when(lector.leer(any())).thenReturn(List.of(fila("A", "DOCENTE"), new AsignacionHorario(2008019, "ALGEBRA I", "2", "TP", "B")));
        assertEquals(2, servicio.previsualizar(archivo).filas().size());
    }
    @Test void reimportarNoDuplicaYSoloConsultaGruposUnaVezPorCarga() {
        when(lector.leer(any())).thenReturn(List.of(fila("DOCENTE UNO", "DOCENTE"), fila("AUXILIAR", "TP")));
        var a = materia(2008054, "CALCULO I"); a.setCodigoOficial("2008054");
        when(asignaturas.findAll()).thenReturn(List.of(a));
        var g = new Grupo(2008054, "2", null); g.setIdGrupo(7);
        when(grupos.findAll()).thenReturn(List.of(), List.of(g));
        assertEquals(1, servicio.confirmarAutomaticamente(archivo).gruposCreados());
        var repetida=servicio.confirmarAutomaticamente(archivo);
        assertEquals(0, repetida.gruposCreados());
        assertEquals("2008054",repetida.detalleAsignaturasExistentes().getFirst().codigoOficial());
        assertEquals("CALCULO I",repetida.detalleAsignaturasExistentes().getFirst().nombreAsignatura());
        assertEquals("2",repetida.detalleGruposExistentes().getFirst().nombreGrupo());
        verify(escritura).guardar(eq(List.of()),eq(List.of()),argThat(lista -> lista.size()==1 && lista.getFirst().getIdAsignatura().equals(2008054)));
        verify(escritura).guardar(eq(List.of()),eq(List.of()),eq(List.of()));
        verify(grupos, never()).save(any()); verify(grupos, times(2)).findAll();
        verify(grupos, never()).findByIdAsignaturaAndNombreGrupoIgnoreCase(any(), any());
    }
    @Test void reutilizaMateriaHeredadaSinCambiarSuId() {
        when(lector.leer(any())).thenReturn(List.of(new AsignacionHorario(2010020, "INGENIERIA DE SOFTWARE", "1", "DOCENTE", "PERSONA")));
        var a = materia(1, "Ingeniería de Software"); a.setCodigoOficial("2010020"); when(asignaturas.findAll()).thenReturn(List.of(a));
        var g = new Grupo(1, "1", null); when(grupos.findAll()).thenReturn(List.of(g));
        var resultado = servicio.confirmarAutomaticamente(archivo);
        assertEquals(0, resultado.asignaturasCreadas()); assertEquals(0, resultado.gruposCreados());
        assertEquals(1, a.getIdAsignatura()); assertEquals("2010020", a.getCodigoOficial());
        verify(escritura).guardar(eq(List.of()),eq(List.of()),eq(List.of()));
        assertEquals(1, resultado.asignaturasExistentes()); assertEquals(1, resultado.gruposExistentes());
    }
    @Test void mismoNombreOtroCodigoCreaAsignaturaYGrupoIndependientes() {
        var antigua = materia(2008019, "ALGEBRA I"); antigua.setCodigoOficial("2008019");
        when(asignaturas.findAll()).thenReturn(List.of(antigua));
        when(grupos.findAll()).thenReturn(List.of(new Grupo(2008019,"5",null)));
        when(lector.leer(any())).thenReturn(List.of(new AsignacionHorario(2008053,"ALGEBRA I","5","DOCENTE","A")));
        assertNull(servicio.previsualizar(archivo).filas().getFirst().idAsignaturaDestino());
        var resultado = servicio.confirmarAutomaticamente(archivo);
        assertEquals(1,resultado.asignaturasCreadas()); assertEquals(1,resultado.gruposCreados());
        verify(escritura).guardar(argThat(a -> a.size()==1 && "2008053".equals(a.getFirst().getCodigoOficial())),
                eq(List.of()),argThat(g -> g.size()==1 && g.getFirst().getIdAsignatura().equals(2008053)));
    }
    @Test void codigoOficialTienePrioridadSobreIdInternoDeOtraMateria() {
        var otra = materia(2008053,"OTRA"); otra.setCodigoOficial("999");
        var correcta = materia(7,"ALGEBRA I"); correcta.setCodigoOficial("2008053");
        when(asignaturas.findAll()).thenReturn(List.of(otra,correcta));
        when(lector.leer(any())).thenReturn(List.of(new AsignacionHorario(2008053,"ALGEBRA I","5","DOCENTE","A")));
        assertEquals(7,servicio.previsualizar(archivo).filas().getFirst().idAsignaturaDestino());
    }
    @Test void idOcupadoPorOtroCodigoNoSobrescribeLaAsignatura() {
        var otra = materia(2008053,"OTRA"); otra.setCodigoOficial("999");
        when(asignaturas.findAll()).thenReturn(List.of(otra));
        when(lector.leer(any())).thenReturn(List.of(new AsignacionHorario(2008053,"ALGEBRA I","5","DOCENTE","A")));
        assertEquals(1,servicio.confirmarAutomaticamente(archivo).asignaturasCreadas());
        verify(escritura).guardar(argThat(a -> a.size()==1 && !a.getFirst().getIdAsignatura().equals(2008053)
                && "2008053".equals(a.getFirst().getCodigoOficial())),eq(List.of()),anyList());
        assertEquals("999",otra.getCodigoOficial());
    }
    @Test void nombresContradictoriosDelMismoCodigoEntreGruposSeRechazan() {
        when(lector.leer(any())).thenReturn(List.of(fila("A","DOCENTE"),new AsignacionHorario(2008054,"OTRA","3","DOCENTE","B")));
        assertThrows(SolicitudInvalidaException.class,()->servicio.previsualizar(archivo));
    }
    @Test void conflictoDeCodigoRechazaCatalogo() {
        when(lector.leer(any())).thenReturn(List.of(fila("PERSONA", "DOCENTE")));
        when(asignaturas.findAll()).thenReturn(List.of(materia(2008054, "ALGEBRA I")));
        assertThrows(SolicitudInvalidaException.class, () -> servicio.confirmarAutomaticamente(archivo));
        verify(grupos, never()).save(any()); verify(asignaturas, never()).save(any());
    }
    @Test void grupoInactivoNoSeReactivaNiSeDuplica() {
        when(lector.leer(any())).thenReturn(List.of(fila("PERSONA", "DOCENTE")));
        var a = materia(2008054, "CALCULO I"); a.setCodigoOficial("2008054");
        when(asignaturas.findAll()).thenReturn(List.of(a));
        var g = new Grupo(2008054, "2", null); g.setEstadoGrupo(false); when(grupos.findAll()).thenReturn(List.of(g));
        assertThrows(SolicitudInvalidaException.class, () -> servicio.confirmarAutomaticamente(archivo));
        verify(grupos, never()).save(any());
    }
    @Test void pdfRealSeReduceACatalogoSinPersonal() throws Exception {
        var ruta = System.getProperty("horario.test.pdf"); org.junit.jupiter.api.Assumptions.assumeTrue(ruta != null);
        byte[] bytes = java.nio.file.Files.readAllBytes(java.nio.file.Path.of(ruta));
        var filas = new LectorHorarioPdf().leer(bytes); when(lector.leer(any())).thenReturn(filas);
        var preview = servicio.previsualizar(new MockMultipartFile("archivo", "horario.pdf", "application/pdf", bytes));
        assertEquals(63, preview.filas().stream().map(f -> f.codigoAsignatura()).distinct().count());
        assertEquals(filas.stream().map(f -> f.codigoAsignatura() + ":" + f.nombreGrupo()).distinct().count(), preview.filas().size());
        System.out.println("Catálogo del PDF: 63 asignaturas y " + preview.filas().size() + " grupos únicos.");
    }
}
