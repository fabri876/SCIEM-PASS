package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Consulta solo carreras vinculadas al estudiante; no las infiere de la asignatura. */
@Repository
public class CarreraEstudianteRepository {
    private final JdbcTemplate jdbc;
    public CarreraEstudianteRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<String> nombres(Integer idUsuario, Integer codSis) {
        return jdbc.queryForList("""
                SELECT DISTINCT trim(nombrecarrera)
                  FROM public.carrera
                 WHERE idusuario = ? AND codsisestudiante = ?
                   AND nombrecarrera IS NOT NULL AND trim(nombrecarrera) <> ''
                 ORDER BY trim(nombrecarrera)
                """, String.class, idUsuario, codSis);
    }
}
