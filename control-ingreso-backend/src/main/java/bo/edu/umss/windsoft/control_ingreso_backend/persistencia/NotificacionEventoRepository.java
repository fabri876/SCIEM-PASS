package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NotificacionEventoRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public NotificacionEventoRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc=jdbc; }
    public record Evento(long id,int idExamen,int idAsignatura,String tipo,String titulo,
                         String descripcion,OffsetDateTime fecha,String asignatura,
                         java.time.LocalDate fechaExamen,String aulas,String horarios,Integer codigoSis) {}

    public List<Evento> propios(int usuario,String rol) {
        return propios(usuario,rol,null,null,null);
    }
    public List<Evento> propios(int usuario,String rol,Integer carrera,Integer nivel,Integer asignatura) {
        return jdbc.query("""
            SELECT n.*,e.idasignatura,a.nombreasignatura,e.fechaexamen,
              (SELECT string_agg(DISTINCT au.nombreaula, ', ' ORDER BY au.nombreaula)
               FROM ambiente am JOIN aula au USING(idaula) WHERE am.idexamen=e.idexamen
                 AND (:rol NOT IN ('OPERADOR','AYUDANTE') OR EXISTS(SELECT 1 FROM ayudante_examen ae
                   WHERE ae.idambiente=am.idambiente AND ae.idayudante=:usuario AND ae.estado_asignacion='ACTIVO'))) AS aulas,
              (SELECT string_agg(DISTINCT to_char(am.horainicio,'HH24:MI')||' - '||to_char(am.horafin,'HH24:MI'), ', ')
               FROM ambiente am WHERE am.idexamen=e.idexamen
                 AND (:rol NOT IN ('OPERADOR','AYUDANTE') OR EXISTS(SELECT 1 FROM ayudante_examen ae
                   WHERE ae.idambiente=am.idambiente AND ae.idayudante=:usuario AND ae.estado_asignacion='ACTIVO'))) AS horarios,
              (SELECT codsisestudiante FROM estudiante WHERE idusuario=:usuario LIMIT 1) AS sis
            FROM notificacion_evento n JOIN examen e USING(idexamen)
            JOIN asignatura a ON a.idasignatura=e.idasignatura
            WHERE e.idsemestre=semestre_actual_id() AND n.fecha >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            AND (CAST(:asignatura AS integer) IS NULL OR e.idasignatura=:asignatura)
            AND ((CAST(:carrera AS integer) IS NULL AND CAST(:nivel AS integer) IS NULL) OR EXISTS (
              SELECT 1 FROM asignatura_carrera_nivel ac
              WHERE ac.idasignatura=e.idasignatura AND ac.idsemestre=e.idsemestre
              AND (CAST(:carrera AS integer) IS NULL OR ac.idcarrera=:carrera)
              AND (CAST(:nivel AS integer) IS NULL OR ac.idnivel=:nivel)))
            AND (
              (n.destinatario=:usuario AND (n.tipo<>'RETIRO' OR NOT EXISTS(
                  SELECT 1 FROM ayudante_examen ae WHERE ae.idexamen=e.idexamen
                  AND ae.idayudante=:usuario AND ae.estado_asignacion='ACTIVO'))
                AND (n.tipo<>'ASIGNACION' OR EXISTS(
                  SELECT 1 FROM ayudante_examen ae WHERE ae.idexamen=e.idexamen
                  AND ae.idayudante=:usuario AND ae.estado_asignacion='ACTIVO')))
              OR (n.destinatario IS NULL AND (
                :rol='ADMINISTRADOR'
                OR (:rol='DOCENTE' AND (e.idusuario=:usuario OR EXISTS(
                  SELECT 1 FROM docentegrupo d JOIN grupo g USING(idgrupo) WHERE d.idusuario=:usuario
                  AND g.idsemestre=e.idsemestre AND g.idasignatura=e.idasignatura
                  AND (e.idgrupo IS NULL OR e.idgrupo=g.idgrupo))))
                OR (:rol='ESTUDIANTE' AND n.tipo<>'INCIDENCIA' AND EXISTS(
                  SELECT 1 FROM estudiantegrupo s JOIN grupo g USING(idgrupo) WHERE s.idusuario=:usuario
                  AND g.idsemestre=e.idsemestre AND g.idasignatura=e.idasignatura
                  AND (e.idgrupo IS NULL OR e.idgrupo=g.idgrupo))
                  AND (n.tipo<>'PROGRAMADO' OR NOT EXISTS(SELECT 1 FROM habilitacion h
                    WHERE h.idusuario=:usuario AND h.idexamen=e.idexamen AND h.estadohabilitacion=false)))
                OR (:rol IN ('OPERADOR','AYUDANTE') AND n.tipo NOT IN ('INCIDENCIA','PROGRAMADO') AND EXISTS(
                  SELECT 1 FROM ayudante_examen ae WHERE ae.idexamen=e.idexamen AND ae.idayudante=:usuario
                  AND ae.estado_asignacion='ACTIVO'))
              ) AND (n.tipo NOT IN ('PROGRAMADO','AULA','HORARIO') OR
                    (e.estadoexamen=true AND e.fechaexamen >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date)))
            )
            ORDER BY n.fecha DESC,n.id DESC LIMIT 100
            """,new org.springframework.jdbc.core.namedparam.MapSqlParameterSource()
                .addValue("usuario",usuario).addValue("rol",rol)
                .addValue("carrera",carrera,java.sql.Types.INTEGER).addValue("nivel",nivel,java.sql.Types.INTEGER)
                .addValue("asignatura",asignatura,java.sql.Types.INTEGER),(r,i)->new Evento(r.getLong("id"),r.getInt("idexamen"),
                r.getInt("idasignatura"),r.getString("tipo"),r.getString("titulo"),r.getString("descripcion"),
                r.getObject("fecha",OffsetDateTime.class),r.getString("nombreasignatura"),
                r.getObject("fechaexamen",java.time.LocalDate.class),r.getString("aulas"),r.getString("horarios"),r.getObject("sis",Integer.class)));
    }
}
