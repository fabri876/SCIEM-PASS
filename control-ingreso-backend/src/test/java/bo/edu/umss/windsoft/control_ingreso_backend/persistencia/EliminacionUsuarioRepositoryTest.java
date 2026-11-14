package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EliminacionUsuarioRepositoryTest {
    @Test void eliminarSinReferenciasNuncaModificaLaAuditoriaExistente() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        new EliminacionUsuarioRepository(jdbc).eliminar(3, 1, "evento ficticio");
        verify(jdbc, never()).update(startsWith("UPDATE historialauditoria"), any(Object[].class));
        verify(jdbc).update(startsWith("INSERT INTO historialauditoria"), any(Object[].class));
    }
}
