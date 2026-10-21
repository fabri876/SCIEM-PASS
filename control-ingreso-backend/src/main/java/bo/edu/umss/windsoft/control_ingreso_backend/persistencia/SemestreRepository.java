package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaSemestre;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;
@Repository
public class SemestreRepository {
 public record Resumen(int id,int anio,int numero,String estado,String observaciones,boolean simulado,boolean original){public String nombre(){return numero+"-"+anio;}}
 public record Docente(int id,int sis,String nombre,String apellido) {}
 public record CargaGrupo(FilaSemestre fila,List<Docente> docentes) {}
 private final JdbcTemplate jdbc;
 public SemestreRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
 private Resumen map(java.sql.ResultSet r,int n)throws java.sql.SQLException{return new Resumen(r.getInt("idsemestre"),r.getInt("anio"),r.getInt("numero"),r.getString("estado"),r.getString("observaciones"),r.getBoolean("simulado"),r.getBoolean("original"));}
 public Resumen actual(boolean bloquear){return jdbc.queryForObject("SELECT idsemestre,anio,numero,estado,observaciones,simulado,(pdf_original IS NOT NULL) original FROM semestre WHERE estado='ACTUAL'"+(bloquear?" FOR UPDATE":""),this::map);}
 public List<Resumen> historial(){return jdbc.query("SELECT idsemestre,anio,numero,estado,observaciones,simulado,(pdf_original IS NOT NULL) original FROM semestre s WHERE estado='FINALIZADO' AND (NOT simulado OR NOT EXISTS(SELECT 1 FROM semestre r WHERE r.anio=s.anio AND r.numero=s.numero AND NOT r.simulado)) ORDER BY anio DESC,numero DESC,simulado LIMIT 5",this::map);}
 public Resumen obtener(int id){var encontrados=jdbc.query("SELECT idsemestre,anio,numero,estado,observaciones,simulado,(pdf_original IS NOT NULL) original FROM semestre WHERE idsemestre=?",this::map,id);if(encontrados.isEmpty())throw new bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException("Semestre no encontrado.");return encontrados.getFirst();}
 public List<FilaSemestre> filasActuales(){return jdbc.query("""
  SELECT COALESCE(a.codigooficial,'ID:'||a.idasignatura) codigo,a.nombreasignatura,g.nombregrupo,
  COALESCE(string_agg(DISTINCT trim(u.nombreusuario||' '||u.apellidousuario),';;' ORDER BY trim(u.nombreusuario||' '||u.apellidousuario)),'') docentes
  FROM grupo g JOIN asignatura a ON a.idasignatura=g.idasignatura
  LEFT JOIN docentegrupo dg ON dg.idgrupo=g.idgrupo LEFT JOIN usuario u ON u.idusuario=dg.idusuario
  WHERE g.idsemestre=semestre_actual_id() AND g.estadogrupo=true GROUP BY a.idasignatura,a.codigooficial,a.nombreasignatura,g.nombregrupo ORDER BY codigo,g.nombregrupo
  """,(rs,n)->new FilaSemestre(rs.getString("codigo"),rs.getString("nombreasignatura"),rs.getString("nombregrupo"),nombres(rs.getString("docentes"))));}
 private List<String> nombres(String s){return s==null||s.isBlank()?List.of():List.of(s.split(";;"));}
 public List<FilaSemestre> filas(int id){return jdbc.query("SELECT codigo,asignatura,grupo,docentes FROM semestre_fila WHERE idsemestre=? ORDER BY codigo,grupo",(rs,n)->new FilaSemestre(rs.getString("codigo"),rs.getString("asignatura"),rs.getString("grupo"),nombres(rs.getString("docentes"))),id);}
 public List<Docente> docentes(){return jdbc.query("SELECT u.idusuario,d.codsisdocente,u.nombreusuario,u.apellidousuario FROM docente d JOIN usuario u ON u.idusuario=d.idusuario WHERE u.estadousuario=true ORDER BY u.idusuario",(rs,n)->new Docente(rs.getInt(1),rs.getInt(2),rs.getString(3),rs.getString(4)));}
 public int crear(int anio,int numero,String estado,String observaciones,boolean simulado,byte[] pdf,byte[] original){return jdbc.queryForObject("INSERT INTO semestre(anio,numero,estado,observaciones,simulado,pdf,pdf_original) VALUES (?,?,?,?,?,?,?) RETURNING idsemestre",Integer.class,anio,numero,estado,observaciones,simulado,pdf,original);}
 public void guardarFilas(int id,List<FilaSemestre> filas){jdbc.batchUpdate("INSERT INTO semestre_fila(idsemestre,codigo,asignatura,grupo,docentes) VALUES (?,?,?,?,?)",filas,100,(ps,f)->{ps.setInt(1,id);ps.setString(2,f.codigo());ps.setString(3,f.asignatura());ps.setString(4,f.grupo());ps.setString(5,String.join(";;",f.docentes()));});}
 public void cerrar(int id,byte[] pdf){
  jdbc.update("""
  INSERT INTO semestre_persona(idsemestre,idusuario,rol,idgrupo,nombre)
  SELECT ?,v.idusuario,v.rol,v.idgrupo,trim(u.nombreusuario||' '||u.apellidousuario)
  FROM (SELECT idusuario,idgrupo,'DOCENTE' rol FROM docentegrupo UNION ALL SELECT idusuario,idgrupo,'ESTUDIANTE' FROM estudiantegrupo UNION ALL SELECT idusuario,idgrupo,'OPERADOR' FROM ayudantegrupo) v
  JOIN grupo g ON g.idgrupo=v.idgrupo JOIN usuario u ON u.idusuario=v.idusuario WHERE g.idsemestre=?
  ON CONFLICT DO NOTHING
  """,id,id);
  jdbc.update("UPDATE semestre SET estado='FINALIZADO',pdf=? WHERE idsemestre=? AND estado='ACTUAL'",pdf,id);
 }
 public byte[] pdf(int id,boolean original){return jdbc.queryForObject("SELECT "+(original?"pdf_original":"pdf")+" FROM semestre WHERE idsemestre=?",byte[].class,id);}
 public void guardarOriginal(int id,byte[] original){jdbc.update("UPDATE semestre SET pdf_original=? WHERE idsemestre=?",original,id);}
 public List<FilaListadoDocente> listadoActual(){return jdbc.query("""
  SELECT COALESCE(a.codigooficial,'ID:'||a.idasignatura),a.nombreasignatura,g.nombregrupo,
   COALESCE(u.nombreusuario,'POR DESIGNAR'),COALESCE(u.apellidousuario,''),COALESCE(u.ciusuario,''),
   COALESCE(d.codsisdocente::text,''),COALESCE(u.correousuario,''),COALESCE(u.telefonousuario::text,'')
  FROM grupo g JOIN asignatura a ON a.idasignatura=g.idasignatura
  LEFT JOIN docentegrupo dg ON dg.idgrupo=g.idgrupo
  LEFT JOIN usuario u ON u.idusuario=dg.idusuario LEFT JOIN docente d ON d.idusuario=u.idusuario
  WHERE g.idsemestre=semestre_actual_id() AND g.estadogrupo=true
  ORDER BY a.nombreasignatura,g.nombregrupo,u.apellidousuario,u.nombreusuario
  """,(rs,n)->new FilaListadoDocente(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getString(6),rs.getString(7),rs.getString(8),rs.getString(9)));}
 public List<FilaListadoDocente> listado(int id){return jdbc.query("SELECT codigo,asignatura,grupo,nombre,apellido,ci,sis,correo,telefono FROM semestre_docente WHERE idsemestre=? ORDER BY asignatura,grupo,apellido,nombre",(rs,n)->new FilaListadoDocente(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getString(6),rs.getString(7),rs.getString(8),rs.getString(9)),id);}
 public void guardarListado(int id,List<FilaListadoDocente> filas){jdbc.batchUpdate("INSERT INTO semestre_docente(idsemestre,codigo,asignatura,grupo,nombre,apellido,ci,sis,correo,telefono) VALUES (?,?,?,?,?,?,?,?,?,?)",filas,100,(ps,f)->{ps.setInt(1,id);ps.setString(2,f.codigo());ps.setString(3,f.asignatura());ps.setString(4,f.grupo());ps.setString(5,f.nombre());ps.setString(6,f.apellido());ps.setString(7,f.ci());ps.setString(8,f.sis());ps.setString(9,f.correo());ps.setString(10,f.telefono());});}
 /** Solo se regeneran las muestras ficticias; los históricos reales no se reemplazan. */
 public int prepararEjemplo(int anio,int numero){
  var ids=jdbc.queryForList("SELECT idsemestre FROM semestre WHERE anio=? AND numero=? AND simulado=true",Integer.class,anio,numero);
  if(ids.isEmpty())return crear(anio,numero,"FINALIZADO","Listado amplio de demostracion. Todos los datos personales son ficticios.",true,null,null);
  int id=ids.getFirst();jdbc.update("DELETE FROM semestre_docente WHERE idsemestre=?",id);jdbc.update("DELETE FROM semestre_fila WHERE idsemestre=?",id);return id;
 }
 public void guardarPdfListado(int id,byte[] pdf,boolean ejemplo){jdbc.update("UPDATE semestre SET pdf=? WHERE idsemestre=?",pdf,id);if(ejemplo)guardarOriginal(id,pdf);}
 public int resolverAsignatura(FilaSemestre f){
  var ids=jdbc.queryForList("SELECT idasignatura FROM asignatura WHERE codigooficial=? OR ('ID:'||idasignatura)=?",Integer.class,f.codigo(),f.codigo());
  if(!ids.isEmpty())return ids.getFirst();
  int codigo;try{codigo=Integer.parseInt(f.codigo());}catch(NumberFormatException e){throw new IllegalArgumentException("Código de asignatura inválido: "+f.codigo());}
  jdbc.update("INSERT INTO asignatura(idasignatura,codigooficial,nombreasignatura) VALUES (?,?,?)",codigo,f.codigo(),f.asignatura());return codigo;
 }
 public int nuevoGrupo(int asignatura,String grupo){return jdbc.queryForObject("INSERT INTO grupo(idasignatura,nombregrupo,estadogrupo) VALUES (?,?,true) RETURNING idgrupo",Integer.class,asignatura,grupo);}
 public void crearCatalogo(List<CargaGrupo> cargas){
  Map<String,Integer> materias=new HashMap<>();
  for(var c:cargas)materias.computeIfAbsent(c.fila().codigo(),k->resolverAsignatura(c.fila()));
  jdbc.batchUpdate("INSERT INTO grupo(idasignatura,nombregrupo,estadogrupo) VALUES (?,?,true)",cargas,100,(ps,c)->{ps.setInt(1,materias.get(c.fila().codigo()));ps.setString(2,c.fila().grupo());});
  Map<String,Integer> grupos=new HashMap<>();
  jdbc.query("SELECT idgrupo,idasignatura,nombregrupo FROM grupo WHERE idsemestre=semestre_actual_id()",rs->{grupos.put(rs.getInt(2)+":"+rs.getString(3),rs.getInt(1));});
  List<Object[]> relaciones=new ArrayList<>(),asignaciones=new ArrayList<>();
  for(var c:cargas){int materia=materias.get(c.fila().codigo());int grupo=grupos.get(materia+":"+c.fila().grupo());for(var d:c.docentes()){relaciones.add(new Object[]{d.id(),d.sis(),grupo});asignaciones.add(new Object[]{d.id(),d.sis(),materia});}}
  jdbc.batchUpdate("INSERT INTO docenteasignatura(idusuario,codsisdocente,idasignatura) VALUES (?,?,?) ON CONFLICT DO NOTHING",asignaciones);
  jdbc.batchUpdate("INSERT INTO docentegrupo(idusuario,codsisdocente,idgrupo) VALUES (?,?,?) ON CONFLICT DO NOTHING",relaciones);
 }
 public void docente(int grupo,int asignatura,Docente d){
  jdbc.update("INSERT INTO docenteasignatura(idusuario,codsisdocente,idasignatura) VALUES (?,?,?) ON CONFLICT DO NOTHING",d.id(),d.sis(),asignatura);
  jdbc.update("INSERT INTO docentegrupo(idusuario,codsisdocente,idgrupo) VALUES (?,?,?) ON CONFLICT DO NOTHING",d.id(),d.sis(),grupo);
 }
 public boolean existe(int anio,int numero,boolean demo){return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM semestre WHERE anio=? AND numero=? AND simulado=?)",Boolean.class,anio,numero,demo));}
}
