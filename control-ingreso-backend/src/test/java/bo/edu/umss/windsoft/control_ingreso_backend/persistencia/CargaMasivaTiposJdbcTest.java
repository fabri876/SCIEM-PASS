package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AltaUsuarioLote;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import java.sql.Types;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CargaMasivaTiposJdbcTest {
    @Test void conservaTextoBooleanosYTelefonoNuloConElIndicadorDePrimerIngreso() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), eq(Integer.class), any(Object[].class)))
                .thenReturn(List.of(101));
        Usuario usuario = new Usuario("98112711", "Prueba", "Carga", null,
                "qa@example.test", "{argon2}hash", true);
        new CargaMasivaJdbcRepository(jdbc).guardarNuevos(List.of(
                new AltaUsuarioLote(usuario, "ESTUDIANTE", 202981131, Set.of(1))));
        ArgumentCaptor<int[]> tipos = ArgumentCaptor.forClass(int[].class);
        verify(jdbc).batchUpdate(startsWith("INSERT INTO usuario ("), anyList(), tipos.capture());
        assertArrayEquals(new int[]{Types.INTEGER, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR,
                Types.INTEGER, Types.VARCHAR, Types.VARCHAR, Types.BOOLEAN, Types.INTEGER,
                Types.BOOLEAN}, tipos.getValue());
    }
}
