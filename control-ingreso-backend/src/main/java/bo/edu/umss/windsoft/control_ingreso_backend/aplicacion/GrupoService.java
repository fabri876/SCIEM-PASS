package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ValidacionNegocioException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AyudanteGrupoDetalleDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.DocenteMateriaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.GrupoResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;

@Service
public class GrupoService {

    private final GrupoRepository grupoRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final DocenteGrupoRepository docenteGrupoRepository;
    private final EstudianteGrupoRepository estudianteGrupoRepository;
    private final AyudanteGrupoRepository ayudanteGrupoRepository;
    private final UsuarioRepository usuarioRepository;
    private final DocenteRepository docenteRepository;
    private final EstudianteRepository estudianteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final DocenteAsignaturaRepository docenteAsignaturaRepository;

    public GrupoService(GrupoRepository grupoRepository,
                        AsignaturaRepository asignaturaRepository,
                        DocenteGrupoRepository docenteGrupoRepository,
                        EstudianteGrupoRepository estudianteGrupoRepository,
                        AyudanteGrupoRepository ayudanteGrupoRepository,
                        UsuarioRepository usuarioRepository,
                        DocenteRepository docenteRepository,
                        EstudianteRepository estudianteRepository,
                        AyudanteRepository ayudanteRepository,
                        DocenteAsignaturaRepository docenteAsignaturaRepository) {
        this.grupoRepository = grupoRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.docenteGrupoRepository = docenteGrupoRepository;
        this.estudianteGrupoRepository = estudianteGrupoRepository;
        this.ayudanteGrupoRepository = ayudanteGrupoRepository;
        this.usuarioRepository = usuarioRepository;
        this.docenteRepository = docenteRepository;
        this.estudianteRepository = estudianteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
    }

    @Transactional
    public GrupoResponseDto crearGrupo(Integer idAsignatura, String nombreGrupo, String horarios) {
        Asignatura asig = asignaturaRepository.findById(idAsignatura)
                .orElseThrow(() -> new ValidacionNegocioException("La asignatura con ID " + idAsignatura + " no existe."));

        if (nombreGrupo == null || nombreGrupo.isBlank() || nombreGrupo.trim().length() > 50) {
            throw new ValidacionNegocioException("El nombre del grupo es obligatorio y admite hasta 50 caracteres.");
        }
        String nombreLimpio = nombreGrupo.trim().toUpperCase(java.util.Locale.ROOT);
        Optional<Grupo> existente = grupoRepository.findByIdAsignaturaAndNombreGrupoIgnoreCase(idAsignatura, nombreLimpio);
        if (existente.isPresent()) {
            throw new RecursoDuplicadoException("El grupo '" + nombreLimpio + "' ya existe para la asignatura " + asig.getNombreAsignatura());
        }

        Grupo nuevo = new Grupo(idAsignatura, nombreLimpio, horarios);
        Grupo guardado = grupoRepository.save(nuevo);
        return mapToDto(guardado, asig);
    }

    @Transactional(readOnly = true)
    public List<GrupoResponseDto> obtenerGruposPorAsignatura(Integer idAsignatura) {
        Asignatura asig = asignaturaRepository.findById(idAsignatura)
                .orElseThrow(() -> new ValidacionNegocioException("La asignatura con ID " + idAsignatura + " no existe."));

        List<Grupo> grupos = grupoRepository.findByIdAsignatura(idAsignatura);
        return grupos.stream().map(g -> mapToDto(g, asig)).toList();
    }
    @Transactional(readOnly = true)
    public List<GrupoResponseDto> listarCatalogoGrupos() {
        var materias = asignaturaRepository.findAll().stream().collect(java.util.stream.Collectors.toMap(Asignatura::getIdAsignatura, a -> a));
        return grupoRepository.findAll().stream().map(g -> mapToDto(g, materias.get(g.getIdAsignatura()))).toList();
    }

    @Transactional(readOnly = true)
    public List<DocenteMateriaDto> obtenerDocentesPorAsignatura(Integer idAsignatura) {
        if (!asignaturaRepository.existsById(idAsignatura)) {
            throw new ValidacionNegocioException("La asignatura con ID " + idAsignatura + " no existe.");
        }

        List<Integer> idsDocentes = docenteGrupoRepository.findIdUsuariosDocentesByAsignatura(idAsignatura);
        List<DocenteMateriaDto> resultado = new ArrayList<>();

        for (Integer idDocente : idsDocentes) {
            usuarioRepository.findById(idDocente).ifPresent(u -> {
                Optional<Docente> dOpt = docenteRepository.findById(idDocente);
                Integer codSis = dOpt.map(Docente::getCodsisdocente).orElse(idDocente);
                resultado.add(new DocenteMateriaDto(
                        u.getIdusuario(),
                        codSis,
                        u.getNombreusuario() + " " + u.getApellidousuario(),
                        u.getCorreousuario(),
                        u.getCiusuario()
                ));
            });
        }
        return resultado;
    }

    @Transactional(readOnly = true)
    public List<GrupoResponseDto> obtenerGruposPorAsignaturaYDocente(Integer idAsignatura, Integer idUsuarioDocente) {
        Asignatura asig = asignaturaRepository.findById(idAsignatura)
                .orElseThrow(() -> new ValidacionNegocioException("La asignatura con ID " + idAsignatura + " no existe."));

        List<Grupo> grupos = docenteGrupoRepository.findGruposByAsignaturaAndDocente(idAsignatura, idUsuarioDocente);
        return grupos.stream().map(g -> mapToDto(g, asig)).toList();
    }

    @Transactional
    public void asignarDocenteAGrupo(Integer idUsuarioDocente, Integer codSisDocente, Integer idGrupo) {
        Grupo grupo = grupoRepository.findById(idGrupo)
                .orElseThrow(() -> new ValidacionNegocioException("El grupo con ID " + idGrupo + " no existe."));

        Docente docente = docenteRepository.findByIdusuario(idUsuarioDocente)
                .orElseThrow(() -> new ValidacionNegocioException("El usuario seleccionado no es docente."));
        if (codSisDocente != null && !codSisDocente.equals(docente.getCodsisdocente())) {
            throw new ValidacionNegocioException("El código SIS no corresponde al docente seleccionado.");
        }
        DocenteAsignaturaId asignacion = new DocenteAsignaturaId(idUsuarioDocente,
                docente.getCodsisdocente(), grupo.getIdAsignatura());
        if (!docenteAsignaturaRepository.existsById(asignacion)) {
            docenteAsignaturaRepository.save(new DocenteAsignatura(asignacion));
        }
        if (!docenteGrupoRepository.existsByIdUsuarioAndIdGrupo(idUsuarioDocente, idGrupo)) {
            docenteGrupoRepository.save(new DocenteGrupo(idUsuarioDocente, docente.getCodsisdocente(), idGrupo));
        }
    }

    @Transactional(readOnly = true)
    public boolean docenteTieneGrupo(Integer idUsuario, Integer idGrupo) {
        return docenteGrupoRepository.existsByIdUsuarioAndIdGrupo(idUsuario, idGrupo);
    }

    @Transactional
    public void inscribirEstudianteAGrupo(Integer idUsuarioEstudiante, Integer codSisEstudiante, Integer idGrupo) {
        Grupo grupo = grupoRepository.findById(idGrupo)
                .orElseThrow(() -> new ValidacionNegocioException("El grupo con ID " + idGrupo + " no existe."));

        Estudiante estudiante = estudianteRepository.bloquearParaInscripcion(idUsuarioEstudiante)
                .orElseThrow(() -> new ValidacionNegocioException("El usuario seleccionado no es estudiante."));
        if (codSisEstudiante != null && !codSisEstudiante.equals(estudiante.getCodsisestudiante())) {
            throw new ValidacionNegocioException("El código SIS no corresponde al estudiante seleccionado.");
        }
        if (estudianteGrupoRepository.existeOtroGrupoEnAsignatura(idUsuarioEstudiante, grupo.getIdAsignatura(), idGrupo)) {
            throw new ValidacionNegocioException("El estudiante ya pertenece a otro grupo de esta asignatura.");
        }
        if (!estudianteGrupoRepository.existsByIdUsuarioAndIdGrupo(idUsuarioEstudiante, idGrupo)) {
            estudianteGrupoRepository.save(new EstudianteGrupo(idUsuarioEstudiante, estudiante.getCodsisestudiante(), idGrupo));
        }
    }

    @Transactional
    public void asignarAyudanteAGrupo(Integer idUsuarioAyudante, Integer idGrupo) {
        Grupo grupo = grupoRepository.findById(idGrupo)
                .orElseThrow(() -> new ValidacionNegocioException("El grupo con ID " + idGrupo + " no existe."));

        if (!ayudanteRepository.existsByIdusuario(idUsuarioAyudante)) {
            throw new ValidacionNegocioException("El usuario seleccionado no es ayudante.");
        }
        if (!ayudanteGrupoRepository.existsByIdUsuarioAndIdGrupo(idUsuarioAyudante, idGrupo)) {
            ayudanteGrupoRepository.save(new AyudanteGrupo(idUsuarioAyudante, idGrupo));
        }
    }

    @Transactional(readOnly = true)
    public List<AyudanteGrupoDetalleDto> obtenerGruposPorAyudante(Integer idUsuarioAyudante) {
        List<Grupo> grupos = ayudanteGrupoRepository.findGruposByAyudante(idUsuarioAyudante);
        List<AyudanteGrupoDetalleDto> resultado = new ArrayList<>();

        for (Grupo g : grupos) {
            Asignatura asig = asignaturaRepository.findById(g.getIdAsignatura()).orElse(null);
            String nombreAsig = asig != null ? asig.getNombreAsignatura() : "";
            String siglaAsig = asig != null ? asig.getSiglaAsignatura() : "";

            // Obtener docentes del grupo
            List<DocenteGrupo> dgs = docenteGrupoRepository.findByIdGrupo(g.getIdGrupo());
            List<DocenteMateriaDto> docentes = new ArrayList<>();
            for (DocenteGrupo dg : dgs) {
                usuarioRepository.findById(dg.getIdUsuario()).ifPresent(u -> {
                    docentes.add(new DocenteMateriaDto(
                            u.getIdusuario(),
                            dg.getCodSisDocente(),
                            u.getNombreusuario() + " " + u.getApellidousuario(),
                            u.getCorreousuario(),
                            u.getCiusuario()
                    ));
                });
            }

            resultado.add(new AyudanteGrupoDetalleDto(
                    g.getIdGrupo(),
                    g.getNombreGrupo(),
                    null,
                    g.getIdAsignatura(),
                    nombreAsig,
                    siglaAsig,
                    docentes
            ));
        }
        return resultado;
    }

    private GrupoResponseDto mapToDto(Grupo g, Asignatura a) {
        return new GrupoResponseDto(
                g.getIdGrupo(),
                g.getIdAsignatura(),
                a != null ? a.getNombreAsignatura() : "",
                a != null ? a.getSiglaAsignatura() : "",
                g.getNombreGrupo(),
                null,
                g.getEstadoGrupo()
        );
    }

    public void validarUnGrupoPorAsignatura(List<Integer> idsGrupos) {
        Set<Integer> materias = new HashSet<>();
        for (Integer idGrupo : new java.util.LinkedHashSet<>(idsGrupos)) {
            if (idGrupo == null) throw new ValidacionNegocioException("Seleccione un grupo válido.");
            Grupo grupo = grupoRepository.findById(idGrupo)
                    .orElseThrow(() -> new ValidacionNegocioException("El grupo seleccionado no existe."));
            if (!materias.add(grupo.getIdAsignatura()))
                throw new ValidacionNegocioException("Un estudiante solo puede pertenecer a un grupo por asignatura.");
        }
    }

    public void validarAccesoRegistro(List<Integer> idsGrupos, String rolDestino) {
        if (idsGrupos == null || idsGrupos.isEmpty()) return;
        if (TipoUsuarioResolver.ESTUDIANTE.equals(rolDestino) && new java.util.HashSet<>(idsGrupos).size() > 1)
            validarUnGrupoPorAsignatura(idsGrupos);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new AccessDeniedException("Debe iniciar sesión.");
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMINISTRADOR".equals(a.getAuthority()));
        boolean docente = auth.getAuthorities().stream().anyMatch(a -> "ROLE_DOCENTE".equals(a.getAuthority()));
        if (!admin && (!docente || (!TipoUsuarioResolver.ESTUDIANTE.equals(rolDestino)
                && !TipoUsuarioResolver.OPERADOR.equals(rolDestino)))) {
            throw new AccessDeniedException("No tiene permiso para realizar esta vinculación.");
        }
        Integer idDocente = admin ? null : usuarioRepository.findByCorreousuario(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("Usuario no encontrado.")).getIdusuario();
        for (Integer idGrupo : idsGrupos) {
            if (idGrupo == null) throw new ValidacionNegocioException("Seleccione un grupo válido.");
            Grupo grupo = grupoRepository.findById(idGrupo)
                    .orElseThrow(() -> new ValidacionNegocioException("El grupo seleccionado no existe."));
            if (!Boolean.TRUE.equals(grupo.getEstadoGrupo())) {
                throw new ValidacionNegocioException("El grupo seleccionado está inactivo.");
            }
            if (!admin && !docenteGrupoRepository.existsByIdUsuarioAndIdGrupo(idDocente, idGrupo)) {
                throw new AccessDeniedException("Solo puede registrar personas en sus propios grupos.");
            }
        }
    }

    @Transactional
    public void vincularUsuario(Integer idUsuario, String rol, List<Integer> idsGrupos) {
        if (idUsuario == null || rol == null || idsGrupos == null || idsGrupos.isEmpty() || idsGrupos.size() > 100) {
            throw new ValidacionNegocioException("Seleccione una persona y entre 1 y 100 grupos.");
        }
        validarAccesoRegistro(idsGrupos, rol);
        for (Integer idGrupo : new java.util.LinkedHashSet<>(idsGrupos)) {
            switch (rol) {
                case TipoUsuarioResolver.DOCENTE -> asignarDocenteAGrupo(idUsuario, null, idGrupo);
                case TipoUsuarioResolver.ESTUDIANTE -> inscribirEstudianteAGrupo(idUsuario, null, idGrupo);
                case TipoUsuarioResolver.OPERADOR -> asignarAyudanteAGrupo(idUsuario, idGrupo);
                default -> throw new ValidacionNegocioException("Rol no válido para vinculación académica.");
            }
        }
    }

    /** Quita únicamente la relación académica; conserva la cuenta y los registros de exámenes. */
    @Transactional
    public void desvincularUsuario(Integer idUsuario, String rol, Integer idGrupo) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getAuthorities().stream()
                .noneMatch(a -> "ROLE_ADMINISTRADOR".equals(a.getAuthority())))
            throw new AccessDeniedException("Solo el administrador puede quitar asignaciones.");
        if (idUsuario == null || idGrupo == null || rol == null)
            throw new ValidacionNegocioException("Seleccione una asignación válida.");
        Grupo grupo = grupoRepository.findById(idGrupo)
                .orElseThrow(() -> new ValidacionNegocioException("El grupo no existe."));
        switch (rol) {
            case TipoUsuarioResolver.DOCENTE -> {
                Docente docente = docenteRepository.findByIdusuario(idUsuario)
                        .orElseThrow(() -> new ValidacionNegocioException("El usuario no es docente."));
                docenteGrupoRepository.deleteByIdUsuarioAndIdGrupo(idUsuario, idGrupo);
                docenteGrupoRepository.flush();
                if (docenteGrupoRepository.findGruposByAsignaturaAndDocente(grupo.getIdAsignatura(), idUsuario).isEmpty()) {
                    var id = new DocenteAsignaturaId(idUsuario, docente.getCodsisdocente(), grupo.getIdAsignatura());
                    if (docenteAsignaturaRepository.existsById(id)
                            && !docenteAsignaturaRepository.tieneRegistrosVinculados(idUsuario, grupo.getIdAsignatura()))
                        docenteAsignaturaRepository.deleteById(id);
                }
            }
            case TipoUsuarioResolver.ESTUDIANTE -> {
                estudianteRepository.bloquearParaInscripcion(idUsuario)
                        .orElseThrow(() -> new ValidacionNegocioException("El usuario no es estudiante."));
                estudianteGrupoRepository.deleteByIdUsuarioAndIdGrupo(idUsuario, idGrupo);
            }
            case TipoUsuarioResolver.OPERADOR -> {
                if (!ayudanteRepository.existsByIdusuario(idUsuario))
                    throw new ValidacionNegocioException("El usuario no es ayudante.");
                ayudanteGrupoRepository.deleteByIdUsuarioAndIdGrupo(idUsuario, idGrupo);
            }
            default -> throw new ValidacionNegocioException("Rol no válido para asignación académica.");
        }
    }

    @Transactional
    public void reemplazarGruposUsuario(Integer idUsuario, String rol, List<Integer> idsGrupos) {
        if (idsGrupos == null || idsGrupos.size() > 100 || idsGrupos.stream().anyMatch(java.util.Objects::isNull))
            throw new ValidacionNegocioException("Seleccione hasta 100 grupos validos.");
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getAuthorities().stream()
                .noneMatch(a -> "ROLE_ADMINISTRADOR".equals(a.getAuthority())))
            throw new AccessDeniedException("Solo el administrador puede editar asignaciones.");
        List<Integer> nuevos = new ArrayList<>(new java.util.LinkedHashSet<>(idsGrupos));
        if (TipoUsuarioResolver.ESTUDIANTE.equals(rol)) validarUnGrupoPorAsignatura(nuevos);
        List<Integer> anteriores = switch (rol) {
            case TipoUsuarioResolver.DOCENTE -> docenteGrupoRepository.findByIdUsuario(idUsuario).stream().map(DocenteGrupo::getIdGrupo).toList();
            case TipoUsuarioResolver.ESTUDIANTE -> {
                estudianteRepository.bloquearParaInscripcion(idUsuario)
                        .orElseThrow(() -> new ValidacionNegocioException("El usuario no es estudiante."));
                yield estudianteGrupoRepository.findByIdUsuario(idUsuario).stream().map(EstudianteGrupo::getIdGrupo).toList();
            }
            case TipoUsuarioResolver.OPERADOR -> ayudanteGrupoRepository.findByIdUsuario(idUsuario).stream().map(AyudanteGrupo::getIdGrupo).toList();
            default -> throw new ValidacionNegocioException("Este rol no tiene asignaciones academicas.");
        };
        List<Integer> agregados = nuevos.stream().filter(idGrupo -> !anteriores.contains(idGrupo)).toList();
        validarAccesoRegistro(agregados, rol);
        for (Integer idGrupo : anteriores) if (!nuevos.contains(idGrupo)) desvincularUsuario(idUsuario, rol, idGrupo);
        // Hacer efectivas las bajas antes de insertar el nuevo grupo de la misma materia.
        estudianteGrupoRepository.flush();
        if (!agregados.isEmpty()) vincularUsuario(idUsuario, rol, agregados);
    }

    public record Vinculacion(Integer idUsuario, String rol, Integer idGrupo, Integer idAsignatura, String nombreGrupo) {}

    @Transactional(readOnly = true)
    public List<Vinculacion> listarVinculaciones() {
        java.util.Map<Integer, Grupo> grupos = grupoRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(Grupo::getIdGrupo, g -> g));
        List<Vinculacion> resultado = new ArrayList<>();
        docenteGrupoRepository.findAll().forEach(v -> agregarVinculacion(resultado, grupos, v.getIdUsuario(), TipoUsuarioResolver.DOCENTE, v.getIdGrupo()));
        estudianteGrupoRepository.findAll().forEach(v -> agregarVinculacion(resultado, grupos, v.getIdUsuario(), TipoUsuarioResolver.ESTUDIANTE, v.getIdGrupo()));
        ayudanteGrupoRepository.findAll().forEach(v -> agregarVinculacion(resultado, grupos, v.getIdUsuario(), TipoUsuarioResolver.OPERADOR, v.getIdGrupo()));
        return resultado;
    }

    private void agregarVinculacion(List<Vinculacion> destino, java.util.Map<Integer, Grupo> grupos,
                                    Integer idUsuario, String rol, Integer idGrupo) {
        Grupo g = grupos.get(idGrupo);
        if (g != null) destino.add(new Vinculacion(idUsuario, rol, idGrupo, g.getIdAsignatura(), g.getNombreGrupo()));
    }
}
