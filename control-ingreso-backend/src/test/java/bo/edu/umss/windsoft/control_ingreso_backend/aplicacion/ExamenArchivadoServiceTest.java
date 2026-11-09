package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenArchivadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import org.apache.pdfbox.pdmodel.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayOutputStream;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExamenArchivadoServiceTest {
    final ExamenArchivadoRepository repo=mock(ExamenArchivadoRepository.class);
    final ExamenArchivadoService service=new ExamenArchivadoService(repo,
        Clock.fixed(Instant.parse("2026-11-05T02:00:00Z"),ZoneId.of("America/La_Paz")));
    ExamenArchivadoRequest datos(String periodo,LocalDate fecha) {
        return new ExamenArchivadoRequest("Examen FCyT",periodo,fecha,"");
    }
    MockMultipartFile pdf() throws Exception {
        try(var doc=new PDDocument();var out=new ByteArrayOutputStream()) {
            doc.addPage(new PDPage());doc.save(out);
            return new MockMultipartFile("archivoPdf","documento.pdf","application/pdf",out.toByteArray());
        }
    }
    @Test void guardaSoloDocumentoConFechaOpcionalYHuellaDeContenido() throws Exception {
        when(repo.guardar(any(),any(),anyString())).thenReturn(7L);
        assertEquals(7,service.guardar(datos("1-2026",null),pdf()));
        verify(repo).guardar(any(),any(),matches("[a-f0-9]{64}"));
    }
    @Test void aceptaArchivoAntiguoSinExigirSemestreOperativo() throws Exception {
        when(repo.guardar(any(),any(),anyString())).thenReturn(8L);
        assertEquals(8,service.guardar(datos("2-2005",LocalDate.of(2005,7,9)),pdf()));
    }
    @Test void duplicadoDevuelve409SinCrearUnaSegundaCopia() throws Exception {
        when(repo.guardar(any(),any(),anyString())).thenReturn(null);
        var archivo=pdf();
        var e=assertThrows(ResponseStatusException.class,()->service.guardar(datos("2-2026",null),archivo));
        assertEquals(409,e.getStatusCode().value());
    }
    @Test void rechazaTextoDisfrazadoDePdf() {
        var archivo=new MockMultipartFile("archivoPdf","falso.pdf","application/pdf","no es PDF".getBytes());
        assertThrows(ResponseStatusException.class,()->service.guardar(datos("2-2026",null),archivo));
        verifyNoInteractions(repo);
    }
    @Test void rechazaPdfVacioYExcesivoSinIntentarGuardarlo() {
        for(byte[] bytes:List.of(new byte[0],new byte[10*1024*1024+1])) {
            var archivo=new MockMultipartFile("archivoPdf","examen.pdf","application/pdf",bytes);
            assertThrows(ResponseStatusException.class,()->service.guardar(datos("2-2026",null),archivo));
        }
        verifyNoInteractions(repo);
    }
    @Test void rechazaGestionesFuturasOInvalidas() {
        for(String gestion:List.of("1-2027","3-2026","2026-2"))
            assertThrows(ResponseStatusException.class,()->service.guardar(datos(gestion,null),null));
        verifyNoInteractions(repo);
    }
    @Test void fechaRespetaElDiaBolivianoYElAnioDeGestion() {
        for(LocalDate fecha:List.of(LocalDate.of(2026,11,5),LocalDate.of(2025,1,1)))
            assertThrows(ResponseStatusException.class,()->service.guardar(datos("2-2026",fecha),null));
        verifyNoInteractions(repo);
    }
    @Test void paginaAcotadaNoLeeLosPdf() {
        when(repo.listar(20,0)).thenReturn(List.of());
        assertTrue(service.listar(20,0).isEmpty());
        verify(repo).listar(20,0);verifyNoMoreInteractions(repo);
        assertThrows(ResponseStatusException.class,()->service.listar(101,0));
        assertThrows(ResponseStatusException.class,()->service.listar(20,-1));
    }
    @Test void descargaOriginalY404ParaIdInexistente() {
        byte[] archivo={1,2,3};when(repo.pdf(7)).thenReturn(Optional.of(archivo));
        when(repo.pdf(8)).thenReturn(Optional.empty());
        assertArrayEquals(archivo,service.pdf(7));
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.pdf(8)).getStatusCode().value());
    }
}
