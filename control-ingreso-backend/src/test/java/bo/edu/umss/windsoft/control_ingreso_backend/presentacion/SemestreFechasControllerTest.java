package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.SemestreService;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.*;

class SemestreFechasControllerTest {
    @Test void fechasDelFormularioSeConviertenYSeGuardanComoLocalDate() throws Exception {
        var servicio=mock(SemestreService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new SemestreAdminController(servicio)).build();
        mvc.perform(multipart(HttpMethod.PUT,"/api/admin/semestres/fechas")
                .param("fechaInicio","2026-08-01").param("fechaFin","2026-12-13")).andExpect(status().isOk());
        verify(servicio).configurarFechas(LocalDate.of(2026,8,1),LocalDate.of(2026,12,13));
    }
    @Test void noPermiteConfirmarUnSemestreSinSusFechas() throws Exception {
        var servicio=mock(SemestreService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new SemestreAdminController(servicio)).build();
        mvc.perform(multipart("/api/admin/semestres/abrir").param("nombre","1-2027").param("confirmacion","token"))
                .andExpect(status().isBadRequest());verifyNoInteractions(servicio);
    }
}
