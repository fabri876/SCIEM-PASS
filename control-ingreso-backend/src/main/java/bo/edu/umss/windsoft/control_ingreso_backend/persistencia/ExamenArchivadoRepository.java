package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ExamenArchivado;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.*;
@Repository
public class ExamenArchivadoRepository {
    private final JdbcTemplate jdbc;
    public ExamenArchivadoRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public Long guardar(ExamenArchivadoRequest d, byte[] pdf, String sha) {
        var ids=jdbc.queryForList("""
            INSERT INTO examen_pasado_documento(titulo,periodo,fecha,observaciones,pdf,sha256)
            VALUES (?,?,?,?,?,?) ON CONFLICT(sha256) DO NOTHING RETURNING id
            """,Long.class,d.strNombre().trim(),d.strPeriodo(),d.strFecha(),
            Objects.requireNonNullElse(d.strObservaciones(),"").trim(),pdf,sha);
        return ids.isEmpty()?null:ids.getFirst();
    }
    public List<ExamenArchivado> listar(int limite,int offset) {
        return jdbc.query("""
            SELECT id,titulo,periodo,fecha,observaciones FROM examen_pasado_documento
            ORDER BY substring(periodo from 3)::integer DESC,substring(periodo from 1 for 1)::integer DESC,
              fecha DESC NULLS LAST,id DESC LIMIT ? OFFSET ?
            """,(r,n)->new ExamenArchivado(r.getLong("id"),r.getString("titulo"),r.getString("periodo"),
                r.getObject("fecha",LocalDate.class),r.getString("observaciones")),limite,offset);
    }
    public Optional<byte[]> pdf(long id) {
        return jdbc.query("SELECT pdf FROM examen_pasado_documento WHERE id=?",(r,n)->r.getBytes(1),id)
            .stream().findFirst();
    }
}
