package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuthService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.HashMap;
import org.springframework.test.context.transaction.AfterTransaction;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Opt-in: usa cuentas pendientes reales, sin persistir cambios de contraseña ni auditoría. */
@SpringBootTest(properties={"spring.jpa.show-sql=false", "logging.level.org.hibernate.SQL=OFF"})
@ActiveProfiles("local")
@Transactional
@EnabledIfSystemProperty(named="primer.ingreso.real",matches="true")
class PrimerIngresoCuentasRealesTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;
    @Autowired AuthService auth;
    @Autowired EntityManager em;
    @Autowired WebApplicationContext context;
    private final Map<Integer,String> originales=new HashMap<>();

    @AfterTransaction void verificarRestauracion() {
        originales.forEach((id,hash)-> {
            assertEquals(hash,jdbc.queryForObject("SELECT contraseniausuario FROM usuario WHERE idusuario=?",String.class,id),"Hash original conservado tras rollback");
            assertEquals(true,jdbc.queryForObject("SELECT debe_cambiar_contrasena FROM usuario WHERE idusuario=?",Boolean.class,id),"Cuenta sigue pendiente tras rollback");
        });
        System.out.println("ROLLBACK_VERIFICADO: contraseñas originales y estado pendiente conservados para "+originales.size()+" cuentas.");
    }

    @Test void cuentasPendientesRecuperanFotoYExamenesTrasCambiarClave() throws Exception {
        var mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        var json=new ObjectMapper();
        var cuentas=jdbc.queryForList("""
            SELECT u.idusuario,u.correousuario,u.ciusuario,u.contraseniausuario
            FROM usuario u JOIN estudiante e USING(idusuario)
            WHERE u.debe_cambiar_contrasena=true AND u.estadousuario=true
              AND u.intentos_fallidos=0 AND u.fecha_bloqueo IS NULL
            ORDER BY EXISTS(SELECT 1 FROM estudiantegrupo g WHERE g.idusuario=u.idusuario) DESC,u.idusuario
            LIMIT 30
            """);
        int probadas=0;
        for(var cuenta:cuentas) {
            String ci=(String)cuenta.get("ciusuario"), correo=(String)cuenta.get("correousuario");
            if(ci==null || correo==null || !encoder.matches(ci,(String)cuenta.get("contraseniausuario"))) continue;
            originales.put(((Number)cuenta.get("idusuario")).intValue(),(String)cuenta.get("contraseniausuario"));
            var login=auth.login(correo,ci,"127.0.0.1");
            String token="Bearer "+login.getToken();
            for(String ruta:new String[]{"/api/face/enrollment/status","/api/v1/estudiante/examenes"}) {
                assertEquals(403,mvc.perform(get(ruta).header("Authorization",token)).andReturn().getResponse().getStatus(),"Bloqueo previo al cambio");
            }
            String nueva="Viento!Roca7#Menta";
            assertFalse(nueva.contains(ci));
            assertEquals(200,mvc.perform(post("/api/auth/cambiar-contrasena").header("Authorization",token)
                .contentType("application/json").content(json.writeValueAsString(Map.of("contrasenaActual",ci,"nuevaContrasena",nueva))))
                .andReturn().getResponse().getStatus(),"Cambio válido");
            em.flush();
            for(String ruta:new String[]{"/api/face/enrollment/status","/api/v1/estudiante/examenes"}) {
                assertEquals(200,mvc.perform(get(ruta).header("Authorization",token)).andReturn().getResponse().getStatus(),"Reconsulta con el mismo token después del cambio");
            }
            var siguiente=auth.login(correo,nueva,"127.0.0.1");
            assertNotNull(siguiente.getToken());
            assertEquals(false,jdbc.queryForObject("SELECT debe_cambiar_contrasena FROM usuario WHERE idusuario=?",Boolean.class,cuenta.get("idusuario")));
            System.out.println("CUENTA_ESTUDIANTE_"+(++probadas)+": bloqueo=403, cambio=200, foto=200, examenes=200, nuevo_login=OK; rollback al finalizar.");
            if(probadas==2) break;
        }
        assertEquals(2,probadas,"Se necesitan dos cuentas pendientes que conserven CI como clave");
    }
}

