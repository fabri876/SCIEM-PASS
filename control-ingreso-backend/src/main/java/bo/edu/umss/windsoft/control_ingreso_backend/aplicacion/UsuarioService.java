package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ActualizarUsuarioDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CrearUsuarioDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class UsuarioService {

    private static final Set<String> ROLES_CREABLES_POR_ADMIN = Set.of(
            TipoUsuarioResolver.DOCENTE, TipoUsuarioResolver.OPERADOR, TipoUsuarioResolver.ESTUDIANTE);

    private final UsuarioRepository usuarioRepository;
    private final AdminRepository adminRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final EstudianteRepository estudianteRepository;
    private final GrupoService grupoService;
    private final bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EliminacionUsuarioRepository eliminacionUsuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoriaService;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;
    private final TipoUsuarioResolver tipoUsuarioResolver;

    public UsuarioService(UsuarioRepository usuarioRepository, AdminRepository adminRepository,
                           DocenteRepository docenteRepository, AyudanteRepository ayudanteRepository,
                           EstudianteRepository estudianteRepository, GrupoService grupoService,
                           bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EliminacionUsuarioRepository eliminacionUsuarioRepository,
                           PasswordEncoder passwordEncoder, AuditoriaService auditoriaService,
                           UsuarioRespuestaMapper usuarioRespuestaMapper, TipoUsuarioResolver tipoUsuarioResolver) {
        this.usuarioRepository = usuarioRepository;
        this.adminRepository = adminRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.estudianteRepository = estudianteRepository;
        this.grupoService = grupoService;
        this.eliminacionUsuarioRepository = eliminacionUsuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditoriaService = auditoriaService;
        this.usuarioRespuestaMapper = usuarioRespuestaMapper;
        this.tipoUsuarioResolver = tipoUsuarioResolver;
    }

    public List<UsuarioRespuestaDto> listar(String rol, Boolean estado, String busqueda) {
        String rolNormalizado = rol == null || rol.isBlank() ? null : rol.trim().toUpperCase();
        String busquedaSegura = busqueda == null ? "" : busqueda;

        List<Usuario> usuarios = switch (rolNormalizado == null ? "" : rolNormalizado) {
            case TipoUsuarioResolver.ADMINISTRADOR ->
                    usuarioRepository.filtrarUsuariosPorRolAdministrador(estado, busquedaSegura);
            case TipoUsuarioResolver.DOCENTE ->
                    usuarioRepository.filtrarUsuariosPorRolDocente(estado, busquedaSegura);
            case TipoUsuarioResolver.OPERADOR ->
                    usuarioRepository.filtrarUsuariosPorRolOperador(estado, busquedaSegura);
            case TipoUsuarioResolver.ESTUDIANTE ->
                    usuarioRepository.filtrarUsuariosPorRolEstudiante(estado, busquedaSegura);
            default -> usuarioRepository.filtrarUsuarios(estado, busquedaSegura); // sin filtro de rol
        };

        return usuarioRespuestaMapper.mapearTodos(usuarios);
    }

    public UsuarioRespuestaDto obtener(Integer id) {
        return usuarioRespuestaMapper.mapear(buscarOLanzar(id));
    }

    @Transactional
    public UsuarioRespuestaDto crear(CrearUsuarioDto dto, String executorCorreo, String ip) {
        String rolNormalizado = validarRolCreable(dto.getRol());

        // Validar permisos del ejecutador
        if (executorCorreo != null && !executorCorreo.isBlank() && !executorCorreo.equalsIgnoreCase("anonymousUser")) {
            var ejecutorOpt = usuarioRepository.findByCorreousuario(executorCorreo);
            if (ejecutorOpt.isPresent()) {
                String rolEjecutor = tipoUsuarioResolver.resolver(ejecutorOpt.get().getIdusuario());
                validarPermisosRegistro(rolEjecutor, rolNormalizado);
            }
        }

        String ciNormalizado = CiNormalizador.normalizar(dto.getCi());
        validarUnicidad(ciNormalizado, dto.getCorreo());
        validarCodigoDisponible(rolNormalizado, dto.getCodigoSis());
        java.util.Set<Integer> grupos = new java.util.LinkedHashSet<>();
        if (dto.getIdGrupo() != null) grupos.add(dto.getIdGrupo());
        if (dto.getIdGrupos() != null) grupos.addAll(dto.getIdGrupos());
        if (grupos.size() > 100) throw new SolicitudInvalidaException("Se admiten hasta 100 grupos por registro.");
        if ((TipoUsuarioResolver.DOCENTE.equals(rolNormalizado) || TipoUsuarioResolver.ESTUDIANTE.equals(rolNormalizado) || TipoUsuarioResolver.OPERADOR.equals(rolNormalizado)) && grupos.isEmpty())
            throw new SolicitudInvalidaException("Debe asignar al menos una asignatura y grupo al registrar docentes, estudiantes o ayudantes.");
        grupoService.validarAccesoRegistro(new java.util.ArrayList<>(grupos), rolNormalizado);

        // Si no se proporciona contraseña, se usa automáticamente el CI (normalizado) como contraseña inicial
        String rawPassword = (dto.getContrasena() == null || dto.getContrasena().trim().isEmpty())
                ? ciNormalizado
                : dto.getContrasena().trim();

        Usuario usuario = new Usuario(ciNormalizado, dto.getNombre().trim(), dto.getApellido().trim(), dto.getTelefono(),
                dto.getCorreo().trim(), passwordEncoder.encode(rawPassword), true);
        usuario = usuarioRepository.save(usuario);

        crearFilaTablaHija(rolNormalizado, usuario.getIdusuario(), dto.getCodigoSis());

        for (Integer idGrupo : grupos) {
            int codSis = dto.getCodigoSis() != null ? dto.getCodigoSis() : usuario.getIdusuario();
            if (TipoUsuarioResolver.DOCENTE.equals(rolNormalizado)) {
                grupoService.asignarDocenteAGrupo(usuario.getIdusuario(), codSis, idGrupo);
            } else if (TipoUsuarioResolver.ESTUDIANTE.equals(rolNormalizado)) {
                grupoService.inscribirEstudianteAGrupo(usuario.getIdusuario(), codSis, idGrupo);
            } else if (TipoUsuarioResolver.OPERADOR.equals(rolNormalizado)) {
                grupoService.asignarAyudanteAGrupo(usuario.getIdusuario(), idGrupo);
            }
        }

        auditoriaService.registrarEnTransaccion("CREACION_USUARIO", executorCorreo, dto.getCorreo(),
                "Registro de cuenta con rol " + rolNormalizado + " realizada por " + executorCorreo + ".", ip);

        return usuarioRespuestaMapper.mapear(usuario);
    }

    private void validarPermisosRegistro(String rolEjecutor, String rolARegistrar) {
        if (rolEjecutor == null) {
            throw new org.springframework.security.access.AccessDeniedException("Acceso denegado: Usuario no autenticado.");
        }
        if (TipoUsuarioResolver.ADMINISTRADOR.equals(rolEjecutor)) {
            return;
        }
        if (TipoUsuarioResolver.DOCENTE.equals(rolEjecutor)) {
            if (!TipoUsuarioResolver.OPERADOR.equals(rolARegistrar) && !TipoUsuarioResolver.ESTUDIANTE.equals(rolARegistrar)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Permiso insuficiente: Un docente solo puede registrar usuarios con rol Ayudante o Estudiante.");
            }
            return;
        }
        throw new org.springframework.security.access.AccessDeniedException(
                "Acceso denegado: El rol " + rolEjecutor + " no tiene permisos para registrar usuarios.");
    }

    @Transactional
    public UsuarioRespuestaDto cambiarRol(Integer id, String nuevoRol, Integer codigoSis,
                                           String executorCorreo, String ip) {
        Usuario usuario = buscarOLanzar(id);
        String rolOriginal = tipoUsuarioResolver.resolver(id);
        String rolNuevoNormalizado = validarRolCreable(nuevoRol);

        if (rolOriginal.equals(rolNuevoNormalizado)) {
            return usuarioRespuestaMapper.mapear(usuario);
        }

        validarCodigoDisponible(rolNuevoNormalizado, codigoSis);

        // Eliminar fila de rol previa
        switch (rolOriginal) {
            case TipoUsuarioResolver.ADMINISTRADOR -> adminRepository.deleteById(id);
            case TipoUsuarioResolver.DOCENTE -> docenteRepository.deleteById(id);
            case TipoUsuarioResolver.OPERADOR -> ayudanteRepository.deleteById(id);
            case TipoUsuarioResolver.ESTUDIANTE -> estudianteRepository.deleteById(id);
        }

        // Crear nueva fila en tabla hija
        crearFilaTablaHija(rolNuevoNormalizado, id, codigoSis);

        auditoriaService.registrarEnTransaccion("CAMBIO_ROL_USUARIO", executorCorreo, usuario.getCorreousuario(),
                "Cambio de rol de " + rolOriginal + " a " + rolNuevoNormalizado + " para ID " + id + ".", ip);

        return usuarioRespuestaMapper.mapear(usuario);
    }

    @Transactional
    public UsuarioRespuestaDto actualizar(Integer id, ActualizarUsuarioDto dto,
                                           String executorCorreo, String ip) {
        Usuario usuario = buscarOLanzar(id);

        if (!usuario.getCorreousuario().equalsIgnoreCase(dto.getCorreo().trim())) {
            if (usuarioRepository.existsByCorreousuario(dto.getCorreo().trim())) {
                throw new RecursoDuplicadoException("El correo '" + dto.getCorreo() + "' ya está registrado por otro usuario.");
            }
        }

        if (dto.getIdGrupos() != null)
            grupoService.reemplazarGruposUsuario(id, tipoUsuarioResolver.resolver(id), dto.getIdGrupos());
        usuario.setNombreusuario(dto.getNombre().trim());
        usuario.setApellidousuario(dto.getApellido().trim());
        usuario.setCorreousuario(dto.getCorreo().trim());
        usuario.setTelefonousuario(dto.getTelefono());

        usuario = usuarioRepository.save(usuario);

        auditoriaService.registrarEnTransaccion("EDICION_USUARIO", executorCorreo, usuario.getCorreousuario(),
                "Actualización de datos personales para ID " + id + ".", ip);

        return usuarioRespuestaMapper.mapear(usuario);
    }

    @Transactional
    public UsuarioRespuestaDto cambiarEstado(Integer id, boolean activo, String executorCorreo, String ip) {
        Usuario usuario = buscarOLanzar(id);
        usuario.setEstadousuario(activo);
        usuario = usuarioRepository.save(usuario);

        String accion = activo ? "ACTIVACION_USUARIO" : "DESACTIVACION_USUARIO";
        auditoriaService.registrarEnTransaccion(accion, executorCorreo, usuario.getCorreousuario(),
                "Estado de cuenta cambiado a " + (activo ? "ACTIVO" : "INACTIVO") + " para ID " + id + ".", ip);

        return usuarioRespuestaMapper.mapear(usuario);
    }

    @Transactional
    public void eliminar(Integer id, String executorCorreo, String ip) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getAuthorities().stream()
                .noneMatch(a -> "ROLE_ADMINISTRADOR".equals(a.getAuthority())))
            throw new org.springframework.security.access.AccessDeniedException("Solo el administrador puede eliminar usuarios.");
        Usuario usuario = buscarOLanzar(id);
        if (TipoUsuarioResolver.ADMINISTRADOR.equals(tipoUsuarioResolver.resolver(id)))
            throw new SolicitudInvalidaException("No se permite eliminar cuentas de administrador.");
        Usuario ejecutor = usuarioRepository.findByCorreousuario(executorCorreo)
                .orElseThrow(() -> new SolicitudInvalidaException("Administrador no encontrado."));
        if (id.equals(ejecutor.getIdusuario())) throw new SolicitudInvalidaException("No puede eliminar su propia cuenta.");
        eliminacionUsuarioRepository.bloquear(id);
        if (eliminacionUsuarioRepository.tieneHistorial(id))
            throw new SolicitudInvalidaException("Este usuario tiene examenes, ingresos u otros registros vinculados. Desactive la cuenta para conservar el historial.");
        try {
            eliminacionUsuarioRepository.eliminar(id, ejecutor.getIdusuario(),
                    "[ELIMINACION_USUARIO] ejecutor=" + executorCorreo + " | afectado=" + usuario.getCorreousuario()
                    + " | ID=" + id + " | ip=" + ip);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new SolicitudInvalidaException("El usuario tiene otros registros vinculados y no puede eliminarse. Desactive la cuenta.");
        }
    }

    private Usuario buscarOLanzar(Integer id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con id: " + id));
    }

    private String validarRolCreable(String rol) {
        if (rol == null || rol.isBlank()) {
            throw new SolicitudInvalidaException("El rol es obligatorio.");
        }
        String upper = rol.trim().toUpperCase();
        if (!ROLES_CREABLES_POR_ADMIN.contains(upper)) {
            throw new SolicitudInvalidaException(
                    "Rol '" + rol + "' no válido. Solo se puede asignar: DOCENTE, OPERADOR o ESTUDIANTE.");
        }
        return upper;
    }

    private void validarUnicidad(String ci, String correo) {
        if (usuarioRepository.existsByCiusuario(ci)) {
            throw new RecursoDuplicadoException("Ya existe un usuario con el CI '" + ci + "'.");
        }
        if (usuarioRepository.existsByCorreousuario(correo.trim().toLowerCase())) {
            throw new RecursoDuplicadoException("Ya existe un usuario con el correo '" + correo + "'.");
        }
    }

    private void validarCodigoDisponible(String rol, Integer codigoSis) {
        if (TipoUsuarioResolver.ESTUDIANTE.equals(rol)) {
            if (codigoSis == null) {
                throw new SolicitudInvalidaException("El Código SIS es obligatorio para el rol ESTUDIANTE.");
            }
            if (estudianteRepository.findByCodsisestudiante(codigoSis).isPresent()) {
                throw new RecursoDuplicadoException("El Código SIS " + codigoSis + " ya pertenece a otro estudiante.");
            }
        } else if (TipoUsuarioResolver.DOCENTE.equals(rol)) {
            if (codigoSis == null) {
                throw new SolicitudInvalidaException("El Código SIS es obligatorio para el rol DOCENTE.");
            }
            if (docenteRepository.findByCodsisdocente(codigoSis).isPresent()) {
                throw new RecursoDuplicadoException("El Código SIS " + codigoSis + " ya pertenece a otro docente.");
            }
        }
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
}
