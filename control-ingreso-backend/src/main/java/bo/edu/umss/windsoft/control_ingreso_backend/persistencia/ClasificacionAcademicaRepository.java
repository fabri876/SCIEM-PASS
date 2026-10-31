package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ClasificacionHorario;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ClasificacionAcademicaRepository {
    private final JdbcTemplate jdbc;
    public ClasificacionAcademicaRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public record Carrera(Integer idCarrera, String codigo, String nombre) {}
    public record Nivel(Integer idNivel, String nombre, Integer orden) {}
    public record Materia(Integer idAsignatura, String codigoOficial, String nombreAsignatura) {}
    public List<Carrera> carreras() {
        return jdbc.query("SELECT idcarrera,codigo,nombre FROM carrera_plan ORDER BY nombre,codigo",
                (r,n)->new Carrera(r.getInt(1),r.getString(2),r.getString(3)));
    }
    public List<Nivel> niveles(Integer carrera) {
        return jdbc.query("SELECT idnivel,nombre,orden FROM nivel_carrera WHERE idcarrera=? ORDER BY orden,nombre",
                (r,n)->new Nivel(r.getInt(1),r.getString(2),r.getInt(3)),carrera);
    }
    public List<Materia> materias(Integer carrera,Integer nivel) {
        return jdbc.query("""
            SELECT a.idasignatura,a.codigooficial,a.nombreasignatura
            FROM asignatura a JOIN asignatura_carrera_nivel c USING(idasignatura)
            WHERE c.idsemestre=semestre_actual_id() AND c.idcarrera=? AND c.idnivel=?
            ORDER BY a.nombreasignatura,a.codigooficial
            """,(r,n)->new Materia(r.getInt(1),r.getString(2),r.getString(3)),carrera,nivel);
    }
    public void clasificar(ClasificacionHorario datos,String codigoPlan) {
        if(datos==null || datos.carrera()==null || datos.materias().isEmpty()) return;
        String codigo=codigoPlan;
        if(codigo==null) {
            var coincidencias=jdbc.queryForList("SELECT codigo FROM carrera_plan WHERE nombre=?",String.class,datos.carrera());
            if(coincidencias.size()>1) throw new bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException("Hay varios planes de esta carrera. Conserve el nombre oficial del PDF (código del plan.pdf).");
            codigo=coincidencias.isEmpty()?datos.carrera():coincidencias.getFirst();
        }
        int carrera=jdbc.queryForObject("INSERT INTO carrera_plan(codigo,nombre) VALUES (?,?) ON CONFLICT(codigo) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING idcarrera",Integer.class,codigo,datos.carrera());
        Map<String,Integer> niveles=new LinkedHashMap<>();
        for(var m:datos.materias()) niveles.computeIfAbsent(m.nivel(),nivel -> jdbc.queryForObject(
                "INSERT INTO nivel_carrera(idcarrera,nombre,orden) VALUES (?,?,?) ON CONFLICT(idcarrera,nombre) DO UPDATE SET orden=EXCLUDED.orden RETURNING idnivel",
                Integer.class,carrera,nivel,orden(nivel)));
        List<Object[]> filas=datos.materias().stream().map(m->new Object[]{m.codigo().toString(),carrera,niveles.get(m.nivel())}).toList();
        jdbc.batchUpdate("INSERT INTO asignatura_carrera_nivel(idasignatura,idcarrera,idnivel) SELECT idasignatura,?,? FROM asignatura WHERE codigooficial=? ON CONFLICT DO NOTHING",
                filas,100,(ps,f)->{ps.setInt(1,(Integer)f[1]);ps.setInt(2,(Integer)f[2]);ps.setString(3,(String)f[0]);});
    }
    public void vincular(Integer materia,Integer carrera,Integer nivel) {
        jdbc.update("INSERT INTO asignatura_carrera_nivel(idasignatura,idcarrera,idnivel) VALUES (?,?,?) ON CONFLICT DO NOTHING",materia,carrera,nivel);
    }
    public String gestionActual() {
        return jdbc.queryForObject("SELECT numero||'/'||anio FROM semestre WHERE estado='ACTUAL'",String.class);
    }
    private int orden(String nivel) { return nivel.matches("[A-Z]") ? nivel.charAt(0)-'A'+1 : Integer.parseInt(nivel); }
}
