package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import java.net.URI;
import java.net.http.*;
import static org.junit.jupiter.api.Assertions.*;
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.jpa.hibernate.ddl-auto=none", "spring.jpa.show-sql=false", "logging.level.root=ERROR"})
@ActiveProfiles("local")
class ExamenPublicoIntegracionTest {
    @LocalServerPort int puerto;
    @Test void carteleraConsultaBaseDeDatosSinNecesitarToken() throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + "/api/publico/examenes/proximos")).GET().build();
        var respuesta = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, respuesta.statusCode());
        assertTrue(respuesta.body().startsWith("["));
        assertFalse(respuesta.body().contains("contraseniausuario"));
        assertFalse(respuesta.body().contains("ciusuario"));
    }
    @Test void cambiosConsultaHistorialSinNecesitarToken() throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + "/api/publico/examenes/cambios")).GET().build();
        var respuesta = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, respuesta.statusCode());
        assertTrue(respuesta.body().startsWith("["));
    }
}
