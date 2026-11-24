package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuditoriaService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.SecurityConfig;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = ReporteIntentosAccesoTest.Config.class)
class ReporteIntentosAccesoTest {
    @Autowired WebApplicationContext context;
    MockMvc mvc;
    @BeforeEach void preparar() { mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build(); }

    @Test void protegeEndpointParaRolesPermitidos() throws Exception {
        String ruta = "/api/reportes/intentos-incorrectos";
        mvc.perform(get(ruta)).andExpect(status().isUnauthorized());
        mvc.perform(get(ruta).with(user("operador").roles("OPERADOR"))).andExpect(status().isForbidden());
        mvc.perform(get(ruta).with(user("estudiante").roles("ESTUDIANTE"))).andExpect(status().isForbidden());
        mvc.perform(get(ruta).with(user("docente").roles("DOCENTE"))).andExpect(status().isOk());
        mvc.perform(get(ruta).with(user("admin").roles("ADMINISTRADOR"))).andExpect(status().isOk());
    }

    @RestController static class EndpointPrueba {
        @GetMapping("/api/reportes/intentos-incorrectos") public String responder() { return "ok"; }
    }

    @Configuration @EnableWebMvc @EnableWebSecurity @Import(SecurityConfig.class)
    static class Config {
        @Bean ObjectMapper objectMapper() { return new ObjectMapper(); }
        @Bean JwtTokenProvider tokenProvider() { return mock(JwtTokenProvider.class); }
        @Bean ClientVersionFilter clientVersionFilter() { return new ClientVersionFilter(0); }
        @Bean UsuarioRepository usuarios() { return mock(UsuarioRepository.class); }
        @Bean AuditoriaService auditoria() { return mock(AuditoriaService.class); }
        @Bean JwtAuthenticationFilter filtro(JwtTokenProvider token, UsuarioRepository usuarios) {
            return new JwtAuthenticationFilter(token, usuarios,
                    mock(bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver.class));
        }
        @Bean CambioContrasenaObligatorioFilter cambioContrasena(UsuarioRepository usuarios) { return new CambioContrasenaObligatorioFilter(usuarios); }
        @Bean JwtAuthenticationEntryPoint entryPoint(ObjectMapper mapper) { return new JwtAuthenticationEntryPoint(mapper); }
        @Bean JwtAccessDeniedHandler denied(ObjectMapper mapper, AuditoriaService auditoria) { return new JwtAccessDeniedHandler(mapper, auditoria); }
        @Bean EndpointPrueba endpoint() { return new EndpointPrueba(); }
    }
}
