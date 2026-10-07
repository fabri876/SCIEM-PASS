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
    private static final Pattern MATERIA = Pattern.compile("^[A-Z]\\s+(\\d{7})\\s+(.+)$");
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
                        && !s.startsWith("HORARIO DE CLASES") && !s.startsWith("LICENCIATURA ")
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
