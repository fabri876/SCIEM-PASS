package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenPublicoDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
@Repository
public class ExamenPublicoRepository {
    private final JdbcTemplate jdbc;
    public ExamenPublicoRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<ExamenPublicoDto> proximos(LocalDate hoy, LocalTime hora) {
        return consultar(hoy,hora,null,null);
    }
    public List<ExamenPublicoDto> proximosParaUsuario(LocalDate hoy, LocalTime hora,Integer id,String rol) {
        return consultar(hoy,hora,id,rol);
    }
    private List<ExamenPublicoDto> consultar(LocalDate hoy,LocalTime hora,Integer id,String rol) {
        String sql="""
            SELECT e.idexamen, am.idambiente, e.fechaexamen, a.nombreasignatura,
                   trim(concat_ws(' ', u.nombreusuario, u.apellidousuario)) AS docente,
                   concat_ws(' - ', au.nombreaula, NULLIF(au.ubicacionaula, '')) AS aula,
                   to_char(am.horainicio, 'HH24:MI') AS inicio, to_char(am.horafin, 'HH24:MI') AS fin
            FROM examen e
            JOIN asignatura a ON a.idasignatura = e.idasignatura
            LEFT JOIN usuario u ON u.idusuario = e.idusuario
            LEFT JOIN ambiente am ON am.idexamen = e.idexamen AND am.idasignatura = e.idasignatura
            LEFT JOIN aula au ON au.idaula = am.idaula
            WHERE e.idsemestre=(SELECT idsemestre FROM semestre WHERE estado='ACTUAL') AND e.estadoexamen = true AND e.fechaexamen BETWEEN ? AND ?
              AND (e.fechaexamen > ? OR am.horafin IS NULL OR am.horafin > ?)
            ORDER BY e.fechaexamen, am.horainicio NULLS LAST, e.idexamen, am.idambiente
            """;
        // Dias calendario inclusivos: hoy, manana y pasado manana, en la fecha boliviana del servicio.
        var argumentos=new java.util.ArrayList<Object>(java.util.List.of(hoy,hoy.plusDays(2),hoy,hora));
        if(id!=null) {
            sql=sql.replace("ORDER BY",VisibilidadExamenSql.FILTRO+" ORDER BY");
            argumentos.addAll(java.util.Arrays.asList(VisibilidadExamenSql.parametros(id,rol)));
        }
        return jdbc.query(sql, (rs, n) -> new ExamenPublicoDto(rs.getInt("idexamen"), rs.getObject("idambiente", Integer.class),
                rs.getObject("fechaexamen", LocalDate.class), rs.getString("nombreasignatura"),
                rs.getString("docente"), rs.getString("aula"), rs.getString("inicio"), rs.getString("fin")),
            argumentos.toArray());
    }
}
