package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Consulta de referencias históricas para validar cambios de rol. */
@Repository
public class UsuarioHistorialRepository {
    private final JdbcTemplate jdbc;
    public UsuarioHistorialRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean tieneHistorial(Integer id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM (SELECT idusuario,idgrupo FROM docentegrupo UNION ALL SELECT idusuario,idgrupo FROM estudiantegrupo UNION ALL SELECT idusuario,idgrupo FROM ayudantegrupo) v JOIN grupo g ON g.idgrupo=v.idgrupo JOIN semestre s ON s.idsemestre=g.idsemestre WHERE v.idusuario=? AND s.estado='FINALIZADO')
                    OR EXISTS(SELECT 1 FROM examen WHERE idusuario = ?)
                    OR EXISTS(SELECT 1 FROM ingreso WHERE idusuario = ? OR est_idusuario = ?)
                    OR EXISTS(SELECT 1 FROM incidencia WHERE idusuarioreporta = ? OR idusuariorevisa = ?
                        OR idusuarioresuelve = ? OR est_idusuario = ?)
                    OR EXISTS(SELECT 1 FROM habilitacion WHERE idusuario = ?)
                    OR EXISTS(SELECT 1 FROM expulsion WHERE idusuario = ?)
                    OR EXISTS(SELECT 1 FROM cambioambiente WHERE idusuario = ?)
                    OR EXISTS(SELECT 1 FROM inscrito WHERE idusuario = ?)
                    OR EXISTS(SELECT 1 FROM intentosnoautorizados WHERE idusuario = ? OR est_idusuario = ?)
                    OR EXISTS(SELECT 1 FROM ayudante_examen WHERE idayudante = ?)
                    OR EXISTS(SELECT 1 FROM horarioregular WHERE idusuario = ?)
                    OR EXISTS(SELECT 1 FROM credencial WHERE idusuario = ? AND idexamen IS NOT NULL)
                    OR EXISTS(SELECT 1 FROM historialauditoria WHERE idusuario = ?)
                """, Boolean.class, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id));
    }

}
