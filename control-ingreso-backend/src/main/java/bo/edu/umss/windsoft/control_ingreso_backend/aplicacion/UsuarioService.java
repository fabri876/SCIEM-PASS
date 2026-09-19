package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
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

    // El admin crea directamente cuentas de staff. Estudiante no está acá
    // porque su alta es siempre auto-registro (con foto + QR, ver AuthService).
    private static final Set<String> ROLES_CREABLES_POR_ADMIN = Set.of(
            TipoUsuarioResolver.ADMINISTRADOR, TipoUsuarioResolver.DOCENTE, TipoUsuarioResolver.OPERADOR);

    private final UsuarioRepository usuarioRepository;
    private final AdminRepository adminRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoriaService;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;

    public UsuarioService(UsuarioRepository usuarioRepository, AdminRepository adminRepository,
                           DocenteRepository docenteRepository, AyudanteRepository ayudanteRepository,
                           PasswordEncoder passwordEncoder, AuditoriaService auditoriaService,
                           UsuarioRespuestaMapper usuarioRespuestaMapper) {
        this.usuarioRepository = usuarioRepository;
        this.adminRepository = adminRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditoriaService = auditoriaService;
        this.usuarioRespuestaMapper = usuarioRespuestaMapper;
    }

    public List<UsuarioRespuestaDto> listar(String rol, Boolean estado, String busqueda) {
        String rolNormalizado = rol == null || rol.isBlank() ? null : rol.trim().toUpperCase();
        String busquedaSegura = busqueda == null ? "" : busqueda;
        List<Usuario> usuarios = usuarioRepository.filtrarUsuarios(estado, busquedaSegura);
        return usuarioRespuestaMapper.mapearTodos(usuarios).stream()
                .filter(dto -> rolNormalizado == null || rolNormalizado.equals(dto.getRol()))
                .toList();
    }

    public UsuarioRespuestaDto obtener(Integer id) {
        return usuarioRespuestaMapper.mapear(buscarOLanzar(id));
    }

    @Transactional
    public UsuarioRespuestaDto crear(CrearUsuarioDto dto, String executorCorreo, String ip) {
        String rolNormalizado = validarRolCreable(dto.getRol());
        validarUnicidad(dto.getCi(), dto.getCorreo());

        Usuario usuario = new Usuario(dto.getCi(), dto.getNombre(), dto.getApellido(), dto.getTelefono(),
                dto.getCorreo(), passwordEncoder.encode(dto.getContrasena()), true);
        usuario = usuarioRepository.save(usuario);

        switch (rolNormalizado) {
            case TipoUsuarioResolver.ADMINISTRADOR -> adminRepository.save(new Admin(usuario.getIdusuario()));
            case TipoUsuarioResolver.DOCENTE -> docenteRepository.save(new Docente(usuario.getIdusuario(), usuario.getIdusuario()));
            case TipoUsuarioResolver.OPERADOR -> ayudanteRepository.save(new Ayudante(usuario.getIdusuario()));
            default -> throw new SolicitudInvalidaException("Rol no soportado: " + rolNormalizado);
        }

        auditoriaService.registrar("CREACION_USUARIO", executorCorreo, dto.getCorreo(),
                "El administrador creó una cuenta con rol " + rolNormalizado + ".", ip);

        return usuarioRespuestaMapper.mapear(usuario);
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
                    "El rol debe ser ADMINISTRADOR, DOCENTE u OPERADOR (los estudiantes se auto-registran).");
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
