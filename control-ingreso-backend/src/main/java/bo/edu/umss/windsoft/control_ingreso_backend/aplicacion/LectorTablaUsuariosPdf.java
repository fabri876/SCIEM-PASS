package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import java.io.IOException;
import java.util.*;
import java.util.regex.Pattern;

/** Lee las columnas por su posición, sin adivinar dónde terminan los apellidos. */
final class LectorTablaUsuariosPdf extends PDFTextStripper {
    record Fila(int numero, Map<String,String> datos) {}
    private final List<List<TextPosition>> paginas = new ArrayList<>();
    private List<TextPosition> pagina;
    LectorTablaUsuariosPdf() throws IOException { setSortByPosition(true); }
    @Override protected void startPage(org.apache.pdfbox.pdmodel.PDPage page) throws IOException {
        super.startPage(page); pagina=new ArrayList<>();paginas.add(pagina);
    }
    @Override protected void writeString(String text,List<TextPosition> positions) { pagina.addAll(positions); }
    static List<Fila> leer(PDDocument document) throws IOException {
        var lector=new LectorTablaUsuariosPdf();lector.getText(document);
        List<Fila> resultado=new ArrayList<>();
        Map<String,Float> columnas=new LinkedHashMap<>();int numero=1;
        for(var pagina:lector.paginas) {
            var lineas=new TreeMap<Integer,List<TextPosition>>();
            for(var pos:pagina) lineas.computeIfAbsent(Math.round(pos.getYDirAdj()/3),k->new ArrayList<>()).add(pos);
            for(var linea:lineas.values()) {
                linea.sort(Comparator.comparing(TextPosition::getXDirAdj));
                StringBuilder texto=new StringBuilder();List<Float> xs=new ArrayList<>();
                for(var pos:linea) for(int i=0;i<pos.getUnicode().length();i++){texto.append(pos.getUnicode().charAt(i));xs.add(pos.getXDirAdj());}
                var encabezado=Pattern.compile("ID_ASIGNATURA|CODIGO_ASIGNATURA|ASIGNATURA|CODSIS|CORREO|APELLIDOS|NOMBRES|TELEFONO|GRUPO|CI").matcher(texto.toString().toUpperCase(Locale.ROOT));
                Map<String,Float> detectadas=new LinkedHashMap<>();
                while(encabezado.find()) detectadas.put(encabezado.group(),xs.get(encabezado.start()));
                if(detectadas.containsKey("CODSIS") && detectadas.containsKey("APELLIDOS") && detectadas.containsKey("NOMBRES")) { columnas=detectadas;continue; }
                if(columnas.isEmpty()) continue;
                Map<String,StringBuilder> valores=new LinkedHashMap<>(); Map<String,Float> fin=new HashMap<>();
                for(var pos:linea){
                    String col=null;
                    for(var c:columnas.entrySet()) if(pos.getXDirAdj()>=c.getValue()-2) col=c.getKey();
                    if(col==null) continue;
                    var valor=valores.computeIfAbsent(col,k->new StringBuilder());
                    if(fin.containsKey(col)&&pos.getXDirAdj()-fin.get(col)>pos.getWidthOfSpace()*0.4f) valor.append(' ');
                    valor.append(pos.getUnicode());fin.put(col,pos.getXDirAdj()+pos.getWidthDirAdj());
                }
                Map<String,String> datos=new LinkedHashMap<>();valores.forEach((k,v)->datos.put(k,v.toString().trim().replaceAll("\\s+"," ")));
                if(datos.getOrDefault("CODSIS","").isBlank()&&datos.getOrDefault("CORREO","").isBlank()) continue;
                if(resultado.size()>=2000) throw new SolicitudInvalidaException("El archivo supera el máximo de 2000 filas. Divida la lista en varios archivos.");
                resultado.add(new Fila(++numero,datos));
            }
        }
        if(columnas.isEmpty()) throw new SolicitudInvalidaException("El PDF debe contener una tabla con CODSIS, CORREO, CI, APELLIDOS, NOMBRES y TELEFONO. Use Excel si el PDF no conserva las columnas.");
        return resultado;
    }
}
