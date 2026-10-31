package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Grupo;
import java.sql.Types;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class HorarioCatalogoJdbcRepository {
    private final JdbcTemplate jdbc;
    public HorarioCatalogoJdbcRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(propagation=Propagation.MANDATORY)
    public void guardar(List<Asignatura> nuevas, List<Asignatura> codigos, List<Grupo> grupos) {
        batch("INSERT INTO asignatura (idasignatura,nombreasignatura,codigooficial) VALUES (?,?,?)",
                nuevas.stream().map(a -> new Object[]{a.getIdAsignatura(),a.getNombreAsignatura(),a.getCodigoOficial()}).toList(),
                new int[]{Types.INTEGER,Types.VARCHAR,Types.VARCHAR});
        batch("UPDATE asignatura SET codigooficial=? WHERE idasignatura=? AND codigooficial IS NULL",
                codigos.stream().map(a -> new Object[]{a.getCodigoOficial(),a.getIdAsignatura()}).toList(),
                new int[]{Types.VARCHAR,Types.INTEGER});
        batch("INSERT INTO grupo (idasignatura,nombregrupo,estadogrupo) VALUES (?,?,?)",
                grupos.stream().map(g -> new Object[]{g.getIdAsignatura(),g.getNombreGrupo(),g.getEstadoGrupo()}).toList(),
                new int[]{Types.INTEGER,Types.VARCHAR,Types.BOOLEAN});
    }
    private void batch(String sql, List<Object[]> filas, int[] tipos) {
        for (int i=0;i<filas.size();i+=50) {
            for (int n:jdbc.batchUpdate(sql,filas.subList(i,Math.min(i+50,filas.size())),tipos))
                if (n!=1 && n!=java.sql.Statement.SUCCESS_NO_INFO) throw new IllegalStateException("El catalogo cambio durante la importacion. Revise y vuelva a cargar el horario.");
        }
    }
}
