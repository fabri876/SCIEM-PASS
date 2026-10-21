package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaSemestre;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.charset.Charset;
import java.util.*;
@Service
public class PdfSemestreService {
 public static final String LISTADO_METADATA="SCIEM_LISTADO_V1";
 public byte[] generarListado(String semestre,List<FilaListadoDocente> filas,boolean simulado){
  final float[] anchos={60,180,34,95,100,65,65,145,58};
  final String[] titulos={"Codigo","Asignatura","Grupo","Nombre","Apellido","CI","SIS","Correo","Telefono"};
  final float tam=7.2f;
  try(var doc=new PDDocument();var out=new ByteArrayOutputStream()){
   var fuente=new PDType1Font(Standard14Fonts.FontName.HELVETICA);
   var negrita=new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
   // La copia estructurada permite reimportar sin depender de los saltos de línea de una tabla.
   doc.getDocumentInformation().setCustomMetadataValue(LISTADO_METADATA,Base64.getEncoder().encodeToString(new tools.jackson.databind.ObjectMapper().writeValueAsBytes(filas)));
   int indice=0,pagina=0;
   do {
    var hoja=new PDPage(new PDRectangle(842,595));doc.addPage(hoja);pagina++;
    try(var cs=new PDPageContentStream(doc,hoja)){
     cs.setNonStrokingColor(20/255f,42/255f,70/255f);
     texto(cs,negrita,17,20,562,"Listado de docentes - Semestre "+semestre);
     texto(cs,fuente,9,20,543,"Asignaturas y grupos | "+filas.size()+" asignaciones | Datos del periodo seleccionado");
     if(simulado){cs.setNonStrokingColor(0.68f,0.27f,0.02f);texto(cs,negrita,10,20,524,"DATOS SIMULADOS - IDENTIDADES FICTICIAS - NO ES UN DOCUMENTO OFICIAL");}
     float y=simulado?505:522;
     cs.setNonStrokingColor(0.08f,0.18f,0.31f);cs.addRect(20,y-23,802,23);cs.fill();
     cs.setNonStrokingColor(1f,1f,1f);float x=20;
     for(int c=0;c<titulos.length;c++){texto(cs,negrita,8,x+4,y-15,titulos[c]);x+=anchos[c];}
     y-=23;
     if(filas.isEmpty()){cs.setNonStrokingColor(0.2f,0.2f,0.2f);texto(cs,fuente,10,24,y-25,"No hay asignaciones docentes registradas.");}
     while(indice<filas.size()){
      var f=filas.get(indice);String[] valores={f.codigo(),f.asignatura(),f.grupo(),f.nombre(),f.apellido(),f.ci(),f.sis(),f.correo(),f.telefono()};
      List<List<String>> celdas=new ArrayList<>();int max=1;
      for(int c=0;c<valores.length;c++){var partes=envolver(valores[c],anchos[c]-8,fuente,tam);celdas.add(partes);max=Math.max(max,partes.size());}
      float alto=Math.max(26,max*10+12);if(alto>400)throw new IllegalArgumentException("Un dato del listado es demasiado largo.");
      if(y-alto<36)break;
      cs.setNonStrokingColor(indice%2==0?0.96f:1f,indice%2==0?0.97f:1f,indice%2==0?0.99f:1f);cs.addRect(20,y-alto,802,alto);cs.fill();
      cs.setNonStrokingColor(0.16f,0.20f,0.26f);x=20;
      for(int c=0;c<celdas.size();c++){float base=y-13;for(String linea:celdas.get(c)){texto(cs,fuente,tam,x+4,base,linea);base-=10;}x+=anchos[c];}
      y-=alto;indice++;
     }
    }
   }while(indice<filas.size());
   for(int i=0;i<doc.getNumberOfPages();i++)try(var cs=new PDPageContentStream(doc,doc.getPage(i),PDPageContentStream.AppendMode.APPEND,true,true)){
    cs.setNonStrokingColor(0.35f,0.4f,0.45f);texto(cs,fuente,8,20,18,"SCIEM-PASS | "+semestre);texto(cs,fuente,8,720,18,"Pagina "+(i+1)+" de "+doc.getNumberOfPages());
   }
   doc.save(out);return out.toByteArray();
  }catch(IOException e){throw new IllegalStateException("No se pudo generar el listado de docentes.",e);}
 }
 private String seguro(String s){return new String((s==null||s.isBlank()?"-":s).replaceAll("[\\p{Cntrl}]"," ").getBytes(Charset.forName("windows-1252")),Charset.forName("windows-1252"));}
 private void texto(PDPageContentStream cs,org.apache.pdfbox.pdmodel.font.PDFont fuente,float tam,float x,float y,String valor)throws IOException{
  cs.beginText();cs.setFont(fuente,tam);cs.newLineAtOffset(x,y);cs.showText(seguro(valor));cs.endText();
 }
 private List<String> envolver(String valor,float ancho,org.apache.pdfbox.pdmodel.font.PDFont fuente,float tam)throws IOException{
  String restante=seguro(valor);List<String> resultado=new ArrayList<>();
  while(!restante.isEmpty()){int corte=restante.length();while(corte>1&&fuente.getStringWidth(restante.substring(0,corte))*tam/1000>ancho)corte--;
   if(corte<restante.length()){int espacio=restante.lastIndexOf(' ',corte);if(espacio>0)corte=espacio;}
   resultado.add(restante.substring(0,corte));restante=restante.substring(corte).stripLeading();
  }return resultado;
 }
 public byte[] generar(String semestre,List<FilaSemestre> filas,boolean simulado){
  try(var doc=new PDDocument();var out=new ByteArrayOutputStream()){
   var lineas=new ArrayList<String>();lineas.add("SCIEM-PASS - Semestre "+semestre);if(simulado)lineas.add("DATOS SIMULADOS - NO ES UN HORARIO OFICIAL");
   lineas.add("CODIGO | ASIGNATURA | GRUPO | DOCENTES");
   for(var f:filas){String linea=f.codigo()+" | "+f.asignatura()+" | "+f.grupo()+" | "+(f.docentes().isEmpty()?"POR DESIGNAR":String.join(";;",f.docentes()));while(linea.length()>145){int corte=linea.lastIndexOf(' ',145);if(corte<1)corte=145;lineas.add(linea.substring(0,corte));linea=linea.substring(corte).stripLeading();}lineas.add(linea);}
   if(filas.isEmpty())lineas.add("Sin grupos registrados.");
   for(int inicio=0;inicio<lineas.size();inicio+=39){var page=new PDPage(new PDRectangle(842,595));doc.addPage(page);try(var cs=new PDPageContentStream(doc,page)){cs.beginText();cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),9);cs.newLineAtOffset(30,560);for(String l:lineas.subList(inicio,Math.min(inicio+39,lineas.size()))){String safe=new String(l.getBytes(Charset.forName("windows-1252")),Charset.forName("windows-1252"));cs.showText(safe);cs.newLineAtOffset(0,-13);}cs.endText();}}
   doc.save(out);return out.toByteArray();
  }catch(IOException e){throw new IllegalStateException("No se pudo generar el PDF del semestre.",e);}
 }
}
