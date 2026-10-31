package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AsignacionHorario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.regex.*;
import java.io.IOException;

@Component
public class LectorHorarioPdf {
    public bo.edu.umss.windsoft.control_ingreso_backend.dominio.ClasificacionHorario leerClasificacion(byte[] bytes) {
        try (var documento=Loader.loadPDF(bytes)) {
            if(documento.getNumberOfPages()>100) throw new SolicitudInvalidaException("El horario admite hasta 100 páginas.");
            var stripper=new PDFTextStripper(); stripper.setSortByPosition(true);
            return interpretarClasificacion(stripper.getText(documento));
        } catch(IOException ex) { throw new SolicitudInvalidaException("No se pudo leer la clasificación del horario."); }
    }
    public bo.edu.umss.windsoft.control_ingreso_backend.dominio.ClasificacionHorario interpretarClasificacion(String texto) {
        String carrera=null,gestion=null;
        var materias=new LinkedHashSet<bo.edu.umss.windsoft.control_ingreso_backend.dominio.ClasificacionHorario.MateriaNivel>();
        var patron=Pattern.compile("^([A-Z]|[0-9]{1,2})\\s+(\\d{7})\\s+(.+)$");
        var periodo=Pattern.compile("Gesti[oó]n Acad[eé]mica\\s+(\\d)/([0-9]{4})",Pattern.CASE_INSENSITIVE);
        for(String linea:texto.lines().map(String::trim).toList()) {
            if(linea.startsWith("LICENCIATURA ")||linea.startsWith("PROGRAMA ")) carrera=linea.replaceAll("\\s+"," ");
            if(linea.equals("ANTIGUO")&&carrera!=null) carrera+=" (ANTIGUO)";
            var p=periodo.matcher(linea); if(p.find()) gestion=p.group(1)+"/"+p.group(2);
            var m=patron.matcher(linea); if(m.matches()) materias.add(new bo.edu.umss.windsoft.control_ingreso_backend.dominio.ClasificacionHorario.MateriaNivel(Integer.valueOf(m.group(2)),m.group(1)));
        }
        return new bo.edu.umss.windsoft.control_ingreso_backend.dominio.ClasificacionHorario(carrera,gestion,List.copyOf(materias));
    }
    private static final Pattern MATERIA = Pattern.compile("^(?:[A-Z]|[0-9]{1,2})\\s+(\\d{7})\\s+(.+)$");
    private static final Pattern FILA = Pattern.compile("^([A-Z0-9]+)\\s+(?:\\[([^]]+)\\]\\s+)?(.+?)\\s+(LU|MA|MI|JU|VI|SA|DO)\\s+\\d{3,4}\\s*-\\s*\\d{3,4}\\s+\\S+$");
    private static final Pattern HORA = Pattern.compile("^(LU|MA|MI|JU|VI|SA|DO)\\s+\\d{3,4}\\s*-\\s*\\d{3,4}\\s+\\S+$");

    public List<AsignacionHorario> leer(byte[] bytes) {
        try (var documento = Loader.loadPDF(bytes)) {
            if (documento.getNumberOfPages() > 100) throw new SolicitudInvalidaException("El horario admite hasta 100 páginas.");
            var stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return interpretar(stripper.getText(documento));
        } catch (IOException ex) {
            throw new SolicitudInvalidaException("No se pudo leer el PDF. Debe contener texto seleccionable y no estar protegido.");
        }
    }

    public List<AsignacionHorario> interpretar(String texto) {
        List<String> lineas = texto.lines().map(String::trim).filter(s -> !s.isEmpty())
                .filter(s -> !s.startsWith("UNIVERSIDAD ") && !s.startsWith("FACULTAD ")
                        && !s.startsWith("HORARIO DE CLASES") && !s.startsWith("LICENCIATURA ") && !s.startsWith("PROGRAMA ") && !s.equals("ANTIGUO")
                        && !s.startsWith("Gestión ") && !s.startsWith("Gestion ")
                        && !s.startsWith("NIVEL ") && !s.startsWith("Procesado CPD"))
                .toList();
        Set<AsignacionHorario> resultado = new LinkedHashSet<>();
        Integer codigo = null;
        String materia = null;
        for (int i = 0; i < lineas.size(); i++) {
            String linea = lineas.get(i).replaceAll("\\s+", " ");
            Matcher cabecera = MATERIA.matcher(linea);
            if (cabecera.matches()) {
                codigo = Integer.valueOf(cabecera.group(1));
                materia = cabecera.group(2).trim();
                continue;
            }
            // Algunos PDF parten un nombre en dos líneas y dejan día/hora en una tercera.
            if(!FILA.matcher(linea).matches() && i+1<lineas.size() && !HORA.matcher(lineas.get(i+1)).matches()) {
                String candidata=linea;
                for(int salto=1;salto<=3 && i+salto<lineas.size();salto++) {
                    if(MATERIA.matcher(lineas.get(i+salto)).matches()) break;
                    candidata+=" "+lineas.get(i+salto);
                    if(FILA.matcher(candidata).matches()) {linea=candidata;i+=salto;break;}
                }
            }
            // Nombres largos: el día/hora puede quedar entre las dos líneas del nombre.
            if (!FILA.matcher(linea).matches() && i + 1 < lineas.size()
                    && !HORA.matcher(lineas.get(i + 1)).matches()
                    && !FILA.matcher(lineas.get(i + 1)).matches()
                    && FILA.matcher(linea + " " + lineas.get(i + 1)).matches()) {
                linea += " " + lineas.get(++i);
            }
            if (!FILA.matcher(linea).matches() && i + 1 < lineas.size() && HORA.matcher(lineas.get(i + 1)).matches()) {
                String horario = lineas.get(++i);
                if (i + 1 < lineas.size() && lineas.get(i + 1).matches("[\\p{L} .'-]+")) {
                    linea += " " + lineas.get(++i);
                }
                linea += " " + horario;
            }
            Matcher fila = FILA.matcher(linea);
            if (fila.matches()) {
                if (codigo == null) throw new SolicitudInvalidaException("Se encontró un grupo sin asignatura en el horario.");
                String tipo = fila.group(2) == null ? "DOCENTE" : fila.group(2).trim();
                if (!Set.of("DOCENTE", "TP", "P").contains(tipo)) {
                    throw new SolicitudInvalidaException("Tipo de clase no reconocido: " + tipo);
                }
                resultado.add(new AsignacionHorario(codigo, materia, fila.group(1), tipo, fila.group(3).trim()));
            } else {
                throw new SolicitudInvalidaException("No se reconoció una línea del horario: " + linea + ". Revise el formato antes de importar.");
            }
        }
        if (resultado.isEmpty()) throw new SolicitudInvalidaException("No se encontraron asignaturas y grupos. Este importador espera el horario de la FCyT.");
        return new ArrayList<>(resultado);
    }
}
