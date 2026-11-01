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

    private static final int MAX_FILAS = 2000;
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
    private final CargaMasivaJdbcRepository escrituraLotes;

    public CargaMasivaService(UsuarioRepository usuarioRepository, AdminRepository adminRepository,
                               DocenteRepository docenteRepository, AyudanteRepository ayudanteRepository,
                               EstudianteRepository estudianteRepository, AsignaturaRepository asignaturaRepository,
                               GrupoRepository grupoRepository, GrupoService grupoService,
                               PasswordEncoder passwordEncoder, AuditoriaService auditoriaService,
                               TipoUsuarioResolver tipoUsuarioResolver, CargaMasivaJdbcRepository escrituraLotes) {
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
        this.escrituraLotes = escrituraLotes;
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
            if (filas.size() > MAX_FILAS) throw new SolicitudInvalidaException("El archivo supera el máximo de 2000 filas. Divida la lista en varios archivos.");
            if (filas.isEmpty()) throw new SolicitudInvalidaException("El archivo no contiene filas procesables.");
            return filas;
        } catch (SolicitudInvalidaException e) { throw e; }
        catch (Exception e) { throw new SolicitudInvalidaException("No se pudo leer el archivo. Use la plantilla y un máximo de 2000 filas; si el Excel es muy grande, divídalo en archivos menores."); }
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

        List<FilaUsuarioData> filas = leerFilas(archivo);

        List<CargaMasivaErrorFilaDto> errores = new ArrayList<>();
        Set<String> cisEnArchivo = new HashSet<>();
        Set<String> correosEnArchivo = new HashSet<>();
        Set<Integer> codSisEnArchivo = new HashSet<>();

        int exitosos = 0;
        int fallidos = 0;
        int existentes = 0;
        List<String> avisos = new ArrayList<>();
        Map<String, Optional<Usuario>> docentesPorCi = new HashMap<>();
        Map<Integer, Optional<Docente>> docentesPorSis = new HashMap<>();
        Set<String> asignacionesProcesadas = new HashSet<>();
        // Cachés locales a esta carga: nunca compartir resultados entre solicitudes.
        Map<String, Optional<Asignatura>> materiasConsultadas = new HashMap<>();
        Map<String, Optional<Grupo>> gruposConsultados = new HashMap<>();
        Map<Integer,Grupo> gruposParaPermisos=new HashMap<>();
        if(filas.size()>1) precargarCatalogo(materiasConsultadas,gruposConsultados,gruposParaPermisos);
        Set<String> vinculosDocentes=filas.size()>1 ? new HashSet<>(escrituraLotes.docenteGruposActuales()) : null;
        Set<String> permisosValidados = new HashSet<>();
        Map<String, AltaUsuarioLote> altasPendientes = new LinkedHashMap<>();
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
            if (!ci.isBlank() && !ci.matches("[0-9]{6,8}([0-9][A-Z]|[A-Z])?")) erroresFila.add("El CI debe tener de 6 a 8 dígitos y, si corresponde, un complemento válido.");
            if (fila.telefonoTexto != null && !fila.telefonoTexto.isBlank() && !fila.telefonoTexto.matches("[0-9]{7,8}")) erroresFila.add("El teléfono debe contener 7 u 8 dígitos, sin letras.");
            if (nombre.isBlank()) {
                erroresFila.add("El nombre es obligatorio.");
            }
            if (apellido.isBlank()) {
                erroresFila.add("El apellido es obligatorio.");
            }
            if (correo.isBlank()) {
                erroresFila.add("El correo electrónico es obligatorio.");
            } else if (!correo.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
                erroresFila.add("El formato de correo no es válido.");
            }

            // Validar código SIS
            Integer codSis = fila.codigoSis;
            if (fila.codigoSisTexto != null && !fila.codigoSisTexto.matches("[0-9]{9}")) erroresFila.add("El Código SIS debe tener exactamente 9 dígitos.");
            if (TipoUsuarioResolver.ESTUDIANTE.equals(rolFila) || TipoUsuarioResolver.DOCENTE.equals(rolFila)) {
                if (codSis == null) {
                    erroresFila.add("El Código SIS es obligatorio para el rol " + rolFila + ".");
                }
            }

            // Un docente existente solo se reutiliza si los tres identificadores coinciden.
            Usuario docenteExistente = null;
            if (TipoUsuarioResolver.DOCENTE.equals(rolFila) && !ci.isBlank() && codSis != null
                    && (cisExistentes.contains(ci) || sisDocentes.contains(codSis) || correosExistentes.contains(correo)
                        || docentesPorCi.containsKey(ci) || docentesPorSis.containsKey(codSis))) {
                var persona = docentesPorCi.computeIfAbsent(ci, usuarioRepository::findByCiusuario);
                var docente = docentesPorSis.computeIfAbsent(codSis, docenteRepository::findByCodsisdocente);
                if (persona.isPresent() && docente.isPresent()
                        && Objects.equals(persona.get().getIdusuario(), docente.get().getIdusuario())
                        && (persona.get().getIdusuario() != null || (altasPendientes.containsKey(ci)
                            && Objects.equals(altasPendientes.get(ci).codigoSis(), codSis)))
                        && correo.equalsIgnoreCase(persona.get().getCorreousuario())) {
                    docenteExistente = persona.get();
                    if (!Boolean.TRUE.equals(docenteExistente.getEstadousuario()))
                        erroresFila.add("El docente existente está inactivo. Revise su estado antes de asignarle grupos.");
                } else if (persona.isPresent() || docente.isPresent() || correosExistentes.contains(correo)) {
                    erroresFila.add("Los datos corresponden a un registro existente, pero CI, correo y Código SIS no coinciden con el mismo docente. Revise la fila.");
                }
            }

            if (TipoUsuarioResolver.ESTUDIANTE.equals(rolFila) && !ci.isBlank() && codSis != null
                    && (cisExistentes.contains(ci) || sisEstudiantes.contains(codSis) || correosExistentes.contains(correo))) {
                var persona = usuarioRepository.findByCiusuario(ci);
                var estudiante = estudianteRepository.findByCodsisestudiante(codSis);
                if (persona.isPresent() && estudiante.isPresent()
                        && persona.get().getIdusuario().equals(estudiante.get().getIdusuario())
                        && correo.equalsIgnoreCase(persona.get().getCorreousuario())) {
                    docenteExistente = persona.get();
                    if (!Boolean.TRUE.equals(docenteExistente.getEstadousuario()))
                        erroresFila.add("La cuenta existente esta inactiva.");
                }
            }

            // Los otros roles conservan su validación de duplicados.
            if (docenteExistente == null) {
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
                Optional<Asignatura> asigOpt = materiasConsultadas.computeIfAbsent(materiaFila.toUpperCase(Locale.ROOT),
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
                    erroresFila.add("La asignatura indicada no existe o su nombre es ambiguo. Use el código oficial de la asignatura y registre primero su horario o grupo.");
                }
                }
            }

            if ((TipoUsuarioResolver.DOCENTE.equals(rolFila) || TipoUsuarioResolver.ESTUDIANTE.equals(rolFila) || TipoUsuarioResolver.OPERADOR.equals(rolFila)) && gruposResueltos.isEmpty()) {
                erroresFila.add("Debe indicar asignatura y grupo para registrar docentes, estudiantes o ayudantes.");
            }
            if (!gruposResueltos.isEmpty()) {
                try {
                    if (TipoUsuarioResolver.ESTUDIANTE.equals(rolFila) && gruposResueltos.size() > 1)
                        grupoService.validarUnGrupoPorAsignatura(new ArrayList<>(gruposResueltos));
                    if (TipoUsuarioResolver.ESTUDIANTE.equals(rolFila) && docenteExistente != null)
                        grupoService.validarInscripcionesEstudiante(docenteExistente.getIdusuario(), new ArrayList<>(gruposResueltos));
                    List<Integer> pendientes = new ArrayList<>();
                    for (Integer idGrupo : gruposResueltos) {
                        if (!permisosValidados.contains(rolFila + ":" + idGrupo)) pendientes.add(idGrupo);
                    }
                    if (!pendientes.isEmpty()) {
                        if(gruposParaPermisos.isEmpty()) grupoService.validarAccesoRegistro(pendientes, rolFila);
                        else grupoService.validarAccesoRegistro(pendientes,rolFila,gruposParaPermisos);
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
            } else if (docenteExistente != null) {
                int nuevas = 0;
                if (docenteExistente.getIdusuario() == null) {
                    // Docente nuevo repetido en este archivo: unir grupos antes de escribirlo una sola vez.
                    var alta = altasPendientes.get(ci);
                    for (Integer grupo : gruposResueltos) if (alta.grupos().add(grupo)) nuevas++;
                    existentes++;
                    avisos.add("Fila " + fila.numeroFila + ": docente repetido en el lote. Se incorporaron "
                            + nuevas + " grupo(s) nuevos sin duplicar la cuenta.");
                    continue;
                }
                for (Integer idGrupo : gruposResueltos) {
                    String claveAsignacion = docenteExistente.getIdusuario() + ":" + idGrupo;
                    if (asignacionesProcesadas.add(claveAsignacion)) {
                        boolean yaAsignado = TipoUsuarioResolver.DOCENTE.equals(rolFila) && (vinculosDocentes==null
                                ? grupoService.docenteTieneGrupo(docenteExistente.getIdusuario(), idGrupo) : vinculosDocentes.contains(claveAsignacion));
                        if (TipoUsuarioResolver.DOCENTE.equals(rolFila)) {
                            if(!yaAsignado) grupoService.asignarDocenteAGrupo(docenteExistente.getIdusuario(), codSis, idGrupo);
                            if(vinculosDocentes!=null) vinculosDocentes.add(claveAsignacion);
                        }
                        else grupoService.inscribirEstudianteAGrupo(docenteExistente.getIdusuario(), codSis, idGrupo);
                        if (!yaAsignado) nuevas++;
                    }
                }
                existentes++;
                avisos.add("Fila " + fila.numeroFila + ": " + docenteExistente.getNombreusuario() + " "
                        + docenteExistente.getApellidousuario() + " ya existe. "
                        + (nuevas == 0 ? "Sus grupos ya estaban asignados; no se duplicaron." : "Se añadieron " + nuevas + " grupo(s); se conservaron sus asignaciones anteriores."));
            } else {
                // Registrar usuario con contraseña inicial = CI
                String contrasenaHasheada = passwordEncoder.encode(ci);
                Usuario nuevo = new Usuario(ci, nombre, apellido, fila.telefono, correo, contrasenaHasheada, true);
                altasPendientes.put(ci, new AltaUsuarioLote(nuevo, rolFila, codSis, gruposResueltos));
                if (TipoUsuarioResolver.DOCENTE.equals(rolFila)) {
                    docentesPorCi.put(ci, Optional.of(nuevo));
                    Docente docenteCreado = new Docente();
                    docenteCreado.setIdusuario(nuevo.getIdusuario());
                    docenteCreado.setCodsisdocente(codSis);
                    docentesPorSis.put(codSis, Optional.of(docenteCreado));
                }
                exitosos++;
            }
        }

        if (!altasPendientes.isEmpty()) escrituraLotes.guardarNuevos(new ArrayList<>(altasPendientes.values()));

        auditoriaService.registrarEnTransaccion("CARGA_MASIVA_USUARIOS", executorCorreo, executorCorreo,
                "Carga masiva procesada: " + exitosos + " nuevos, " + existentes + " existentes, " + fallidos + " fallidos de " + filas.size() + " filas.", ip);

        String resumenMensaje = exitosos + " usuario(s) nuevos, " + existentes + " fila(s) de usuarios existentes y " + fallidos + " fila(s) con errores.";
        var respuesta = new CargaMasivaRespuestaDto(resumenMensaje, filas.size(), exitosos, fallidos, errores);
        respuesta.setExistentes(existentes);
        respuesta.setAvisos(avisos);
        return respuesta;
    }

    private Optional<Asignatura> buscarAsignaturaCarga(String valor) {
        if (valor.toUpperCase(Locale.ROOT).startsWith("ID:")) {
            try { return asignaturaRepository.findById(Integer.valueOf(valor.substring(3).trim())); }
            catch (NumberFormatException ex) { return Optional.empty(); }
        }
        Optional<Asignatura> resultado = asignaturaRepository.findByCodigoOficial(valor);
        if (resultado.isEmpty()) resultado = asignaturaRepository.findBySiglaAsignatura(valor);
        if (resultado.isEmpty()) {
            var coincidencias = asignaturaRepository.findAllByNombreAsignaturaIgnoreCase(valor);
            // Un nombre ambiguo no debe vincular personas a otra asignatura.
            if (coincidencias.size() == 1) resultado = Optional.of(coincidencias.getFirst());
        }
        return resultado;
    }

    /** Dos lecturas para el lote completo evitan una consulta remota por cada materia/grupo. */
    private void precargarCatalogo(Map<String,Optional<Asignatura>> materias,Map<String,Optional<Grupo>> grupos,Map<Integer,Grupo> permisos) {
        var catalogo=asignaturaRepository.findAll();
        Map<String,List<Asignatura>> nombres=new HashMap<>(),siglas=new HashMap<>();
        for(var a:catalogo) {
            materias.put("ID:"+a.getIdAsignatura(),Optional.of(a));
            if(a.getCodigoOficial()!=null) materias.put(a.getCodigoOficial().toUpperCase(Locale.ROOT),Optional.of(a));
            if(a.getNombreAsignatura()!=null) nombres.computeIfAbsent(a.getNombreAsignatura().toUpperCase(Locale.ROOT),k->new ArrayList<>()).add(a);
            if(a.getSiglaAsignatura()!=null) siglas.computeIfAbsent(a.getSiglaAsignatura().toUpperCase(Locale.ROOT),k->new ArrayList<>()).add(a);
        }
        for(var indice:List.of(siglas,nombres)) indice.forEach((clave,opciones)->materias.putIfAbsent(clave,opciones.size()==1?Optional.of(opciones.getFirst()):Optional.empty()));
        for(var g:grupoRepository.findAll()) {
            grupos.put(g.getIdAsignatura()+":"+g.getNombreGrupo().trim().toUpperCase(Locale.ROOT),Optional.of(g));
            permisos.put(g.getIdGrupo(),g);
        }
    }

    private void validarArchivoBase(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new SolicitudInvalidaException("Debe seleccionar un archivo para la carga masiva.");
        }
        if (archivo.getSize() > MAX_FILE_SIZE) {
            throw new SolicitudInvalidaException("El archivo supera el tamaño máximo permitido de 10 MB.");
        }
        String ext = obtenerExtension(archivo.getOriginalFilename());
        if (!ext.equals(".xlsx") && !ext.equals(".pdf")) {
            throw new SolicitudInvalidaException("Formato no permitido. Solo se aceptan archivos Excel (.xlsx) o PDF.");
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
        try (Workbook workbook = WorkbookFactory.create(is)) {
        Sheet sheet = workbook.getSheetAt(0);

        if (sheet == null || sheet.getPhysicalNumberOfRows() < 2) {
            return resultado;
        }

        // Mapear encabezados de la fila 0
        Row headerRow = sheet.getRow(0);
        Map<String, Integer> colIndices = parsearEncabezadosExcel(headerRow);

        if (sheet.getLastRowNum() > MAX_FILAS) throw new SolicitudInvalidaException("El archivo supera el máximo de 2000 filas. Divida la lista en varios archivos.");
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
            data.codigoSisTexto = codSisStr;
            if (!codSisStr.isBlank()) {
                try {
                    data.codigoSis = Integer.parseInt(codSisStr);
                } catch (Exception ignored) {
                }
            }

            String telStr = getValorCeldaString(row, colIndices.getOrDefault("telefono", -1));
            data.telefonoTexto = telStr;
            if (!telStr.isBlank()) {
                try {
                    data.telefono = Integer.parseInt(telStr);
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
        return resultado;
        }
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
            for (var fila : LectorTablaUsuariosPdf.leer(document)) {
                var valores = fila.datos();
                FilaUsuarioData data = new FilaUsuarioData();
                data.numeroFila = fila.numero(); data.nombre = valores.getOrDefault("NOMBRES", "");
                data.apellido = valores.getOrDefault("APELLIDOS", ""); data.ci = valores.getOrDefault("CI", "");
                data.correo = valores.getOrDefault("CORREO", ""); data.telefonoTexto = valores.getOrDefault("TELEFONO", "");
                data.codigoSisTexto = valores.getOrDefault("CODSIS", "");
                try { data.codigoSis = Integer.valueOf(data.codigoSisTexto); } catch (NumberFormatException ignored) {}
                try { data.telefono = Integer.valueOf(data.telefonoTexto); } catch (NumberFormatException ignored) {}
                data.asignatura = valores.getOrDefault("ID_ASIGNATURA", valores.getOrDefault("CODIGO_ASIGNATURA", valores.getOrDefault("ASIGNATURA", "")));
                if (valores.containsKey("ID_ASIGNATURA")) data.asignatura = Arrays.stream(data.asignatura.split(";", -1)).map(v -> "ID:" + v.trim()).collect(java.util.stream.Collectors.joining(";"));
                data.nombreGrupo = valores.getOrDefault("GRUPO", "");
                resultado.add(data);
            }
        }
        return resultado;
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
        String telefonoTexto;
        String codigoSisTexto;
        Integer telefono;
        Integer codigoSis;
        String rol;
        String asignatura;
        String nombreGrupo;
    }
}
