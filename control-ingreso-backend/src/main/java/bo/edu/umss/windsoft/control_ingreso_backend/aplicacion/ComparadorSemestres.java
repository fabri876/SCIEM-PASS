package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaSemestre;
import java.text.Normalizer;
import java.util.*;
public final class ComparadorSemestres {
 private ComparadorSemestres() {}
 public record Diferencia(String codigo,String asignatura,String grupo,String tipo,List<String> anterior,List<String> actual) {}
 public static String normalizar(String s){return Normalizer.normalize(s==null?"":s,Normalizer.Form.NFD).replaceAll("\\p{M}","").trim().replaceAll("\\s+"," ").toUpperCase(Locale.ROOT);}
 public static List<Diferencia> comparar(List<FilaSemestre> anterior,List<FilaSemestre> actual){
  Map<String,FilaSemestre> a=indexar(anterior), b=indexar(actual);var claves=new TreeSet<>(a.keySet());claves.addAll(b.keySet());
  List<Diferencia> resultado=new ArrayList<>();
  for(String k:claves){var x=a.get(k);var y=b.get(k);var f=y==null?x:y;
   String tipo=x==null?"GRUPO_NUEVO":y==null?"GRUPO_RETIRADO":nombres(x).equals(nombres(y))?"SIN_CAMBIOS":"CAMBIO_DOCENTE";
   resultado.add(new Diferencia(f.codigo(),f.asignatura(),f.grupo(),tipo,x==null?List.of():x.docentes(),y==null?List.of():y.docentes()));
  }return resultado;
 }
 private static Set<String> nombres(FilaSemestre f){var n=new TreeSet<String>();for(String s:f.docentes())n.add(normalizar(s));return n;}
 private static Map<String,FilaSemestre> indexar(List<FilaSemestre> filas){var m=new LinkedHashMap<String,FilaSemestre>();for(var f:filas){String k=f.codigo()+":"+normalizar(f.grupo());if(m.putIfAbsent(k,f)!=null)throw new IllegalArgumentException("Grupo repetido en semestre: "+k);}return m;}
}
