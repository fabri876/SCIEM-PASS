package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.TipoExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
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
import java.util.stream.Collectors;

@Service
public class ReporteAsistenciaService {
    private static final ZoneId ZONA = ZoneId.of("America/La_Paz");
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final IngresoRepository ingresoRepository;
    private final AsignacionIngresoService asignacionIngresoService;
    private final AsignaturaRepository asignaturaRepository;
    private final TipoExamenRepository tipoExamenRepository;
    private final UsuarioRepository usuarioRepository;

    public ReporteAsistenciaService(ExamenRepository examenRepository, AmbienteRepository ambienteRepository,
                                    IngresoRepository ingresoRepository, AsignacionIngresoService asignacionIngresoService,
                                    AsignaturaRepository asignaturaRepository, TipoExamenRepository tipoExamenRepository,
                                    UsuarioRepository usuarioRepository) {
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.ingresoRepository = ingresoRepository;
        this.asignacionIngresoService = asignacionIngresoService;
        this.asignaturaRepository = asignaturaRepository;
        this.tipoExamenRepository = tipoExamenRepository;
        this.usuarioRepository = usuarioRepository;
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
            if (secciones.contains("resumen")) {
                var sheet = wb.createSheet("Resumen");
                Row h = sheet.createRow(0); String[] cab = {"Examen", "Inscritos", "Asistieron", "Ausentes", "Inhabilitados", "% asistencia"};
                for (int i=0;i<cab.length;i++) h.createCell(i).setCellValue(cab[i]);
                long asistieron = filas.stream().filter(f -> ingresos.containsKey(f.getCodigoSis())).count();
                long inh = filas.stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado())).count();
                String[] vals = {String.valueOf(examen.getIdExamen()), String.valueOf(filas.size()), String.valueOf(asistieron), String.valueOf(filas.size()-asistieron-inh), String.valueOf(inh), filas.isEmpty()?"0%":String.format("%.0f%%", asistieron * 100.0 / filas.size())};
                Row row = sheet.createRow(1); for (int i=0;i<vals.length;i++) row.createCell(i).setCellValue(vals[i]);
            }
            if (secciones.stream().anyMatch(s -> Set.of("asistentes", "ausentes", "inhabilitados").contains(s))) {
                var sheet = wb.createSheet("Detalle"); int r = 0;
                Row h = sheet.createRow(r++); String[] cab = {"Código SIS", "C.I.", "Estudiante", "Estado", "Hora ingreso", "Observación"};
                for (int i=0;i<cab.length;i++) h.createCell(i).setCellValue(cab[i]);
                for (EstudianteListaOficialDTO f : filas) {
                    Ingreso ing = ingresos.get(f.getCodigoSis());
                    boolean inh = "INHABILITADO".equalsIgnoreCase(f.getEstado());
                    boolean aus = ing == null && !inh;
                    boolean asi = ing != null;
                    if (!(asi && secciones.contains("asistentes") || aus && secciones.contains("ausentes") || inh && secciones.contains("inhabilitados"))) continue;
                    Row row = sheet.createRow(r++); String estado = asi ? "ASISTIÓ" : (inh ? "INHABILITADO" : "AUSENTE");
                    String hora = ing == null || ing.getHoraIngreso() == null ? "" : ing.getHoraIngreso().toLocalTime().toString();
                    String[] vals = {String.valueOf(f.getCodigoSis()), Objects.toString(f.getCi(),""), Objects.toString(f.getNombre(), f.getApellidos()), estado, hora, Objects.toString(f.getObservacion(),"")};
                    for (int i=0;i<vals.length;i++) row.createCell(i).setCellValue(vals[i]);
                }
            }
            wb.write(out); return out.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el Excel.", e); }
    }

    private byte[] pdf(Examen examen, List<EstudianteListaOficialDTO> filas, Map<Integer, Ingreso> ingresos, Set<String> secciones) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER); doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                String materia = asignaturaRepository.findById(examen.getIdAsignatura()).map(a -> a.getNombreAsignatura()).orElse("Asignatura");
                String tipo = tipoExamenRepository.findById(examen.getIdTipoExamen()).map(t -> t.getNombreTipoExamen()).orElse("Examen");
                String docente = examen.getIdUsuario() == null ? "" : usuarioRepository.findById(examen.getIdUsuario()).map(u -> (u.getNombreusuario() + " " + u.getApellidousuario()).trim()).orElse("");
                String aulas = filas.stream().map(EstudianteListaOficialDTO::getAulaAsignada).filter(Objects::nonNull).distinct().collect(Collectors.joining(", "));
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 8); cs.beginText(); cs.newLineAtOffset(40, 760); cs.showText("SCIEM-PASS"); cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 15); cs.beginText(); cs.newLineAtOffset(40, 738); cs.showText("Reporte de asistencia"); cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 9); cs.beginText(); cs.newLineAtOffset(390, 740); cs.showText("Emitido: " + java.time.LocalDate.now() + " " + java.time.LocalTime.now().withNano(0)); cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 9); int y = 710;
                String[] datos = {"Materia: " + materia, "Examen: " + tipo, "Fecha: " + examen.getFechaExamen(), "Aulas: " + (aulas.isBlank()?"Sin aula asignada":aulas), "Docente: " + docente};
                for (String dato : datos) { cs.beginText(); cs.newLineAtOffset(40, y); cs.showText(dato); cs.endText(); y -= 14; }
                long asistieron = filas.stream().filter(f -> ingresos.containsKey(f.getCodigoSis())).count();
                long inh = filas.stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado())).count();
                if (secciones.contains("resumen")) {
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 11); cs.beginText(); cs.newLineAtOffset(40, y); cs.showText("Resumen"); cs.endText(); y -= 16;
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 9); cs.beginText(); cs.newLineAtOffset(40, y); cs.showText("Inscritos: " + filas.size() + "   Asistieron: " + asistieron + "   Ausentes: " + (filas.size()-asistieron-inh) + "   Inhabilitados: " + inh); cs.endText(); y -= 22;
                }
                for (String seccion : List.of("asistentes", "ausentes", "inhabilitados")) {
                    if (!secciones.contains(seccion)) continue;
                    boolean hayFilas = filas.stream().anyMatch(f -> {
                        Ingreso ing = ingresos.get(f.getCodigoSis());
                        boolean inhFila = "INHABILITADO".equalsIgnoreCase(f.getEstado());
                        return (seccion.equals("asistentes") && ing != null) || (seccion.equals("ausentes") && ing == null && !inhFila) || (seccion.equals("inhabilitados") && inhFila);
                    });
                    if (!hayFilas) continue;
                    String titulo = seccion.equals("asistentes") ? "Asistentes" : seccion.equals("ausentes") ? "Ausentes" : "Inhabilitados";
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 11); cs.beginText(); cs.newLineAtOffset(40, y); cs.showText(titulo); cs.endText(); y -= 14;
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 8);
                    texto(cs, "Nombre", 40, y); texto(cs, "SIS", 205, y); texto(cs, "C.I.", 285, y);
                    if (seccion.equals("asistentes")) { texto(cs, "Aula", 370, y); texto(cs, "Hora", 455, y); }
                    else texto(cs, "Motivo", 370, y);
                    y -= 13;
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 8);
                    for (EstudianteListaOficialDTO f : filas) { if (y < 45) break; Ingreso ing=ingresos.get(f.getCodigoSis()); boolean inhFila="INHABILITADO".equalsIgnoreCase(f.getEstado()), aus=ing==null&&!inhFila, asi=ing!=null; if (!(asi&&seccion.equals("asistentes")||aus&&seccion.equals("ausentes")||inhFila&&seccion.equals("inhabilitados"))) continue; String nombre=Objects.toString(f.getNombre(),f.getApellidos()); if(nombre.length()>27) nombre=nombre.substring(0,24)+"..."; String hora=ing==null||ing.getHoraIngreso()==null?"":ing.getHoraIngreso().toLocalTime().toString().substring(0,5); texto(cs,nombre,40,y); texto(cs,String.valueOf(f.getCodigoSis()),205,y); texto(cs,Objects.toString(f.getCi(),""),285,y); if(seccion.equals("asistentes")){ texto(cs,Objects.toString(f.getAulaAsignada(),""),370,y); texto(cs,hora,455,y); } else texto(cs,Objects.toString(f.getObservacion(),"Sin motivo"),370,y); y-=12; }
                    y -= 10;
                }
            }
            doc.save(out); return out.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el PDF.", e); }
    }

    private void texto(PDPageContentStream cs, String valor, float x, float y) throws java.io.IOException {
        cs.beginText(); cs.newLineAtOffset(x, y); cs.showText(valor == null ? "" : valor); cs.endText();
    }
}
