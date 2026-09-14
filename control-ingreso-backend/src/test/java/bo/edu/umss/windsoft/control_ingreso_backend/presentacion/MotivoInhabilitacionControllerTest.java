package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.MotivoInhabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.GlobalExceptionHandler;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionResponseDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MotivoInhabilitacionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MotivoInhabilitacionService motivoService;

    @InjectMocks
    private MotivoInhabilitacionController motivoController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(motivoController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testCrearMotivoValidacionCampoVacioRetorna400BadRequest() throws Exception {
        MotivoInhabilitacionRequestDto requestInvalido = new MotivoInhabilitacionRequestDto("", "Descripcion valida");

        mockMvc.perform(post("/api/motivos-inhabilitacion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestInvalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value(400))
                .andExpect(jsonPath("$.mensaje").value("El nombre del motivo es obligatorio"));
    }

    @Test
    void testCrearMotivoSinCampoNombreRetorna400BadRequest() throws Exception {
        String jsonSinNombre = "{\"descripcionMotivo\": \"Falta el nombre\"}";

        mockMvc.perform(post("/api/motivos-inhabilitacion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonSinNombre))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value(400))
                .andExpect(jsonPath("$.mensaje").value("El nombre del motivo es obligatorio"));
    }

    @Test
    void testCrearMotivoJsonConSintaxisInvalidaComasDeMasRetorna400BadRequest() throws Exception {
        String jsonConComaDeMas = "{\"nombreMotivo\": \"Deuda\",}";

        mockMvc.perform(post("/api/motivos-inhabilitacion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonConComaDeMas))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value(400))
                .andExpect(jsonPath("$.mensaje").value("El formato del JSON enviado es inválido. Verifique la sintaxis: comas de más, llaves sin cerrar o comillas faltantes."));
    }

    @Test
    void testCrearMotivoJsonConLlaveSinCerrarRetorna400BadRequest() throws Exception {
        String jsonSinCierre = "{\"nombreMotivo\": \"Deuda\"";

        mockMvc.perform(post("/api/motivos-inhabilitacion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonSinCierre))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value(400))
                .andExpect(jsonPath("$.mensaje").value("El formato del JSON enviado es inválido. Verifique la sintaxis: comas de más, llaves sin cerrar o comillas faltantes."));
    }

    @Test
    void testCrearMotivoExitosoRetorna201Created() throws Exception {
        MotivoInhabilitacionRequestDto request = new MotivoInhabilitacionRequestDto("Deuda", "Pendiente");
        MotivoInhabilitacionResponseDto responseDto = new MotivoInhabilitacionResponseDto(1, "Deuda", "Pendiente");

        when(motivoService.crearMotivo(any(MotivoInhabilitacionRequestDto.class))).thenReturn(responseDto);

        mockMvc.perform(post("/api/motivos-inhabilitacion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idMotivo").value(1))
                .andExpect(jsonPath("$.nombreMotivo").value("Deuda"))
                .andExpect(jsonPath("$.descripcionMotivo").value("Pendiente"));
    }
}
