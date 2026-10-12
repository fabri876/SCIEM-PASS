package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignacionIngresoRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AulaAsignacionDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.OperadorDisponibleDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Credencial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Gestión de asignación de operadores a aulas de examen y lista oficial del examen.
 * Los endpoints de Admin/Docente leen y escriben en la tabla ayudante_examen,
 * que es la misma fuente que usa el flujo HU05 del operador.
 */
@Service
@Transactional(readOnly = true)
public class AsignacionIngresoService {

    private static final String ESTADO_ACTIVO   = "ACTIVO";
    private static final String ESTADO_INACTIVO = "INACTIVO";
    private static final DateTimeFormatter HORA_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final ExamenRepository         examenRepository;
    private final AmbienteRepository       ambienteRepository;
    private final AulaRepository           aulaRepository;
    private final AyudanteExamenRepository ayudanteExamenRepository;
    private final AyudanteRepository       ayudanteRepository;
    private final UsuarioRepository        usuarioRepository;
    private final HabilitacionRepository   habilitacionRepository;
    private final IngresoRepository        ingresoRepository;
    private final CredencialRepository     credencialRepository;
    private final AsignacionAulaService    asignacionAulaService;

    public AsignacionIngresoService(ExamenRepository examenRepository,
                                    AmbienteRepository ambienteRepository,
                                    AulaRepository aulaRepository,
                                    AyudanteExamenRepository ayudanteExamenRepository,
                                    AyudanteRepository ayudanteRepository,
                                    UsuarioRepository usuarioRepository,
                                    HabilitacionRepository habilitacionRepository,
                                    IngresoRepository ingresoRepository,
                                    CredencialRepository credencialRepository,
                                    AsignacionAulaService asignacionAulaService) {
        this.examenRepository         = examenRepository;
        this.ambienteRepository       = ambienteRepository;
        this.aulaRepository           = aulaRepository;
        this.ayudanteExamenRepository = ayudanteExamenRepository;
        this.ayudanteRepository       = ayudanteRepository;
        this.usuarioRepository        = usuarioRepository;
        this.habilitacionRepository   = habilitacionRepository;
        this.ingresoRepository        = ingresoRepository;
        this.credencialRepository     = credencialRepository;
        this.asignacionAulaService    = asignacionAulaService;
    }

    // -----------------------------------------------------------------------
    // Operadores disponibles
    // -----------------------------------------------------------------------

    /**
     * Lista todos los usuarios con rol OPERADOR (tabla ayudante),
     * marcando cuáles ya tienen una asignación ACTIVA en este examen.
     */
    public List<OperadorDisponibleDTO> operadoresDisponibles(Integer idExamen) {
        // IDs de operadores con asignación ACTIVA en algún ambiente de este examen
        Set<Integer> yaAsignados = ayudanteExamenRepository
                .findByIdIdexamenAndEstadoAsignacion(idExamen, ESTADO_ACTIVO)
                .stream()
                .map(ae -> ae.getId().getIdayudante())
                .collect(Collectors.toSet());

        // Todos los ayudantes registrados en el sistema
        List<Ayudante> todosAyudantes = ayudanteRepository.findAll();
        List<Integer> idsUsuarios = todosAyudantes.stream()
                .map(Ayudante::getIdusuario)
                .toList();

        Map<Integer, Usuario> usuariosMap = usuarioRepository.findAllById(idsUsuarios)
                .stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, Function.identity()));

        return todosAyudantes.stream()
                .map(ay -> {
                    Usuario u = usuariosMap.get(ay.getIdusuario());
                    if (u == null) return null;
                    return new OperadorDisponibleDTO(
                            u.getIdusuario(),
                            u.getNombreusuario(),
                            u.getApellidousuario(),
                            u.getCiusuario(),
                            u.getCorreousuario(),
                            yaAsignados.contains(u.getIdusuario())
                    );
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(OperadorDisponibleDTO::apellido,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    // -----------------------------------------------------------------------
    // Leer asignación actual de un examen
    // -----------------------------------------------------------------------

    /**
     * Devuelve el estado de asignación de operador para cada aula del examen.
     */
    public List<AulaAsignacionDTO> leerAsignacion(Integer idExamen) {
        List<Ambiente> ambientes = ambienteRepository.findByIdExamen(idExamen);
        if (ambientes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No se encontraron aulas para el examen " + idExamen);
        }

        // Asignaciones ACTIVAS por idambiente → primer operador encontrado
        Map<Integer, AyudanteExamen> asignacionPorAmbiente =
                ayudanteExamenRepository.findByIdIdexamenAndEstadoAsignacion(idExamen, ESTADO_ACTIVO)
                        .stream()
                        .collect(Collectors.toMap(
                                ae -> ae.getId().getIdambiente(),
                                Function.identity(),
                                (a, b) -> a  // en caso de duplicado, conservar el primero
                        ));

        // Precarga de usuarios asignados
        Set<Integer> idsOperadores = asignacionPorAmbiente.values().stream()
                .map(ae -> ae.getId().getIdayudante())
                .collect(Collectors.toSet());
        Map<Integer, Usuario> usuariosMap = usuarioRepository.findAllById(idsOperadores)
                .stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, Function.identity()));

        // Precarga de aulas
        List<Integer> idsAulas = ambientes.stream().map(Ambiente::getIdAula).distinct().toList();
        Map<Integer, Aula> aulasMap = aulaRepository.findAllById(idsAulas)
                .stream()
                .collect(Collectors.toMap(Aula::getIdAula, Function.identity()));

        return ambientes.stream().map(amb -> {
            Aula aula    = aulasMap.get(amb.getIdAula());
            AyudanteExamen ae = asignacionPorAmbiente.get(amb.getIdAmbiente());
            Usuario operador  = ae != null ? usuariosMap.get(ae.getId().getIdayudante()) : null;

            return new AulaAsignacionDTO(
                    amb.getIdAmbiente(),
                    amb.getIdAula(),
                    aula != null ? aula.getNombreAula()    : "Aula " + amb.getIdAula(),
                    aula != null ? aula.getUbicacionAula() : null,
                    aula != null ? aula.getCapacidadAula() : null,
                    operador != null ? operador.getIdusuario()      : null,
                    operador != null ? operador.getNombreusuario()   : null,
                    operador != null ? operador.getApellidousuario() : null
            );
        }).toList();
    }

    // -----------------------------------------------------------------------
    // Guardar / actualizar asignación de un examen
    // -----------------------------------------------------------------------

    /**
     * Persiste la asignación de operadores a aulas.
     * <ul>
     *   <li>Si ya existe asignación ACTIVA del MISMO operador en ese ambiente → no hace nada.</li>
     *   <li>Si existe asignación de OTRO operador → la marca INACTIVO y crea la nueva.</li>
     *   <li>Si idOperador es null → marca INACTIVO cualquier asignación existente.</li>
     * </ul>
     * Solo permitido a ADMINISTRADOR y DOCENTE (el controller verifica el rol vía @PreAuthorize).
     */
    @Transactional
    public List<AulaAsignacionDTO> guardarAsignacion(Integer idExamen,
                                                     AsignacionIngresoRequestDTO request,
                                                     ContextoUsuarioService.UsuarioActual usuario) {
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Examen no encontrado: " + idExamen));

        // Docente solo puede asignar en sus propios exámenes
        if (usuario.esDocente() && !usuario.idUsuario().equals(examen.getIdUsuario())) {
            throw new AccesoDenegadoException("No es el docente responsable de este examen.");
        }

        Integer idAsignatura = request.idAsignatura();

        for (AsignacionIngresoRequestDTO.ItemAsignacion item : request.asignaciones()) {
            Integer idAmbiente = item.idAmbiente();
            Integer idOperador = item.idOperador();

            // Desactivar asignaciones anteriores en este ambiente que NO sean el operador nuevo
            List<AyudanteExamen> existentes = ayudanteExamenRepository
                    .findByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(
                            idAsignatura, idExamen, idAmbiente, ESTADO_ACTIVO);
            for (AyudanteExamen ae : existentes) {
                if (idOperador == null || !ae.getId().getIdayudante().equals(idOperador)) {
                    ae.setEstadoAsignacion(ESTADO_INACTIVO);
                    ayudanteExamenRepository.save(ae);
                }
            }

            if (idOperador == null) continue; // solo se quería desasignar

            // Verificar que el operador existe en la tabla ayudante
            if (!ayudanteRepository.existsByIdusuario(idOperador)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El usuario " + idOperador + " no es un operador registrado.");
            }

            // Crear asignación nueva si no existe ya una activa para este operador-ambiente
            AyudanteExamenId nuevoId = new AyudanteExamenId(idOperador, idAsignatura, idExamen, idAmbiente);
            boolean yaExisteActiva = ayudanteExamenRepository.findById(nuevoId)
                    .map(ae -> ESTADO_ACTIVO.equals(ae.getEstadoAsignacion()))
                    .orElse(false);

            if (!yaExisteActiva) {
                AyudanteExamen nueva = new AyudanteExamen(nuevoId, ESTADO_ACTIVO);
                ayudanteExamenRepository.save(nueva);
            }
        }

        // Devolver estado actualizado
        return leerAsignacion(idExamen);
    }

    // -----------------------------------------------------------------------
    // Lista oficial del examen (HU7 / PanelListaOficial)
    // -----------------------------------------------------------------------

    /**
     * Obtiene la nómina oficial del examen compartiendo la misma fuente de datos
     * que la asignación de aulas. Devuelve estudiantes habilitados e inhabilitados,
     * aula asignada, credenciales QR e información de ingreso previo.
     */
    public List<EstudianteListaOficialDTO> obtenerListaOficial(Integer idExamen, String buscar) {
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Examen no encontrado: " + idExamen));

        Integer idAsignatura = examen.getIdAsignatura();

        // 1. Obtener todas las habilitaciones de este examen (o asignatura)
        List<Habilitacion> habilitaciones = habilitacionRepository
                .findHabilitacionesConEstudiante(idAsignatura, idExamen);
        if (habilitaciones.isEmpty()) {
            habilitaciones = habilitacionRepository.findByIdAsignaturaConDetalles(idAsignatura);
        }

        if (habilitaciones.isEmpty()) {
            return Collections.emptyList();
        }

        // 2. Precarga de usuarios de los estudiantes
        Set<Integer> idsUsuario = habilitaciones.stream()
                .map(h -> h.getEstudiante() != null ? h.getEstudiante().getIdusuario() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Integer, Usuario> usuariosMap = usuarioRepository.findAllById(idsUsuario).stream()
                .collect(Collectors.toMap(Usuario::getIdusuario, Function.identity(), (u1, u2) -> u1));

        // 3. Reparto de aulas para conocer qué aula tiene asignada cada estudiante
        AsignacionAulaService.Reparto reparto = asignacionAulaService.repartir(idAsignatura, idExamen);

        // 4. Ingresos vigentes ya registrados para este examen
        List<Ingreso> ingresos = ingresoRepository
                .findByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(idAsignatura, idExamen);
        Map<Integer, Ingreso> ingresoPorCodSis = ingresos.stream()
                .collect(Collectors.toMap(Ingreso::getCodsisEstudiante, Function.identity(), (i1, i2) -> i1));

        // Usuarios operadores que registraron ingresos
        Set<Integer> idsOperadoresRegistran = ingresos.stream()
                .map(Ingreso::getIdUsuarioRegistra)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Integer, Usuario> operadoresRegistranMap = idsOperadoresRegistran.isEmpty() ? Map.of() :
                usuarioRepository.findAllById(idsOperadoresRegistran).stream()
                        .collect(Collectors.toMap(Usuario::getIdusuario, Function.identity(), (u1, u2) -> u1));

        String filtro = buscar != null ? buscar.trim().toLowerCase() : "";

        List<EstudianteListaOficialDTO> resultado = new ArrayList<>();

        for (Habilitacion h : habilitaciones) {
            Estudiante est = h.getEstudiante();
            if (est == null) continue;

            Integer codSis = est.getCodsisestudiante();
            Usuario u = usuariosMap.get(est.getIdusuario());

            String ci = u != null && u.getCiusuario() != null ? u.getCiusuario() : "";
            String nombres = u != null && u.getNombreusuario() != null ? u.getNombreusuario() : "";
            String apellidos = u != null && u.getApellidousuario() != null ? u.getApellidousuario() : "";
            String nombreCompleto = (nombres + " " + apellidos).trim();

            // Filtro de búsqueda (por apellido, nombre, ci o sis)
            if (!filtro.isEmpty()) {
                boolean coincide = apellidos.toLowerCase().contains(filtro)
                        || nombres.toLowerCase().contains(filtro)
                        || ci.toLowerCase().contains(filtro)
                        || String.valueOf(codSis).contains(filtro);
                if (!coincide) continue;
            }

            EstudianteListaOficialDTO dto = new EstudianteListaOficialDTO();
            dto.setCodSisEstudiante(codSis);
            dto.setCi(ci);
            dto.setNombres(nombres);
            dto.setApellidos(apellidos);
            dto.setNombre(nombreCompleto);

            boolean estaHabilitado = Boolean.TRUE.equals(h.getEstadohabilitacion());
            dto.setHabilitado(estaHabilitado);
            dto.setObservacion(h.getObservacionhabilitacion());

            // Aula asignada según el algoritmo oficial de reparto
            Optional<AsignacionAulaService.AulaExamen> aulaOpt = reparto.aulaDe(codSis);
            if (aulaOpt.isPresent()) {
                dto.setAulaAsignada(aulaOpt.get().nombre());
                dto.setIdAmbiente(aulaOpt.get().idAmbiente());
            }

            // Estado de ingreso
            Ingreso ing = ingresoPorCodSis.get(codSis);
            if (ing != null) {
                dto.setEstado("INGRESO");
                if (ing.getHoraIngreso() != null) {
                    dto.setHoraIngreso(ing.getHoraIngreso().format(HORA_FORMATTER));
                    dto.setMarcadoEn(ing.getHoraIngreso().toString());
                }
                Usuario reg = operadoresRegistranMap.get(ing.getIdUsuarioRegistra());
                if (reg != null) {
                    dto.setMarcadoPor((reg.getNombreusuario() + " " + reg.getApellidousuario()).trim());
                }
            } else if (!estaHabilitado) {
                dto.setEstado("INHABILITADO");
            } else {
                dto.setEstado("PENDIENTE");
            }

            // Credencial QR (si el estudiante ya tiene credencial generada para el examen)
            if (u != null) {
                Optional<Credencial> credOpt = credencialRepository.findByIdUsuarioAndIdExamen(u.getIdusuario(), idExamen);
                if (credOpt.isPresent()) {
                    Credencial cred = credOpt.get();
                    dto.setQr(cred.getToken());
                    dto.setQrEstado(cred.getEstado());
                    if (cred.getValidoDesde() != null) dto.setQrDesde(cred.getValidoDesde().toString());
                    if (cred.getValidoHasta() != null) dto.setQrHasta(cred.getValidoHasta().toString());
                }
            }

            resultado.add(dto);
        }

        // Ordenar alfabéticamente por apellido y luego nombre
        resultado.sort(Comparator.comparing(EstudianteListaOficialDTO::getApellidos, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(EstudianteListaOficialDTO::getNombres, String.CASE_INSENSITIVE_ORDER));

        return resultado;
    }
}
