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
        when(grupos.save(any())).thenReturn(g);
        assertEquals(1, servicio.confirmarAutomaticamente(archivo).gruposCreados());
        assertEquals(0, servicio.confirmarAutomaticamente(archivo).gruposCreados());
        verify(grupos, times(1)).save(any()); verify(grupos, times(2)).findAll();
        verify(grupos, never()).findByIdAsignaturaAndNombreGrupoIgnoreCase(any(), any());
    }
    @Test void reutilizaMateriaHeredadaSinCambiarSuId() {
        when(lector.leer(any())).thenReturn(List.of(new AsignacionHorario(2010020, "INGENIERIA DE SOFTWARE", "1", "DOCENTE", "PERSONA")));
        var a = materia(1, "Ingeniería de Software"); when(asignaturas.findAll()).thenReturn(List.of(a));
        var g = new Grupo(1, "1", null); when(grupos.findAll()).thenReturn(List.of(g));
        var resultado = servicio.confirmarAutomaticamente(archivo);
        assertEquals(0, resultado.asignaturasCreadas()); assertEquals(0, resultado.gruposCreados());
        assertEquals(1, a.getIdAsignatura()); assertEquals("2010020", a.getCodigoOficial());
        assertEquals(1, resultado.asignaturasExistentes()); assertEquals(1, resultado.gruposExistentes());
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
