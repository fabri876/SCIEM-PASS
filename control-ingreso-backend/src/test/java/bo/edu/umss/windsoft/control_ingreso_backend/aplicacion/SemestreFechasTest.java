package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.SemestreRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.SemestreRepository.Resumen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class SemestreFechasTest {
    private final SemestreRepository repo=mock(SemestreRepository.class);
    private final PdfSemestreService pdf=mock(PdfSemestreService.class);
    private Resumen actual(Instant archivado){return new Resumen(1,2026,2,"ACTUAL","",false,false,LocalDate.of(2026,8,1),LocalDate.of(2026,12,13),archivado);}
    private SemestreService servicio(String instante){return new SemestreService(repo,null,pdf,Clock.fixed(Instant.parse(instante),ZoneId.of("America/La_Paz")));}

    @Test void incluyeTodoElUltimoDiaEnHoraBoliviana(){
        when(repo.actual(true)).thenReturn(actual(null));
        servicio("2026-12-14T03:59:59Z").archivarVencido();
        verify(repo,never()).marcarArchivado(anyInt());verifyNoInteractions(pdf);
    }
    @Test void archivaUnaVezDespuesDelFinSinCrearNiBorrarCuentas(){
        when(repo.actual(true)).thenReturn(actual(null),actual(Instant.parse("2026-12-14T04:00:00Z")));
        when(repo.listadoActual()).thenReturn(List.of());when(repo.filasActuales()).thenReturn(List.of());
        when(pdf.generarListado("2-2026",List.of(),false)).thenReturn(new byte[]{1,2,3});
        var s=servicio("2026-12-14T04:00:00Z");s.archivarVencido();s.archivarVencido();
        verify(repo,times(1)).guardarListado(1,List.of());verify(repo,times(1)).guardarFilas(1,List.of());
        verify(repo,times(1)).guardarPdfListado(eq(1),any(),eq(false));verify(repo,times(1)).marcarArchivado(1);
    }
    @Test void fechasInvertidasNoSeGuardan(){
        assertThrows(SolicitudInvalidaException.class,()->servicio("2026-10-31T12:00:00Z").configurarFechas(LocalDate.of(2026,12,13),LocalDate.of(2026,8,1)));
        verifyNoInteractions(repo);
    }
    @Test void noReabreLasFechasDeUnSemestreArchivado(){
        when(repo.actual(true)).thenReturn(actual(Instant.parse("2026-12-14T04:00:00Z")));
        assertThrows(SolicitudInvalidaException.class,()->servicio("2026-12-15T12:00:00Z").configurarFechas(LocalDate.of(2026,8,1),LocalDate.of(2027,1,1)));
        verify(repo,never()).guardarFechas(anyInt(),any(),any());
    }
    @Test void noCambiaDeSemestreAntesDeLaFechaFinal(){
        when(repo.actual(false)).thenReturn(actual(null));
        assertThrows(SolicitudInvalidaException.class,()->servicio("2026-10-31T12:00:00Z").previsualizar("1-2027",LocalDate.of(2027,1,1),LocalDate.of(2027,6,30),null));
    }
    @Test void confirmacionIncluyeLasFechasYRechazaCambiosPosteriores(){
        when(repo.actual(false)).thenReturn(actual(null));when(repo.actual(true)).thenReturn(actual(null));
        when(repo.filasActuales()).thenReturn(List.of());when(repo.docentes()).thenReturn(List.of());
        var s=servicio("2026-12-15T12:00:00Z");
        var previa=s.previsualizar("1-2027",LocalDate.of(2027,1,1),LocalDate.of(2027,6,30),null);
        assertThrows(SolicitudInvalidaException.class,()->s.abrir("1-2027",LocalDate.of(2027,1,1),LocalDate.of(2027,7,1),"",null,previa.confirmacion()));
        verify(repo,never()).guardarListado(anyInt(),any());
    }
    @Test void pdfArchivadoNoSeRegeneraConDatosPosteriores(){
        when(repo.obtener(1)).thenReturn(actual(Instant.parse("2026-12-14T04:00:00Z")));
        byte[] original={1,2,3};when(repo.pdf(1,false)).thenReturn(original);
        assertSame(original,servicio("2026-12-15T12:00:00Z").descargar(1,false));
        verifyNoInteractions(pdf);verify(repo,never()).listadoActual();
    }
}
