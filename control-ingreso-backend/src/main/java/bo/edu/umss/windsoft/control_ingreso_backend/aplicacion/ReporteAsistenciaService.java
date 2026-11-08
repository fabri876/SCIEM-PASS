package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

@Service
public class ReporteAsistenciaService {
    private static final ZoneId ZONA = ZoneId.of("America/La_Paz");
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final IngresoRepository ingresoRepository;
    private final AsignacionIngresoService asignacionIngresoService;

    public ReporteAsistenciaService(ExamenRepository examenRepository, AmbienteRepository ambienteRepository,
                                    IngresoRepository ingresoRepository, AsignacionIngresoService asignacionIngresoService) {
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.ingresoRepository = ingresoRepository;
        this.asignacionIngresoService = asignacionIngresoService;
    }

    public byte[] generar(Integer idExamen, String formato, Set<String> secciones, ContextoUsuarioService.UsuarioActual usuario) {
        Examen examen = examenRepository.findById(idExamen).orElseThrow(() -> new IllegalArgumentException("Examen no encontrado."));
        if (usuario.esDocente() && !Objects.equals(examen.getIdUsuario(), usuario.idUsuario()))
            throw new SecurityException("No tienes permiso para generar el reporte de este examen.");
        if (usuario.esOperador()) throw new SecurityException("No tienes permiso para generar este reporte.");
        if (!finalizado(examen, idExamen)) throw new IllegalArgumentException("El reporte solo está disponible para exámenes finalizados.");
        List<EstudianteListaOficialDTO> filas = asignacionIngresoService.obtenerListaOficial(idExamen, null);
        List<Ingreso> ingresos = ingresoRepository.findByIdAsignaturaAndIdExamen(examen.getIdAsignatura(), idExamen);
        Map<Integer, Ingreso> porSis = new HashMap<>();
        ingresos.stream().filter(i -> i.getIdExpulsion() == null).forEach(i -> porSis.put(i.getCodsisEstudiante(), i));
        if ("xlsx".equalsIgnoreCase(formato) || "excel".equalsIgnoreCase(formato)) return excel(examen, filas, porSis, secciones);
        return pdf(examen, filas, porSis, secciones);
    }

    private boolean finalizado(Examen e, Integer id) {
        Ambiente a = ambienteRepository.findByIdExamen(id).stream().findFirst().orElse(null);
        return a != null && ZonedDateTime.now(ZONA).toLocalDate().isAfter(e.getFechaExamen())
                || a != null && ZonedDateTime.now(ZONA).toLocalDate().equals(e.getFechaExamen())
                && ZonedDateTime.now(ZONA).toLocalTime().isAfter(a.getHoraFin());
    }

    private byte[] excel(Examen examen, List<EstudianteListaOficialDTO> filas, Map<Integer, Ingreso> ingresos, Set<String> secciones) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var sheet = wb.createSheet("Asistencia");
            int r = 0;
            Row titulo = sheet.createRow(r++); titulo.createCell(0).setCellValue("Reporte de asistencia - Examen " + examen.getIdExamen());
            Row h = sheet.createRow(r++); String[] cab = {"Código SIS", "C.I.", "Estudiante", "Estado", "Hora ingreso", "Observación"};
            for (int i=0;i<cab.length;i++) h.createCell(i).setCellValue(cab[i]);
            for (EstudianteListaOficialDTO f : filas) {
                Row row = sheet.createRow(r++); Ingreso ing = ingresos.get(f.getCodigoSis());
                String estado = ing != null ? "ASISTIÓ" : ("INHABILITADO".equalsIgnoreCase(f.getEstado()) ? "INHABILITADO" : "AUSENTE");
                String hora = ing == null || ing.getHoraIngreso() == null ? "" : ing.getHoraIngreso().toLocalTime().toString();
                String[] vals = {String.valueOf(f.getCodigoSis()), Objects.toString(f.getCi(),""), Objects.toString(f.getNombre(), f.getApellidos()), estado, hora, Objects.toString(f.getObservacion(),"")};
                for (int i=0;i<vals.length;i++) row.createCell(i).setCellValue(vals[i]);
            }
            for (int i=0;i<6;i++) sheet.autoSizeColumn(i);
            wb.write(out); return out.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el Excel.", e); }
    }

    private byte[] pdf(Examen examen, List<EstudianteListaOficialDTO> filas, Map<Integer, Ingreso> ingresos, Set<String> secciones) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER); doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14); cs.beginText(); cs.newLineAtOffset(40, 750); cs.showText("Reporte de asistencia - Examen " + examen.getIdExamen()); cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10); cs.beginText(); cs.newLineAtOffset(40, 728); cs.showText("Fecha: " + examen.getFechaExamen() + "   Inscritos: " + filas.size()); cs.endText();
                long asistieron = filas.stream().filter(f -> ingresos.containsKey(f.getCodigoSis())).count();
                long inh = filas.stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado())).count();
                cs.beginText(); cs.newLineAtOffset(40, 708); cs.showText("Asistieron: " + asistieron + "   Ausentes: " + (filas.size()-asistieron-inh) + "   Inhabilitados: " + inh); cs.endText();
                int y = 680; cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 8); cs.beginText(); cs.newLineAtOffset(40, y); cs.showText("SIS        C.I.       ESTUDIANTE                         ESTADO        HORA"); cs.endText(); y -= 16;
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                for (EstudianteListaOficialDTO f : filas) { if (y < 45) break; Ingreso ing=ingresos.get(f.getCodigoSis()); String estado=ing!=null?"ASISTIO":("INHABILITADO".equalsIgnoreCase(f.getEstado())?"INHABILITADO":"AUSENTE"); String nombre=Objects.toString(f.getNombre(),f.getApellidos()); if(nombre.length()>30) nombre=nombre.substring(0,30); String txt=String.format("%-10s %-10s %-32s %-12s %s", f.getCodigoSis(), Objects.toString(f.getCi(),""), nombre, estado, ing==null?"":ing.getHoraIngreso().toLocalTime()); cs.beginText(); cs.newLineAtOffset(40,y); cs.showText(txt); cs.endText(); y-=13; }
            }
            doc.save(out); return out.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el PDF.", e); }
    }
}
