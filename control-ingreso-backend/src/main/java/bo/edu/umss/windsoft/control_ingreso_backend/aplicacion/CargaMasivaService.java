package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaErrorFilaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaVistaPreviaDto;

import java.io.InputStream;
import java.util.*;
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
    private final AsignaturaRepository asignaturaRepository;
    private final GrupoRepository grupoRepository;
    private final GrupoService grupoService;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoriaService;
    private final TipoUsuarioResolver tipoUsuarioResolver;

    public CargaMasivaService(UsuarioRepository usuarioRepository, AdminRepository adminRepository,
                               DocenteRepository docenteRepository, AyudanteRepository ayudanteRepository,
                               EstudianteRepository estudianteRepository, AsignaturaRepository asignaturaRepository,
                               GrupoRepository grupoRepository, GrupoService grupoService,
                               PasswordEncoder passwordEncoder, AuditoriaService auditoriaService,
                               TipoUsuarioResolver tipoUsuarioResolver) {
        this.usuarioRepository = usuarioRepository;
        this.adminRepository = adminRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.estudianteRepository = estudianteRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.grupoRepository = grupoRepository;
        this.grupoService = grupoService;
        this.passwordEncoder = passwordEncoder;
        this.auditoriaService = auditoriaService;
        this.tipoUsuarioResolver = tipoUsuarioResolver;
    }

    @Transactional(readOnly = true)
    public CargaMasivaVistaPreviaDto previsualizar(MultipartFile archivo, String targetRol, String correoEjecutor, Integer idGrupo) {
        validarArchivoBase(archivo);
        Usuario ejecutor = usuarioRepository.findByCorreousuario(correoEjecutor)
                .orElseThrow(() -> new AccessDeniedException("Usuario no encontrado."));
        String rolEjecutor = tipoUsuarioResolver.resolver(ejecutor.getIdusuario());
        validarPermisosCargaMasiva(rolEjecutor, targetRol);
        if (idGrupo != null) grupoService.validarAccesoRegistro(List.of(idGrupo), normalizarRol(targetRol));
        var filas = leerFilas(archivo);
        var resultado = new ArrayList<CargaMasivaVistaPreviaDto.Fila>();
        for (var f : filas) {
            String rol = normalizarRol(f.rol == null || f.rol.isBlank() ? targetRol == null || targetRol.isBlank() ? "ESTUDIANTE" : targetRol : f.rol);
            if (TipoUsuarioResolver.DOCENTE.equals(rolEjecutor) && !TipoUsuarioResolver.ESTUDIANTE.equals(rol))
                throw new AccessDeniedException("Un docente solo puede cargar estudiantes.");
            resultado.add(new CargaMasivaVistaPreviaDto.Fila(f.numeroFila, f.nombre, f.apellido, f.ci, f.codigoSis,
                    f.correo, f.telefono, rol, f.asignatura, f.nombreGrupo));
        }
        return new CargaMasivaVistaPreviaDto(archivo.getOriginalFilename(), resultado);
    }

    private List<FilaUsuarioData> leerFilas(MultipartFile archivo) {
        try (InputStream is = archivo.getInputStream()) {
            var filas = obtenerExtension(archivo.getOriginalFilename()).equalsIgnoreCase(".pdf") ? extraerFilasDePdf(is) : extraerFilasDeExcel(is);
            if (filas.isEmpty()) throw new SolicitudInvalidaException("El archivo no contiene filas procesables.");
            return filas;
        } catch (SolicitudInvalidaException e) { throw e; }
        catch (Exception e) { throw new SolicitudInvalidaException("No se pudo leer el archivo. Revise su formato y columnas."); }
    }

    @Transactional
    public CargaMasivaRespuestaDto procesarCargaMasiva(MultipartFile archivo, String targetRol,
                                                       String executorCorreo, String ip) {
        return procesarCargaMasiva(archivo, targetRol, executorCorreo, ip, null);
    }

    @Transactional
    public CargaMasivaRespuestaDto procesarCargaMasiva(MultipartFile archivo, String targetRol,
                                                       String executorCorreo, String ip, Integer idGrupoSeleccionado) {
        validarArchivoBase(archivo);

        Usuario ejecutor = usuarioRepository.findByCorreousuario(executorCorreo)
                .orElseThrow(() -> new AccessDeniedException("Acceso denegado: Usuario no encontrado."));

        String rolEjecutor = tipoUsuarioResolver.resolver(ejecutor.getIdusuario());
        validarPermisosCargaMasiva(rolEjecutor, targetRol);
        if (idGrupoSeleccionado != null) {
            grupoService.validarAccesoRegistro(List.of(idGrupoSeleccionado), normalizarRol(targetRol));
        }

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
        // Cachés locales a esta carga: nunca compartir resultados entre solicitudes.
        Map<String, Optional<Asignatura>> materiasConsultadas = new HashMap<>();
        Map<String, Optional<Grupo>> gruposConsultados = new HashMap<>();
        Set<String> permisosValidados = new HashSet<>();
        List<String> cis = filas.stream().filter(f -> f.ci != null).map(f -> CiNormalizador.normalizar(f.ci)).distinct().toList();
        List<String> correos = filas.stream().filter(f -> f.correo != null).map(f -> f.correo.trim().toLowerCase()).distinct().toList();
        List<Integer> codigos = filas.stream().map(f -> f.codigoSis).filter(Objects::nonNull).distinct().toList();
        Set<String> cisExistentes = cis.isEmpty() ? Set.of() : new HashSet<>(usuarioRepository.buscarCisExistentes(cis));
        Set<String> correosExistentes = correos.isEmpty() ? Set.of() : new HashSet<>(usuarioRepository.buscarCorreosExistentes(correos));
        Set<Integer> sisDocentes = codigos.isEmpty() ? Set.of() : new HashSet<>(docenteRepository.buscarCodigosExistentes(codigos));
        Set<Integer> sisEstudiantes = codigos.isEmpty() ? Set.of() : new HashSet<>(estudianteRepository.buscarCodigosExistentes(codigos));

        for (FilaUsuarioData fila : filas) {
            List<String> erroresFila = new ArrayList<>();

            String ci = fila.ci != null ? CiNormalizador.normalizar(fila.ci) : "";
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
                if (cisExistentes.contains(ci)) {
                    erroresFila.add("Ya existe un usuario en la BD con el CI '" + ci + "'.");
                } else if (!cisEnArchivo.add(ci)) {
                    erroresFila.add("El CI '" + ci + "' está duplicado en el mismo archivo.");
                }
            }

            if (!correo.isBlank() && correo.contains("@")) {
                if (correosExistentes.contains(correo)) {
                    erroresFila.add("Ya existe un usuario en la BD con el correo '" + correo + "'.");
                } else if (!correosEnArchivo.add(correo)) {
                    erroresFila.add("El correo '" + correo + "' está duplicado en el mismo archivo.");
                }
            }

            if (codSis != null) {
                if (TipoUsuarioResolver.ESTUDIANTE.equals(rolFila)) {
                    if (sisEstudiantes.contains(codSis)) {
                        erroresFila.add("Ya existe un estudiante en la BD con el Código SIS " + codSis + ".");
                    } else if (!codSisEnArchivo.add(codSis)) {
                        erroresFila.add("El Código SIS " + codSis + " está duplicado en el mismo archivo.");
                    }
                } else if (TipoUsuarioResolver.DOCENTE.equals(rolFila)) {
                    if (sisDocentes.contains(codSis)) {
                        erroresFila.add("Ya existe un docente en la BD con el Código SIS " + codSis + ".");
                    } else if (!codSisEnArchivo.add(codSis)) {
                        erroresFila.add("El Código SIS " + codSis + " está duplicado en el mismo archivo.");
                    }
                }
            }

            // Determinar o resolver ID de grupo si viene especificado
            Set<Integer> gruposResueltos = new LinkedHashSet<>();
            if (idGrupoSeleccionado != null) gruposResueltos.add(idGrupoSeleccionado);
            boolean traeAsignatura = fila.asignatura != null && !fila.asignatura.isBlank();
            boolean traeGrupo = fila.nombreGrupo != null && !fila.nombreGrupo.isBlank();
            if (traeAsignatura != traeGrupo) {
                erroresFila.add("Debe indicar asignatura y grupo juntos en el archivo.");
            }
            if (fila.nombreGrupo != null && !fila.nombreGrupo.isBlank() && fila.asignatura != null && !fila.asignatura.isBlank()) {
                String[] materiasFila = fila.asignatura.split(";", -1);
                String[] gruposFila = fila.nombreGrupo.split(";", -1);
                if (materiasFila.length != gruposFila.length || materiasFila.length > 100) {
                    erroresFila.add("ASIGNATURA y GRUPO deben tener la misma cantidad de elementos separados por punto y coma (máximo 100).");
                } else for (int indice = 0; indice < materiasFila.length; indice++) {
                String materiaFila = materiasFila[indice].trim(), grupoFila = gruposFila[indice].trim();
                if (materiaFila.isBlank() || grupoFila.isBlank()) {
                    erroresFila.add("No deje elementos vacíos en las listas de asignaturas y grupos."); continue;
                }
                Optional<Asignatura> asigOpt = materiasConsultadas.computeIfAbsent(materiaFila,
                        this::buscarAsignaturaCarga);
                if (asigOpt.isPresent()) {
                    Integer idAsig = asigOpt.get().getIdAsignatura();
                    Optional<Grupo> gOpt = gruposConsultados.computeIfAbsent(idAsig + ":" + grupoFila.toUpperCase(Locale.ROOT),
                            clave -> grupoRepository.findByIdAsignaturaAndNombreGrupoIgnoreCase(idAsig, grupoFila));
                    if (gOpt.isPresent()) {
                        if (idGrupoSeleccionado != null && !idGrupoSeleccionado.equals(gOpt.get().getIdGrupo())) {
                            erroresFila.add("El grupo de la fila no coincide con el seleccionado para el lote.");
                        }
                        gruposResueltos.add(gOpt.get().getIdGrupo());
                    } else {
                        erroresFila.add("El grupo indicado no existe en la asignatura. Registre primero el horario o el grupo.");
                    }
                } else {
                    erroresFila.add("La asignatura indicada no existe. Registre primero el horario o la asignatura.");
                }
                }
            }

            if ((TipoUsuarioResolver.DOCENTE.equals(rolFila) || TipoUsuarioResolver.ESTUDIANTE.equals(rolFila)) && gruposResueltos.isEmpty()) {
                erroresFila.add("Debe indicar asignatura y grupo para registrar docentes o estudiantes.");
            }
            if (!gruposResueltos.isEmpty()) {
                try {
                    List<Integer> pendientes = new ArrayList<>();
                    for (Integer idGrupo : gruposResueltos) {
                        if (!permisosValidados.contains(rolFila + ":" + idGrupo)) pendientes.add(idGrupo);
                    }
                    if (!pendientes.isEmpty()) {
                        grupoService.validarAccesoRegistro(pendientes, rolFila);
                        for (Integer idGrupo : pendientes) permisosValidados.add(rolFila + ":" + idGrupo);
                    }
                } catch (bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ValidacionNegocioException
                         | AccessDeniedException ex) {
                    erroresFila.add(ex.getMessage());
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

                crearFilaTablaHija(rolFila, nuevo.getIdusuario(), codSis, null);
                int sisFinal = codSis != null ? codSis : nuevo.getIdusuario();
                for (Integer idGrupo : gruposResueltos) {
                    switch (rolFila) {
                        case TipoUsuarioResolver.DOCENTE -> grupoService.asignarDocenteAGrupo(nuevo.getIdusuario(), sisFinal, idGrupo);
                        case TipoUsuarioResolver.ESTUDIANTE -> grupoService.inscribirEstudianteAGrupo(nuevo.getIdusuario(), sisFinal, idGrupo);
                        case TipoUsuarioResolver.OPERADOR -> grupoService.asignarAyudanteAGrupo(nuevo.getIdusuario(), idGrupo);
                        default -> throw new SolicitudInvalidaException("Ese rol no admite grupos académicos.");
                    }
                }
                exitosos++;
            }
        }

        auditoriaService.registrar("CARGA_MASIVA_USUARIOS", executorCorreo, executorCorreo,
                "Carga masiva procesada: " + exitosos + " exitosos, " + fallidos + " fallidos de " + filas.size() + " filas.", ip);

        String resumenMensaje = exitosos + " usuario(s) registrados exitosamente" + (fallidos > 0 ? ", " + fallidos + " con errores." : ".");
        return new CargaMasivaRespuestaDto(resumenMensaje, filas.size(), exitosos, fallidos, errores);
    }

    private Optional<Asignatura> buscarAsignaturaCarga(String valor) {
        if (valor.toUpperCase(Locale.ROOT).startsWith("ID:")) {
            try { return asignaturaRepository.findById(Integer.valueOf(valor.substring(3).trim())); }
            catch (NumberFormatException ex) { return Optional.empty(); }
        }
        Optional<Asignatura> resultado = asignaturaRepository.findByCodigoOficial(valor);
        if (resultado.isEmpty()) resultado = asignaturaRepository.findBySiglaAsignatura(valor);
        if (resultado.isEmpty()) resultado = asignaturaRepository.findByNombreAsignaturaIgnoreCase(valor);
        return resultado;
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
            data.numeroFila = i + 1;

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
            data.asignatura = getValorCeldaString(row, colIndices.getOrDefault("asignatura", -1));
            if (colIndices.containsKey("idasignatura") && !data.asignatura.isBlank()) {
                data.asignatura = Arrays.stream(data.asignatura.split(";", -1))
                        .map(valor -> "ID:" + valor.trim()).collect(java.util.stream.Collectors.joining(";"));
            }
            data.nombreGrupo = getValorCeldaString(row, colIndices.getOrDefault("grupo", -1));

            resultado.add(data);
        }
        workbook.close();
        return resultado;
    }

    private Map<String, Integer> parsearEncabezadosExcel(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        if (headerRow == null) return map;
        int columnasAsignatura = 0;

        for (int c = 0; c < headerRow.getLastCellNum(); c++) {
            String val = getValorCeldaRaw(headerRow.getCell(c)).toUpperCase();
            if (val.contains("ASIGNATURA") || val.contains("MATERIA") || val.contains("SIGLA")) columnasAsignatura++;
            if (val.trim().equals("ID_ASIGNATURA") || val.trim().equals("ID ASIGNATURA")) {
                map.put("idasignatura", c);
                map.put("asignatura", c);
            } else if (val.contains("SIS") || val.contains("CODSIS")) {
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
            } else if (val.contains("ASIGNATURA") || val.contains("MATERIA") || val.contains("SIGLA")) {
                map.put("asignatura", c);
            } else if (val.contains("GRUPO")) {
                map.put("grupo", c);
            }
        }
        if (columnasAsignatura > 1) throw new SolicitudInvalidaException("Use una sola columna de asignatura: ID_ASIGNATURA, CODIGO_ASIGNATURA o ASIGNATURA.");
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
        Pattern emailPattern = Pattern.compile("([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");
        Matcher emailMatcher = emailPattern.matcher(linea);

        if (!emailMatcher.find()) {
            return null;
        }

        String correo = emailMatcher.group(1);
        String resto = linea.replace(correo, " ");

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

        if (numeros.size() >= 2) {
            data.codigoSis = Integer.parseInt(numeros.get(0));
            data.ci = numeros.get(1);
        } else {
            data.ci = numeros.get(0);
            data.codigoSis = Integer.parseInt(numeros.get(0));
        }

        String textoSinNumeros = resto.replaceAll("\\b\\d{5,10}\\b", " ").replaceAll("\\s+", " ").trim();
        String[] partes = textoSinNumeros.split(",");
        if (partes.length >= 2) {
            data.apellido = partes[0].trim();
            data.nombre = partes[1].trim();
        } else {
            data.nombre = textoSinNumeros;
            data.apellido = "";
        }

        return data;
    }

    private void crearFilaTablaHija(String rol, Integer idUsuario, Integer codigoSis, Integer idGrupo) {
        int codSisFinal = codigoSis != null ? codigoSis : idUsuario;
        switch (rol) {
            case TipoUsuarioResolver.ADMINISTRADOR -> adminRepository.save(new Admin(idUsuario));
            case TipoUsuarioResolver.DOCENTE -> {
                docenteRepository.save(new Docente(idUsuario, codSisFinal));
                if (idGrupo != null) {
                    grupoService.asignarDocenteAGrupo(idUsuario, codSisFinal, idGrupo);
                }
            }
            case TipoUsuarioResolver.OPERADOR -> {
                ayudanteRepository.save(new Ayudante(idUsuario));
                if (idGrupo != null) {
                    grupoService.asignarAyudanteAGrupo(idUsuario, idGrupo);
                }
            }
            case TipoUsuarioResolver.ESTUDIANTE -> {
                estudianteRepository.save(new Estudiante(idUsuario, codSisFinal));
                if (idGrupo != null) {
                    grupoService.inscribirEstudianteAGrupo(idUsuario, codSisFinal, idGrupo);
                }
            }
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
        String asignatura;
        String nombreGrupo;
    }
}
