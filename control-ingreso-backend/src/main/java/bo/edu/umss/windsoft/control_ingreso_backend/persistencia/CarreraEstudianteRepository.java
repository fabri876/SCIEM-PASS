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
                SELECT DISTINCT trim(p.nombre) AS nombre
                    FROM usuario_carrera_plan e JOIN carrera_plan p USING(idcarrera)
                    JOIN estudiante s ON s.idusuario=e.idusuario
                    WHERE e.idusuario = ? AND s.codsisestudiante = ?
                ORDER BY nombre
                """, String.class, idUsuario, codSis);
    }

    public boolean existeEstudiante(Integer idUsuario) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM estudiante WHERE idusuario=?)", Boolean.class, idUsuario));
    }

    public boolean existeCarrera(Integer idCarrera) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM carrera_plan WHERE idcarrera=?)", Boolean.class, idCarrera));
    }

    public void vincular(Integer idUsuario, Integer idCarrera) {
        jdbc.update("""
                INSERT INTO usuario_carrera_plan(idusuario,idcarrera)
                SELECT idusuario,? FROM estudiante WHERE idusuario=?
                ON CONFLICT DO NOTHING
                """, idCarrera, idUsuario);
    }
}
