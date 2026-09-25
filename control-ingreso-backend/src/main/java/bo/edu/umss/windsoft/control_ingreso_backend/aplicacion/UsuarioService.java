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

    // El admin registra DOCENTE, OPERADOR y ESTUDIANTE. ADMINISTRADOR queda
    // afuera a propósito: solo puede existir un administrador en el sistema,
    // así que no se puede crear ni promover a nadie más a ese rol desde acá.
    private static final Set<String> ROLES_CREABLES_POR_ADMIN = Set.of(
            TipoUsuarioResolver.DOCENTE, TipoUsuarioResolver.OPERADOR, TipoUsuarioResolver.ESTUDIANTE);

    private final UsuarioRepository usuarioRepository;
    private final AdminRepository adminRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final EstudianteRepository estudianteRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoriaService;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;
    private final TipoUsuarioResolver tipoUsuarioResolver;

    public UsuarioService(UsuarioRepository usuarioRepository, AdminRepository adminRepository,
                           DocenteRepository docenteRepository, AyudanteRepository ayudanteRepository,
                           EstudianteRepository estudianteRepository, PasswordEncoder passwordEncoder,
                           AuditoriaService auditoriaService, UsuarioRespuestaMapper usuarioRespuestaMapper,
                           TipoUsuarioResolver tipoUsuarioResolver) {
        this.usuarioRepository = usuarioRepository;
        this.adminRepository = adminRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.estudianteRepository = estudianteRepository;
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

        validarUnicidad(dto.getCi(), dto.getCorreo());
        validarCodigoDisponible(rolNormalizado, dto.getCodigoSis());

        // Si no se proporciona contraseña, se usa automáticamente el CI como contraseña inicial
        String rawPassword = (dto.getContrasena() == null || dto.getContrasena().trim().isEmpty())
                ? dto.getCi().trim()
                : dto.getContrasena().trim();

        Usuario usuario = new Usuario(dto.getCi().trim(), dto.getNombre().trim(), dto.getApellido().trim(), dto.getTelefono(),
                dto.getCorreo().trim(), passwordEncoder.encode(rawPassword), true);
        usuario = usuarioRepository.save(usuario);

        crearFilaTablaHija(rolNormalizado, usuario.getIdusuario(), dto.getCodigoSis());

        auditoriaService.registrar("CREACION_USUARIO", executorCorreo, dto.getCorreo(),
                "Registro de cuenta con rol " + rolNormalizado + " realizada por " + executorCorreo + ".", ip);

        return usuarioRespuestaMapper.mapear(usuario);
    }

    private void validarPermisosRegistro(String rolEjecutor, String rolARegistrar) {
        if (rolEjecutor == null) {
            throw new org.springframework.security.access.AccessDeniedException("Acceso denegado: Usuario no autenticado.");
        }
        if (TipoUsuarioResolver.ADMINISTRADOR.equals(rolEjecutor)) {
            // El administrador puede registrar cualquier rol
            return;
        }
        if (TipoUsuarioResolver.DOCENTE.equals(rolEjecutor)) {
            // El docente solo puede registrar Ayudantes (OPERADOR) o Estudiantes
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
        String nuevoRolNormalizado = validarRolCreable(nuevoRol);
        validarCodigoDisponible(nuevoRolNormalizado, codigoSis);

        String rolActual = tipoUsuarioResolver.resolver(id);
        if (nuevoRolNormalizado.equals(rolActual)) {
            throw new SolicitudInvalidaException("El usuario ya tiene el rol " + nuevoRolNormalizado + ".");
        }

        eliminarFilaTablaHija(rolActual, id);
        crearFilaTablaHija(nuevoRolNormalizado, id, codigoSis);

        auditoriaService.registrar("CAMBIO_ROL", executorCorreo, usuario.getCorreousuario(),
                "Rol cambiado de " + rolActual + " a " + nuevoRolNormalizado + ".", ip);

        return usuarioRespuestaMapper.mapear(usuario);
    }

    private void crearFilaTablaHija(String rol, Integer idUsuario, Integer codigoSis) {
        switch (rol) {
            case TipoUsuarioResolver.ADMINISTRADOR -> adminRepository.save(new Admin(idUsuario));
            case TipoUsuarioResolver.DOCENTE -> docenteRepository.save(new Docente(idUsuario, codigoSis));
            case TipoUsuarioResolver.OPERADOR -> ayudanteRepository.save(new Ayudante(idUsuario));
            case TipoUsuarioResolver.ESTUDIANTE -> estudianteRepository.save(new Estudiante(idUsuario, codigoSis));
            default -> throw new SolicitudInvalidaException("Rol no soportado: " + rol);
        }
    }

    private void eliminarFilaTablaHija(String rol, Integer idUsuario) {
        switch (rol) {
            case TipoUsuarioResolver.ADMINISTRADOR ->
                    adminRepository.findByIdusuario(idUsuario).ifPresent(adminRepository::delete);
            case TipoUsuarioResolver.DOCENTE ->
                    docenteRepository.findByIdusuario(idUsuario).ifPresent(docenteRepository::delete);
            case TipoUsuarioResolver.OPERADOR ->
                    ayudanteRepository.findByIdusuario(idUsuario).ifPresent(ayudanteRepository::delete);
            case TipoUsuarioResolver.ESTUDIANTE ->
                    estudianteRepository.findByIdusuario(idUsuario).ifPresent(estudianteRepository::delete);
            default -> throw new SolicitudInvalidaException("Rol no soportado: " + rol);
        }
    }

    // Estudiante y Docente tienen cada uno su propio código (codsisestudiante /
    // codsisdocente) en la tabla hija, no relacionados entre sí.
    private void validarCodigoDisponible(String rol, Integer codigoSis) {
        if (rol.equals(TipoUsuarioResolver.ESTUDIANTE)) {
            if (codigoSis == null) {
                throw new SolicitudInvalidaException("El código SIS es obligatorio para el rol ESTUDIANTE.");
            }
            if (estudianteRepository.findByCodsisestudiante(codigoSis).isPresent()) {
                throw new RecursoDuplicadoException("Ya existe un estudiante registrado con el código SIS " + codigoSis + ".");
            }
        } else if (rol.equals(TipoUsuarioResolver.DOCENTE)) {
            if (codigoSis == null) {
                throw new SolicitudInvalidaException("El código SIS es obligatorio para el rol DOCENTE.");
            }
            if (docenteRepository.findByCodsisdocente(codigoSis).isPresent()) {
                throw new RecursoDuplicadoException("Ya existe un docente registrado con el código SIS " + codigoSis + ".");
            }
        }
    }

    @Transactional
    public UsuarioRespuestaDto actualizar(Integer id, ActualizarUsuarioDto dto, String executorCorreo, String ip) {
        Usuario usuario = buscarOLanzar(id);

        if (!usuario.getCorreousuario().equalsIgnoreCase(dto.getCorreo())
                && usuarioRepository.existsByCorreousuario(dto.getCorreo())) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con el correo " + dto.getCorreo() + ".");
        }

        usuario.setNombreusuario(dto.getNombre());
        usuario.setApellidousuario(dto.getApellido());
        usuario.setTelefonousuario(dto.getTelefono());
        usuario.setCorreousuario(dto.getCorreo());
        usuario = usuarioRepository.save(usuario);

        auditoriaService.registrar("ACTUALIZACION_USUARIO", executorCorreo, usuario.getCorreousuario(),
                "El administrador actualizó los datos básicos del usuario.", ip);

        return usuarioRespuestaMapper.mapear(usuario);
    }

    @Transactional
    public boolean cambiarEstado(Integer id, String nuevoEstado, String executorCorreo, String ip) {
        Usuario usuario = buscarOLanzar(id);
        boolean estadoNuevo = parsearEstado(nuevoEstado);
        boolean estadoAnterior = Boolean.TRUE.equals(usuario.getEstadousuario());

        usuario.setEstadousuario(estadoNuevo);
        usuarioRepository.save(usuario);

        String tipoOperacion = estadoNuevo ? "ACTIVACION_USUARIO" : "DESACTIVACION_USUARIO";
        auditoriaService.registrar(tipoOperacion, executorCorreo, usuario.getCorreousuario(),
                "El administrador cambió el estado del usuario de " + (estadoAnterior ? "ACTIVO" : "INACTIVO")
                        + " a " + (estadoNuevo ? "ACTIVO" : "INACTIVO") + ".", ip);

        return estadoNuevo;
    }

    private Usuario buscarOLanzar(Integer id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un usuario con id " + id + "."));
    }

    private void validarUnicidad(String ci, String correo) {
        if (usuarioRepository.existsByCiusuario(ci)) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con el CI " + ci + ".");
        }
        if (usuarioRepository.existsByCorreousuario(correo)) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con el correo " + correo + ".");
        }
    }

    private String validarRolCreable(String rol) {
        String rolNormalizado = rol == null ? "" : rol.trim().toUpperCase();
        if (!ROLES_CREABLES_POR_ADMIN.contains(rolNormalizado)) {
            throw new SolicitudInvalidaException(
                    "El rol debe ser DOCENTE, OPERADOR o ESTUDIANTE (solo puede existir un ADMINISTRADOR).");
        }
        return rolNormalizado;
    }

    private boolean parsearEstado(String nuevoEstado) {
        String valor = nuevoEstado == null ? "" : nuevoEstado.trim().toUpperCase();
        if (valor.equals("ACTIVO")) {
            return true;
        }
        if (valor.equals("INACTIVO")) {
            return false;
        }
        throw new SolicitudInvalidaException("El estado debe ser 'ACTIVO' o 'INACTIVO'.");
    }
}
