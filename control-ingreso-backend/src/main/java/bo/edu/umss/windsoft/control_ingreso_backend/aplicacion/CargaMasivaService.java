package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaErrorFilaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CargaMasivaService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    private final UsuarioRepository usuarioRepository;
    private final AdminRepository adminRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final EstudianteRepository estudianteRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoriaService;
    private final TipoUsuarioResolver tipoUsuarioResolver;

    public CargaMasivaService(UsuarioRepository usuarioRepository, AdminRepository adminRepository,
                              DocenteRepository docenteRepository, AyudanteRepository ayudanteRepository,
                              EstudianteRepository estudianteRepository, PasswordEncoder passwordEncoder,
                              AuditoriaService auditoriaService, TipoUsuarioResolver tipoUsuarioResolver) {
        this.usuarioRepository = usuarioRepository;
        this.adminRepository = adminRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.estudianteRepository = estudianteRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditoriaService = auditoriaService;
        this.tipoUsuarioResolver = tipoUsuarioResolver;
    }

    @Transactional
    public CargaMasivaRespuestaDto procesarCargaMasiva(MultipartFile archivo, String targetRol,
                                                       String executorCorreo, String ip) {
        validarArchivoBase(archivo);

        Usuario ejecutor = usuarioRepository.findByCorreousuario(executorCorreo)
                .orElseThrow(() -> new AccessDeniedException("Acceso denegado: Usuario no encontrado."));

        String rolEjecutor = tipoUsuarioResolver.resolver(ejecutor.getIdusuario());
        validarPermisosCargaMasiva(rolEjecutor, targetRol);

        String extension = obtenerExtension(archivo.getOriginalFilename());
        List<FilaUsuarioData> filas;
        try (InputStream is = archivo.getInputStream()) {
            if (extension.equalsIgnoreCase(".pdf")) {
                filas = extraerFilasDePdf(is);
            } else {
                filas = extraerFilasDeExcel(is);
            }
        } catch (Exception e) {
            throw new SolicitudInvalidaException("Error al leer el archivo: " + e.getMessage());
        }

        if (filas.isEmpty()) {
            throw new SolicitudInvalidaException("El archivo no contiene filas o datos procesables.");
        }

        List<CargaMasivaErrorFilaDto> errores = new ArrayList<>();
        Set<String> cisEnArchivo = new HashSet<>();
        Set<String> correosEnArchivo = new HashSet<>();
        Set<Integer> codSisEnArchivo = new HashSet<>();

        int exitosos = 0;
        int fallidos = 0;

        for (FilaUsuarioData fila : filas) {
            List<String> erroresFila = new ArrayList<>();

            String ci = fila.ci != null ? fila.ci.trim() : "";
            String nombre = fila.nombre != null ? fila.nombre.trim() : "";
            String apellido = fila.apellido != null ? fila.apellido.trim() : "";
            String correo = fila.correo != null ? fila.correo.trim().toLowerCase() : "";
            String rolFila = (fila.rol != null && !fila.rol.isBlank()) ? fila.rol.trim().toUpperCase() : targetRol;
            if (rolFila == null || rolFila.isBlank()) {
                rolFila = TipoUsuarioResolver.ESTUDIANTE;
            }

            // Normalizar rol
            rolFila = normalizarRol(rolFila);

            // Validar restricción de docente
            if (TipoUsuarioResolver.DOCENTE.equals(rolEjecutor) && !TipoUsuarioResolver.ESTUDIANTE.equals(rolFila)) {
                erroresFila.add("Permiso insuficiente: Un docente solo puede registrar Estudiantes.");
            }

            if (ci.isBlank()) {
                erroresFila.add("El Carnet de Identidad (CI) es obligatorio.");
            }
            if (nombre.isBlank()) {
                erroresFila.add("El nombre es obligatorio.");
            }
            if (apellido.isBlank()) {
                erroresFila.add("El apellido es obligatorio.");
            }
            if (correo.isBlank()) {
                erroresFila.add("El correo electrónico es obligatorio.");
            } else if (!correo.contains("@")) {
                erroresFila.add("El formato de correo no es válido.");
            }

            // Validar código SIS
            Integer codSis = fila.codigoSis;
            if (TipoUsuarioResolver.ESTUDIANTE.equals(rolFila) || TipoUsuarioResolver.DOCENTE.equals(rolFila)) {
                if (codSis == null) {
                    erroresFila.add("El Código SIS es obligatorio para el rol " + rolFila + ".");
                }
            }

            // Validar duplicados en la base de datos y dentro del mismo archivo
            if (!ci.isBlank()) {
                if (usuarioRepository.existsByCiusuario(ci)) {
                    erroresFila.add("Ya existe un usuario en la BD con el CI '" + ci + "'.");
                } else if (!cisEnArchivo.add(ci)) {
                    erroresFila.add("El CI '" + ci + "' está duplicado en el mismo archivo.");
                }
            }

            if (!correo.isBlank() && correo.contains("@")) {
                if (usuarioRepository.existsByCorreousuario(correo)) {
                    erroresFila.add("Ya existe un usuario en la BD con el correo '" + correo + "'.");
                } else if (!correosEnArchivo.add(correo)) {
                    erroresFila.add("El correo '" + correo + "' está duplicado en el mismo archivo.");
                }
            }

            if (codSis != null) {
                if (TipoUsuarioResolver.ESTUDIANTE.equals(rolFila)) {
                    if (estudianteRepository.findByCodsisestudiante(codSis).isPresent()) {
                        erroresFila.add("Ya existe un estudiante en la BD con el Código SIS " + codSis + ".");
                    } else if (!codSisEnArchivo.add(codSis)) {
                        erroresFila.add("El Código SIS " + codSis + " está duplicado en el mismo archivo.");
                    }
                } else if (TipoUsuarioResolver.DOCENTE.equals(rolFila)) {
                    if (docenteRepository.findByCodsisdocente(codSis).isPresent()) {
                        erroresFila.add("Ya existe un docente en la BD con el Código SIS " + codSis + ".");
                    } else if (!codSisEnArchivo.add(codSis)) {
                        erroresFila.add("El Código SIS " + codSis + " está duplicado en el mismo archivo.");
                    }
                }
            }

            if (!erroresFila.isEmpty()) {
                fallidos++;
                errores.add(new CargaMasivaErrorFilaDto(fila.numeroFila, ci, correo, erroresFila));
            } else {
                // Registrar usuario con contraseña inicial = CI
                String contrasenaHasheada = passwordEncoder.encode(ci);
                Usuario nuevo = new Usuario(ci, nombre, apellido, fila.telefono, correo, contrasenaHasheada, true);
                nuevo = usuarioRepository.save(nuevo);

                crearFilaTablaHija(rolFila, nuevo.getIdusuario(), codSis);
                exitosos++;
            }
        }

        auditoriaService.registrar("CARGA_MASIVA_USUARIOS", executorCorreo, executorCorreo,
                "Carga masiva procesada: " + exitosos + " exitosos, " + fallidos + " fallidos de " + filas.size() + " filas.", ip);

        String resumenMensaje = exitosos + " usuario(s) registrados exitosamente" + (fallidos > 0 ? ", " + fallidos + " con errores." : ".");
        return new CargaMasivaRespuestaDto(resumenMensaje, filas.size(), exitosos, fallidos, errores);
    }

    private void validarArchivoBase(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new SolicitudInvalidaException("Debe seleccionar un archivo para la carga masiva.");
        }
        if (archivo.getSize() > MAX_FILE_SIZE) {
            throw new SolicitudInvalidaException("El archivo supera el tamaño máximo permitido de 10 MB.");
        }
        String ext = obtenerExtension(archivo.getOriginalFilename());
        if (!ext.equals(".xlsx") && !ext.equals(".xls") && !ext.equals(".pdf")) {
            throw new SolicitudInvalidaException("Formato no permitido. Solo se aceptan archivos Excel (.xlsx, .xls) o PDF.");
        }
    }

    private void validarPermisosCargaMasiva(String rolEjecutor, String targetRol) {
        if (rolEjecutor == null) {
            throw new AccessDeniedException("Acceso denegado: Usuario no autenticado.");
        }
        if (TipoUsuarioResolver.ADMINISTRADOR.equals(rolEjecutor)) {
            return;
        }
        if (TipoUsuarioResolver.DOCENTE.equals(rolEjecutor)) {
            if (targetRol != null && !targetRol.isBlank() && !TipoUsuarioResolver.ESTUDIANTE.equalsIgnoreCase(targetRol.trim())) {
                throw new AccessDeniedException("Permiso insuficiente: Un docente solo puede realizar carga masiva para el rol Estudiante.");
            }
            return;
        }
        throw new AccessDeniedException("Acceso denegado: El rol " + rolEjecutor + " no tiene permisos para carga masiva de usuarios.");
    }

    private List<FilaUsuarioData> extraerFilasDeExcel(InputStream is) throws Exception {
        List<FilaUsuarioData> resultado = new ArrayList<>();
        Workbook workbook = WorkbookFactory.create(is);
        Sheet sheet = workbook.getSheetAt(0);

        if (sheet == null || sheet.getPhysicalNumberOfRows() < 2) {
            return resultado;
        }

        // Mapear encabezados de la fila 0
        Row headerRow = sheet.getRow(0);
        Map<String, Integer> colIndices = parsearEncabezadosExcel(headerRow);

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || esFilaVacia(row)) {
                continue;
            }

            FilaUsuarioData data = new FilaUsuarioData();
            data.numeroFila = i + 1; // 1-based line number for user UI

            data.ci = getValorCeldaString(row, colIndices.getOrDefault("ci", 2));
            data.nombre = getValorCeldaString(row, colIndices.getOrDefault("nombre", 4));
            data.apellido = getValorCeldaString(row, colIndices.getOrDefault("apellido", 3));
            data.correo = getValorCeldaString(row, colIndices.getOrDefault("correo", 1));

            String codSisStr = getValorCeldaString(row, colIndices.getOrDefault("codsis", 0));
            if (!codSisStr.isBlank()) {
                try {
                    data.codigoSis = Integer.parseInt(codSisStr.replaceAll("[^0-9]", ""));
                } catch (Exception ignored) {
                }
            }

            String telStr = getValorCeldaString(row, colIndices.getOrDefault("telefono", -1));
            if (!telStr.isBlank()) {
                try {
                    data.telefono = Integer.parseInt(telStr.replaceAll("[^0-9]", ""));
                } catch (Exception ignored) {
                }
            }

            data.rol = getValorCeldaString(row, colIndices.getOrDefault("rol", -1));

            resultado.add(data);
        }
        workbook.close();
        return resultado;
    }

    private Map<String, Integer> parsearEncabezadosExcel(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        if (headerRow == null) return map;

        for (int c = 0; c < headerRow.getLastCellNum(); c++) {
            String val = getValorCeldaRaw(headerRow.getCell(c)).toUpperCase();
            if (val.contains("SIS") || val.contains("CODSIS")) {
                map.put("codsis", c);
            } else if (val.contains("CORREO") || val.contains("EMAIL")) {
                map.put("correo", c);
            } else if (val.contains("CI") || val.contains("CARNET")) {
                map.put("ci", c);
            } else if (val.contains("APELLIDO")) {
                map.put("apellido", c);
            } else if (val.contains("NOMBRE")) {
                map.put("nombre", c);
            } else if (val.contains("TEL") || val.contains("CEL")) {
                map.put("telefono", c);
            } else if (val.contains("ROL")) {
                map.put("rol", c);
            }
        }
        return map;
    }

    private List<FilaUsuarioData> extraerFilasDePdf(InputStream is) throws Exception {
        List<FilaUsuarioData> resultado = new ArrayList<>();
        byte[] bytes = is.readAllBytes();
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            String[] lineas = text.split("\\r?\\n");

            int numFila = 1;
            for (String linea : lineas) {
                linea = linea.trim();
                if (linea.isBlank() || linea.toLowerCase().startsWith("codsis") || linea.toLowerCase().startsWith("ci")) {
                    continue;
                }

                FilaUsuarioData data = parsearLineaPdf(linea, numFila++);
                if (data != null) {
                    resultado.add(data);
                }
            }
        }
        return resultado;
    }

    private FilaUsuarioData parsearLineaPdf(String linea, int numFila) {
        // Expresión para detectar campos típicos: CodSis (números), Correo, CI (números), Nombres, Apellidos
        Pattern emailPattern = Pattern.compile("([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");
        Matcher emailMatcher = emailPattern.matcher(linea);

        if (!emailMatcher.find()) {
            return null; // Si no hay correo, no es una fila de usuario
        }

        String correo = emailMatcher.group(1);
        String resto = linea.replace(correo, " ");

        // Buscar números para CI y SIS
        Pattern numPattern = Pattern.compile("\\b\\d{5,10}\\b");
        Matcher numMatcher = numPattern.matcher(resto);
        List<String> numeros = new ArrayList<>();
        while (numMatcher.find()) {
            numeros.add(numMatcher.group());
        }

        if (numeros.isEmpty()) {
            return null;
        }

        FilaUsuarioData data = new FilaUsuarioData();
        data.numeroFila = numFila;
        data.correo = correo;

        if (numeros.size() >= 3) {
            try {
                data.codigoSis = Integer.parseInt(numeros.get(0));
            } catch (Exception ignored) {}
            data.ci = numeros.get(1);
            try {
                data.telefono = Integer.parseInt(numeros.get(2));
            } catch (Exception ignored) {}
        } else if (numeros.size() == 2) {
            try {
                data.codigoSis = Integer.parseInt(numeros.get(0));
            } catch (Exception ignored) {}
            data.ci = numeros.get(1);
        } else {
            data.ci = numeros.get(0);
        }

        // Limpiar el texto restante para nombres y apellidos
        String nombresApellidos = resto;
        for (String n : numeros) {
            nombresApellidos = nombresApellidos.replace(n, " ");
        }
        nombresApellidos = nombresApellidos.replaceAll("[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]", "").trim();
        String[] partes = nombresApellidos.split("\\s+");

        if (partes.length >= 2) {
            data.nombre = partes[0];
            StringBuilder sb = new StringBuilder();
            for (int i = 1; i < partes.length; i++) {
                if (i > 1) sb.append(" ");
                sb.append(partes[i]);
            }
            data.apellido = sb.toString();
        } else if (partes.length == 1) {
            data.nombre = partes[0];
            data.apellido = partes[0];
        } else {
            data.nombre = "Usuario";
            data.apellido = "Registrado";
        }

        return data;
    }

    private void crearFilaTablaHija(String rol, Integer idUsuario, Integer codigoSis) {
        int codSisFinal = codigoSis != null ? codigoSis : idUsuario;
        switch (rol) {
            case TipoUsuarioResolver.ADMINISTRADOR -> adminRepository.save(new Admin(idUsuario));
            case TipoUsuarioResolver.DOCENTE -> docenteRepository.save(new Docente(idUsuario, codSisFinal));
            case TipoUsuarioResolver.OPERADOR -> ayudanteRepository.save(new Ayudante(idUsuario));
            case TipoUsuarioResolver.ESTUDIANTE -> estudianteRepository.save(new Estudiante(idUsuario, codSisFinal));
            default -> throw new SolicitudInvalidaException("Rol no soportado: " + rol);
        }
    }

    private String normalizarRol(String rol) {
        if (rol == null) return TipoUsuarioResolver.ESTUDIANTE;
        String upper = rol.trim().toUpperCase();
        if (upper.startsWith("ADMIN")) return TipoUsuarioResolver.ADMINISTRADOR;
        if (upper.startsWith("DOC")) return TipoUsuarioResolver.DOCENTE;
        if (upper.startsWith("AYU") || upper.startsWith("AUX") || upper.startsWith("OPE")) return TipoUsuarioResolver.OPERADOR;
        return TipoUsuarioResolver.ESTUDIANTE;
    }

    private String getValorCeldaString(Row row, int index) {
        if (index < 0 || row == null) return "";
        Cell cell = row.getCell(index);
        return getValorCeldaRaw(cell);
    }

    private String getValorCeldaRaw(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) {
            return cell.getStringCellValue().trim();
        } else if (cell.getCellType() == CellType.NUMERIC) {
            double d = cell.getNumericCellValue();
            long l = (long) d;
            if (d == l) {
                return String.valueOf(l);
            }
            return String.valueOf(d);
        } else if (cell.getCellType() == CellType.BOOLEAN) {
            return String.valueOf(cell.getBooleanCellValue());
        }
        return "";
    }

    private boolean esFilaVacia(Row row) {
        if (row == null) return true;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK && !getValorCeldaRaw(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String obtenerExtension(String nombreArchivo) {
        if (nombreArchivo == null) return "";
        int idx = nombreArchivo.lastIndexOf(".");
        return idx == -1 ? "" : nombreArchivo.substring(idx).toLowerCase();
    }

    private static class FilaUsuarioData {
        int numeroFila;
        String ci;
        String nombre;
        String apellido;
        String correo;
        Integer telefono;
        Integer codigoSis;
        String rol;
    }
}
