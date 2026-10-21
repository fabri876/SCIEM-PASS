package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Borrado físico de cuentas sin actividad de exámenes, dentro de la transacción del servicio. */
@Repository
public class EliminacionUsuarioRepository {
    private final JdbcTemplate jdbc;
    public EliminacionUsuarioRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void bloquear(Integer id) {
        jdbc.queryForObject("SELECT idusuario FROM usuario WHERE idusuario = ? FOR UPDATE", Integer.class, id);
    }

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
                """, Boolean.class, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id));
    }

    public void eliminar(Integer id, Integer idAdministrador, String accion) {
        jdbc.update("DELETE FROM docentegrupo WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM estudiantegrupo WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM ayudantegrupo WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM docenteasignatura WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM carrera WHERE idusuario = ?", id);
        jdbc.update("UPDATE usuario SET idcredencial = NULL WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM credencial WHERE idusuario = ?", id);
        // El texto de auditoría conserva ejecutor y afectado; se retira solo el enlace a la cuenta borrada.
        jdbc.update("UPDATE historialauditoria SET idusuario = NULL WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM docente WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM estudiante WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM ayudante WHERE idusuario = ?", id);
        jdbc.update("DELETE FROM usuario WHERE idusuario = ?", id);
        jdbc.update("INSERT INTO historialauditoria (idusuario, accion, fechaaccion) VALUES (?, ?, CURRENT_TIMESTAMP)", idAdministrador, accion);
    }
}
