package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CambioExamenDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
@Repository
public class CambioExamenRepository {
 private final JdbcTemplate jdbc;
 public CambioExamenRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
 public void guardar(Integer examen, String tipo, String anterior, String actual) {
  jdbc.update("INSERT INTO cambio_examen (idexamen,tipo,anterior,actual) VALUES (?,?,?,?)", examen,tipo,anterior,actual);
 }
 public List<CambioExamenDto> recientes() {
  return jdbc.query("""
   SELECT c.id,a.nombreasignatura,c.tipo,c.anterior,c.actual,c.fecha
   FROM cambio_examen c JOIN examen e ON e.idexamen=c.idexamen
   JOIN asignatura a ON a.idasignatura=e.idasignatura
   WHERE e.idsemestre=(SELECT idsemestre FROM semestre WHERE estado='ACTUAL') AND e.estadoexamen=true
   AND e.fechaexamen >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
   AND c.fecha >= CURRENT_TIMESTAMP - INTERVAL '7 days'
   ORDER BY c.fecha DESC,c.id DESC LIMIT 100
   """,(rs,n)-> new CambioExamenDto(rs.getLong("id"),rs.getString("nombreasignatura"),rs.getString("tipo"),rs.getString("anterior"),rs.getString("actual"),rs.getObject("fecha",OffsetDateTime.class)));
 }
}
