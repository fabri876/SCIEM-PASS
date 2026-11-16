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
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.GrupoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.text.Normalizer;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ReporteAsistenciaService {
    private static final ZoneId ZONA = ZoneId.of("America/La_Paz");
    private static final long CACHE_REPORTE_MS = 30_000L;
    private final Map<String, EntradaCache> cacheReportes = new ConcurrentHashMap<>();
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final IngresoRepository ingresoRepository;
    private final AsignacionIngresoService asignacionIngresoService;
    private final AsignaturaRepository asignaturaRepository;
    private final TipoExamenRepository tipoExamenRepository;
    private final UsuarioRepository usuarioRepository;
    private final GrupoRepository grupoRepository;

    public ReporteAsistenciaService(ExamenRepository examenRepository, AmbienteRepository ambienteRepository,
                                    IngresoRepository ingresoRepository, AsignacionIngresoService asignacionIngresoService,
                                    AsignaturaRepository asignaturaRepository, TipoExamenRepository tipoExamenRepository,
                                    UsuarioRepository usuarioRepository, GrupoRepository grupoRepository) {
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.ingresoRepository = ingresoRepository;
        this.asignacionIngresoService = asignacionIngresoService;
        this.asignaturaRepository = asignaturaRepository;
        this.tipoExamenRepository = tipoExamenRepository;
        this.usuarioRepository = usuarioRepository;
        this.grupoRepository = grupoRepository;
    }

    public byte[] generar(Integer idExamen, String formato, Set<String> secciones, ContextoUsuarioService.UsuarioActual usuario) {
        Examen examen = examenRepository.findById(idExamen).orElseThrow(() -> new IllegalArgumentException("Examen no encontrado."));
        if (Boolean.TRUE.equals(examen.getCancelado())) {
            throw new IllegalArgumentException("El reporte no está disponible para un examen cancelado.");
        }
        if (usuario.esDocente() && !Objects.equals(examen.getIdUsuario(), usuario.idUsuario()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para generar el reporte de este examen.");
        if (usuario.esOperador()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para generar este reporte.");
        if (!finalizado(examen, idExamen)) throw new IllegalArgumentException("El reporte solo está disponible para exámenes finalizados.");
        String claveCache = idExamen + "|" + formato.toLowerCase(Locale.ROOT) + "|" + secciones.stream().sorted().collect(Collectors.joining(","));
        EntradaCache cache = cacheReportes.get(claveCache);
        if (cache != null && System.currentTimeMillis() - cache.creado < CACHE_REPORTE_MS) return cache.contenido;
        List<EstudianteListaOficialDTO> filas = asignacionIngresoService.obtenerListaOficial(idExamen, null);
        List<Ingreso> ingresos = ingresoRepository.findByIdAsignaturaAndIdExamen(examen.getIdAsignatura(), idExamen);
        Map<Integer, Ingreso> porSis = new HashMap<>();
        ingresos.stream().filter(i -> i.getIdExpulsion() == null).forEach(i -> porSis.put(i.getCodsisEstudiante(), i));
        String grupo = examen.getIdGrupo() == null ? "" : grupoRepository.findById(examen.getIdGrupo()).map(g -> g.getNombreGrupo()).orElse("");
        String grupoTexto = grupo.isBlank() ? "" : (grupo.trim().toUpperCase(Locale.ROOT).startsWith("GRUPO") ? grupo.trim() : "Grupo " + grupo.trim());
        String generador = usuarioRepository.findById(usuario.idUsuario()).map(u -> (u.getNombreusuario() + " " + u.getApellidousuario()).trim()).orElse(usuario.correo());
        byte[] contenido = "xlsx".equalsIgnoreCase(formato) || "excel".equalsIgnoreCase(formato)
                ? excel(examen, filas, porSis, secciones, grupoTexto, generador)
                : pdf(examen, filas, porSis, secciones, grupoTexto, generador);
        cacheReportes.put(claveCache, new EntradaCache(System.currentTimeMillis(), contenido));
        return contenido;
    }

    private record EntradaCache(long creado, byte[] contenido) {}

    public String nombreArchivo(Integer idExamen, String formato) {
        Examen examen = examenRepository.findById(idExamen).orElseThrow(() -> new IllegalArgumentException("Examen no encontrado."));
        String materia = asignaturaRepository.findById(examen.getIdAsignatura()).map(a -> a.getNombreAsignatura()).orElse("Asignatura");
        String tipo = tipoExamenRepository.findById(examen.getIdTipoExamen()).map(t -> t.getNombreTipoExamen()).orElse("Examen");
        String fecha = examen.getFechaExamen() == null ? "sin-fecha" : examen.getFechaExamen().toString();
        String base = (materia + "_" + tipo + "_" + fecha).replaceAll("\\s+", "-");
        base = Normalizer.normalize(base, Normalizer.Form.NFD).replaceAll("\\p{M}", "").replaceAll("[^A-Za-z0-9._-]", "-").replaceAll("-+", "-");
        String extension = "xlsx".equalsIgnoreCase(formato) ? "xlsx" : "pdf";
        return base + "." + extension;
    }

    private boolean finalizado(Examen e, Integer id) {
        Ambiente a = ambienteRepository.findByIdExamen(id).stream().findFirst().orElse(null);
        return a != null && ZonedDateTime.now(ZONA).toLocalDate().isAfter(e.getFechaExamen())
                || a != null && ZonedDateTime.now(ZONA).toLocalDate().equals(e.getFechaExamen())
                && ZonedDateTime.now(ZONA).toLocalTime().isAfter(a.getHoraFin());
    }

    private byte[] excel(Examen examen, List<EstudianteListaOficialDTO> filas, Map<Integer, Ingreso> ingresos, Set<String> secciones, String grupo, String generador) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            String materia = asignaturaRepository.findById(examen.getIdAsignatura()).map(a -> a.getNombreAsignatura()).orElse("Asignatura");
            String tipo = tipoExamenRepository.findById(examen.getIdTipoExamen()).map(t -> t.getNombreTipoExamen()).orElse("Examen");
            String docente = examen.getIdUsuario() == null ? "" : usuarioRepository.findById(examen.getIdUsuario()).map(u -> (u.getNombreusuario() + " " + u.getApellidousuario()).trim()).orElse("");
            long asistieron = filas.stream().filter(f -> ingresos.containsKey(f.getCodigoSis())).count();
            long inh = filas.stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado())).count();
            var estiloCabecera = wb.createCellStyle();
            var estiloTitulo = wb.createCellStyle();
            var estiloCelda = wb.createCellStyle();
            for (var estilo : List.of(estiloCabecera, estiloCelda)) {
                estilo.setBorderTop(BorderStyle.THIN); estilo.setBorderBottom(BorderStyle.THIN);
                estilo.setBorderLeft(BorderStyle.THIN); estilo.setBorderRight(BorderStyle.THIN);
                estilo.setTopBorderColor(IndexedColors.GREY_50_PERCENT.getIndex());
                estilo.setBottomBorderColor(IndexedColors.GREY_50_PERCENT.getIndex());
                estilo.setLeftBorderColor(IndexedColors.GREY_50_PERCENT.getIndex());
                estilo.setRightBorderColor(IndexedColors.GREY_50_PERCENT.getIndex());
            }
            var fuenteTitulo = ((org.apache.poi.xssf.usermodel.XSSFWorkbook) wb).createFont();
            fuenteTitulo.setBold(true);
            fuenteTitulo.setFontHeightInPoints((short) 14);
            estiloTitulo.setFont(fuenteTitulo);
            if (secciones.contains("resumen")) {
                var sheet = wb.createSheet("Resumen");
                Row sistema = sheet.createRow(0); sistema.createCell(0).setCellValue("SCIEM-PASS"); sistema.getCell(0).setCellStyle(estiloTitulo);
                Row titulo = sheet.createRow(1); titulo.createCell(0).setCellValue("Reporte de asistencia"); titulo.getCell(0).setCellStyle(estiloTitulo);
                String[] datos = {"Materia: " + materia, "Examen: " + tipo + (grupo.isBlank() ? "" : " · " + grupo), "Fecha: " + examen.getFechaExamen(), "Aulas: " + filas.stream().map(EstudianteListaOficialDTO::getAulaAsignada).filter(Objects::nonNull).distinct().collect(Collectors.joining(", ")), "Docente: " + docente, "Generado por: " + generador};
                for (int i = 0; i < datos.length; i++) sheet.createRow(i + 2).createCell(0).setCellValue(datos[i]);
                Row h = sheet.createRow(8); String[] cab = {"Aula", "Inscritos", "Asistieron", "Ausentes", "Inhabilitados", "% asistencia"};
                for (int i=0;i<cab.length;i++) { h.createCell(i).setCellValue(cab[i]); h.getCell(i).setCellStyle(estiloCabecera); }
                Map<String, List<EstudianteListaOficialDTO>> porAula = filas.stream().collect(Collectors.groupingBy(f -> Objects.toString(f.getAulaAsignada(), "Sin aula asignada"), LinkedHashMap::new, Collectors.toList()));
                int filaResumen = 9;
                for (var entrada : porAula.entrySet()) {
                    long total = entrada.getValue().size();
                    long presentes = entrada.getValue().stream().filter(f -> ingresos.containsKey(f.getCodigoSis())).count();
                    long inhabilitados = entrada.getValue().stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado())).count();
                    Row row = sheet.createRow(filaResumen++);
                    String[] vals = {entrada.getKey(), String.valueOf(total), String.valueOf(presentes), String.valueOf(total - presentes - inhabilitados), String.valueOf(inhabilitados), total == 0 ? "0%" : String.format("%.0f%%", presentes * 100.0 / total)};
                    for (int i=0;i<vals.length;i++) { row.createCell(i).setCellValue(vals[i]); row.getCell(i).setCellStyle(estiloCelda); }
                }
                Row totalRow = sheet.createRow(filaResumen); String[] totalVals = {"Total", String.valueOf(filas.size()), String.valueOf(asistieron), String.valueOf(filas.size()-asistieron-inh), String.valueOf(inh), filas.isEmpty()?"0%":String.format("%.0f%%", asistieron * 100.0 / filas.size())};
                for (int i=0;i<totalVals.length;i++) { totalRow.createCell(i).setCellValue(totalVals[i]); totalRow.getCell(i).setCellStyle(estiloCabecera); }
                for (int i=0;i<cab.length;i++) sheet.autoSizeColumn(i);
                int[] anchosResumen = {24, 14, 14, 14, 18, 16};
                for (int i = 0; i < anchosResumen.length; i++) sheet.setColumnWidth(i, Math.max(sheet.getColumnWidth(i), anchosResumen[i] * 256));
            }
            if (secciones.stream().anyMatch(s -> Set.of("asistentes", "ausentes", "inhabilitados").contains(s))) {
                var sheet = wb.createSheet("Detalle"); int r = 0;
                Row sistema = sheet.createRow(r++); sistema.createCell(0).setCellValue("SCIEM-PASS"); sistema.getCell(0).setCellStyle(estiloTitulo);
                Row info = sheet.createRow(r++); info.createCell(0).setCellValue(materia + " · " + tipo + " · " + examen.getFechaExamen() + " · Docente: " + docente + " · Generado por: " + generador);
                Row h = sheet.createRow(r++); String[] cab = {"Nombre", "Código SIS", "C.I.", "Aula", "Estado", "Hora ingreso", "Motivo"};
                for (int i=0;i<cab.length;i++) { h.createCell(i).setCellValue(cab[i]); h.getCell(i).setCellStyle(estiloCabecera); }
                for (EstudianteListaOficialDTO f : filas) {
                    Ingreso ing = ingresos.get(f.getCodigoSis()); boolean inhFila = "INHABILITADO".equalsIgnoreCase(f.getEstado()); boolean aus = ing == null && !inhFila; boolean asi = ing != null;
                    if (!(asi && secciones.contains("asistentes") || aus && secciones.contains("ausentes") || inhFila && secciones.contains("inhabilitados"))) continue;
                    Row row = sheet.createRow(r++); String estado = asi ? "ASISTIÓ" : (inhFila ? "INHABILITADO" : "AUSENTE"); String hora = ing == null || ing.getHoraIngreso() == null ? "" : ing.getHoraIngreso().toLocalTime().toString();
                    String[] vals = {Objects.toString(f.getNombre(), f.getApellidos()), String.valueOf(f.getCodigoSis()), Objects.toString(f.getCi(),""), Objects.toString(f.getAulaAsignada(),""), estado, hora, Objects.toString(f.getObservacion(),"")};
                    for (int i=0;i<vals.length;i++) { row.createCell(i).setCellValue(vals[i]); row.getCell(i).setCellStyle(estiloCelda); }
                }
                for (int i=0;i<cab.length;i++) sheet.autoSizeColumn(i);
                int[] anchosDetalle = {32, 16, 16, 18, 18, 18, 28};
                for (int i = 0; i < anchosDetalle.length; i++) sheet.setColumnWidth(i, anchosDetalle[i] * 256);
            }
            wb.write(out); return out.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el Excel.", e); }
    }

    private byte[] pdf(Examen examen, List<EstudianteListaOficialDTO> filas, Map<Integer, Ingreso> ingresos, Set<String> secciones, String grupo, String generador) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER); doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);
            try {
                String materia = asignaturaRepository.findById(examen.getIdAsignatura()).map(a -> a.getNombreAsignatura()).orElse("Asignatura");
                String tipo = tipoExamenRepository.findById(examen.getIdTipoExamen()).map(t -> t.getNombreTipoExamen()).orElse("Examen");
                String docente = examen.getIdUsuario() == null ? "" : usuarioRepository.findById(examen.getIdUsuario()).map(u -> (u.getNombreusuario() + " " + u.getApellidousuario()).trim()).orElse("");
                String aulas = filas.stream().map(EstudianteListaOficialDTO::getAulaAsignada).filter(Objects::nonNull).distinct().collect(Collectors.joining(", "));
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 8); cs.beginText(); cs.newLineAtOffset(40, 760); cs.showText("SCIEM-PASS"); cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 15); cs.beginText(); cs.newLineAtOffset(40, 738); cs.showText("Reporte de asistencia"); cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 9); cs.beginText(); cs.newLineAtOffset(390, 740); cs.showText("Emitido: " + java.time.LocalDate.now() + " " + java.time.LocalTime.now().withNano(0)); cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 9); int y = 710;
                String[] datos = {"Materia: " + materia, "Examen: " + tipo + (grupo.isBlank() ? "" : " · " + grupo), "Fecha: " + examen.getFechaExamen(), "Aulas: " + (aulas.isBlank()?"Sin aula asignada":aulas), "Docente: " + docente, "Generado por: " + generador};
                for (String dato : datos) { cs.beginText(); cs.newLineAtOffset(40, y); cs.showText(dato); cs.endText(); y -= 14; }
                long asistieron = filas.stream().filter(f -> ingresos.containsKey(f.getCodigoSis())).count();
                long inh = filas.stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado())).count();
                if (secciones.contains("resumen")) {
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 11); cs.beginText(); cs.newLineAtOffset(40, y); cs.showText("Resumen"); cs.endText(); y -= 16;
                    float[] col = {40, 145, 205, 270, 330, 410};
                    String[] cabResumen = {"Aula", "Inscr.", "Asist.", "Aus.", "Inhab.", "% asist."};
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 8);
                    for (int i = 0; i < cabResumen.length; i++) texto(cs, cabResumen[i], col[i], y);
                    cs.moveTo(40, y - 4); cs.lineTo(500, y - 4); cs.stroke(); y -= 15;
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 8);
                    Map<String, List<EstudianteListaOficialDTO>> porAula = filas.stream().collect(Collectors.groupingBy(f -> Objects.toString(f.getAulaAsignada(), "Sin aula asignada"), LinkedHashMap::new, Collectors.toList()));
                    for (var entrada : porAula.entrySet()) {
                        long total = entrada.getValue().size(); long presentes = entrada.getValue().stream().filter(f -> ingresos.containsKey(f.getCodigoSis())).count(); long inhabilitados = entrada.getValue().stream().filter(f -> "INHABILITADO".equalsIgnoreCase(f.getEstado())).count();
                        String[] valores = {entrada.getKey(), String.valueOf(total), String.valueOf(presentes), String.valueOf(total - presentes - inhabilitados), String.valueOf(inhabilitados), total == 0 ? "0%" : String.format("%.0f%%", presentes * 100.0 / total)};
                        for (int i = 0; i < valores.length; i++) texto(cs, valores[i], col[i], y);
                        y -= 14;
                    }
                    String[] totales = {"Total", String.valueOf(filas.size()), String.valueOf(asistieron), String.valueOf(filas.size()-asistieron-inh), String.valueOf(inh), filas.isEmpty() ? "0%" : String.format("%.0f%%", asistieron * 100.0 / filas.size())};
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD), 8);
                    for (int i = 0; i < totales.length; i++) texto(cs, totales[i], col[i], y);
                    y -= 18;
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
                    else if (seccion.equals("inhabilitados")) texto(cs, "Motivo", 370, y);
                    cs.moveTo(40, y - 4); cs.lineTo(500, y - 4); cs.stroke();
                    y -= 13;
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 8);
                    for (EstudianteListaOficialDTO f : filas) {
                        Ingreso ing=ingresos.get(f.getCodigoSis()); boolean inhFila="INHABILITADO".equalsIgnoreCase(f.getEstado()), aus=ing==null&&!inhFila, asi=ing!=null;
                        if (!(asi&&seccion.equals("asistentes")||aus&&seccion.equals("ausentes")||inhFila&&seccion.equals("inhabilitados"))) continue;
                        if (y < 45) {
                            cs.close();
                            page = new PDPage(PDRectangle.LETTER); doc.addPage(page);
                            cs = new PDPageContentStream(doc, page);
                            y = 760;
                            cs.setFont(new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN), 8);
                            cs.beginText(); cs.newLineAtOffset(40, y); cs.showText("Reporte de asistencia (continuación)"); cs.endText();
                            y -= 24;
                        }
                        String nombre=Objects.toString(f.getNombre(),f.getApellidos()); if(nombre.length()>27) nombre=nombre.substring(0,24)+"..."; String hora=ing==null||ing.getHoraIngreso()==null?"":ing.getHoraIngreso().toLocalTime().toString().substring(0,5); texto(cs,nombre,40,y); texto(cs,String.valueOf(f.getCodigoSis()),205,y); texto(cs,Objects.toString(f.getCi(),""),285,y); if(seccion.equals("asistentes")){ texto(cs,Objects.toString(f.getAulaAsignada(),""),370,y); texto(cs,hora,455,y); } else if(seccion.equals("inhabilitados")) texto(cs,Objects.toString(f.getObservacion(),"Sin motivo"),370,y); y-=12;
                    }
                    y -= 10;
                }
            } finally {
                cs.close();
            }
            doc.save(out); return out.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el PDF.", e); }
    }

    private void texto(PDPageContentStream cs, String valor, float x, float y) throws java.io.IOException {
        cs.beginText(); cs.newLineAtOffset(x, y); cs.showText(valor == null ? "" : valor); cs.endText();
    }
}
