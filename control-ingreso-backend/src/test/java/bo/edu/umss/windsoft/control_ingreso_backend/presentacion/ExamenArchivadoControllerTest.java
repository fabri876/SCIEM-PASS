package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenArchivadoService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;

class ExamenArchivadoControllerTest {
    @Test void formularioMinimoSinDatosAcademicosDevuelve201() throws Exception {
        var service=mock(ExamenArchivadoService.class);
        when(service.guardar(any(),any())).thenReturn(7L);
        var mvc=MockMvcBuilders.standaloneSetup(new ExamenArchivadoController(service)).build();
        mvc.perform(multipart("/api/admin/examenes-pasados")
            .file(new MockMultipartFile("archivoPdf","examen.pdf","application/pdf",new byte[]{1}))
            .param("strNombre","Primer examen FCyT").param("strPeriodo","2-2026"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.intId").value(7));
        verify(service).guardar(eq(new ExamenArchivadoRequest("Primer examen FCyT","2-2026",null,null)),any());
    }
    @Test void noPermiteFaltantesNiPeriodoInvalido() throws Exception {
        var service=mock(ExamenArchivadoService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new ExamenArchivadoController(service)).build();
        mvc.perform(multipart("/api/admin/examenes-pasados")
            .file(new MockMultipartFile("archivoPdf",new byte[]{1})).param("strPeriodo","3-2026"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void listaPublicaYDescargaPdfSinCredenciales() throws Exception {
        var service=mock(ExamenArchivadoService.class);
        when(service.listar(20,0)).thenReturn(List.of());when(service.pdf(7)).thenReturn(new byte[]{1,2,3});
        var mvc=MockMvcBuilders.standaloneSetup(new ExamenArchivadoController(service)).build();
        mvc.perform(get("/api/publico/examenes/pasados")).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get("/api/publico/examenes/pasados/7/pdf")).andExpect(status().isOk())
            .andExpect(content().contentType("application/pdf"))
            .andExpect(header().string("Content-Disposition","attachment; filename=\"examen-7.pdf\""));
    }
    @Test void rechaza501CaracteresAntesDeInvocarElServicio() throws Exception {
        var service=mock(ExamenArchivadoService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new ExamenArchivadoController(service)).build();
        mvc.perform(multipart("/api/admin/examenes-pasados").file(new MockMultipartFile("archivoPdf","examen.pdf","application/pdf",new byte[]{1}))
            .param("strNombre","Examen").param("strPeriodo","2-2026").param("strObservaciones","a".repeat(501)))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
