package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReporteIntentoDto;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

import java.sql.ResultSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReporteIntentosRepositoryTest {
    @Test
    void muestraDestinoRegistradoSinConfundirAulaPresentada() throws Exception {
        var jdbc = mock(NamedParameterJdbcTemplate.class);
        var rs = mock(ResultSet.class);
        when(rs.getString("motivointento")).thenReturn("EXAMEN_INCORRECTO", "DUPLICADO");
        when(rs.getString("aula_presentada")).thenReturn("Aula 1");
        when(rs.getString("aula_asignada")).thenReturn("Aula 9");
        when(rs.getString("asignatura_destino")).thenReturn("Calculo");
        when(rs.getString("tipo_examen_destino")).thenReturn("Parcial");
        when(rs.getString("aula_destino")).thenReturn("Aula 7");
        when(jdbc.query(anyString(), any(SqlParameterSource.class),
                org.mockito.ArgumentMatchers.<RowMapper<ReporteIntentoDto>>any())).thenAnswer(inv -> {
            RowMapper<ReporteIntentoDto> mapper = inv.getArgument(2);
            return List.of(mapper.mapRow(rs, 0), mapper.mapRow(rs, 1));
        });
        var registros = new ReporteIntentosRepository(jdbc).listar(1, null, null, null, null, null);
        assertEquals("Calculo Parcial Aula 7", registros.get(0).examenAulaAsignada());
        assertEquals("Aula 9", registros.get(1).examenAulaAsignada());
        assertEquals("Aula 1", registros.get(0).sePresentoEn());
    }

    @Test
    void soloMuestraReubicacionConVinculoExplicito() throws Exception {
        var jdbc = mock(NamedParameterJdbcTemplate.class);
        var rs = mock(ResultSet.class);
        when(rs.getString("motivointento")).thenReturn("AMBIENTE_DIFERENTE");
        when(rs.getBoolean("reubicacion_registrada")).thenReturn(true, false);
        when(jdbc.query(anyString(), any(SqlParameterSource.class),
                org.mockito.ArgumentMatchers.<RowMapper<ReporteIntentoDto>>any())).thenAnswer(inv -> {
            assertTrue(((String) inv.getArgument(0)).contains("ca.idintento_origen = i.idintento"));
            RowMapper<ReporteIntentoDto> mapper = inv.getArgument(2);
            return List.of(mapper.mapRow(rs, 0), mapper.mapRow(rs, 1));
        });
        var registros = new ReporteIntentosRepository(jdbc).listar(1, null, null, null, null, null);
        assertEquals("Reubicado e ingreso registrado", registros.get(0).estadoPosterior());
        assertNull(registros.get(1).estadoPosterior());
    }
}
