package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CredencialesInvalidasException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaBloqueadaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaInactivaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.LoginResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroPendienteRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * NOTA (sep-2026): el auto-registro de estudiante (con foto + QR) se retiró
 * de acá — la inge confirmó que el administrador es quien registra a TODOS
 * los usuarios, incluidos los estudiantes (ver UsuarioService). Un
 * estudiante que no fue registrado por el admin simplemente no existe en
 * la base y su login falla con credenciales inválidas (criterio de
 * aceptación correspondiente).
 */
@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditoriaService auditoriaService;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;
    private final TipoUsuarioResolver tipoUsuarioResolver;
    private final UsuarioBloqueoService usuarioBloqueoService;

    public AuthService(UsuarioRepository usuarioRepository, DocenteRepository docenteRepository,
                        AyudanteRepository ayudanteRepository, PasswordEncoder passwordEncoder,
                        JwtTokenProvider jwtTokenProvider, AuditoriaService auditoriaService,
                        UsuarioRespuestaMapper usuarioRespuestaMapper, TipoUsuarioResolver tipoUsuarioResolver,
                        UsuarioBloqueoService usuarioBloqueoService) {
        this.usuarioRepository = usuarioRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditoriaService = auditoriaService;
        this.usuarioRespuestaMapper = usuarioRespuestaMapper;
        this.tipoUsuarioResolver = tipoUsuarioResolver;
        this.usuarioBloqueoService = usuarioBloqueoService;
    }

    @Transactional
    public LoginResponseDto login(String correo, String contrasena, String ip) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreousuario(correo);

        if (usuarioOpt.isEmpty()) {
            auditoriaService.registrar("LOGIN_FALLIDO", "SISTEMA", correo,
                    "Intento de inicio de sesión con un correo no registrado.", ip);
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos.");
        }

        Usuario usuario = usuarioOpt.get();

        if (usuario.isBloqueado()) {
            auditoriaService.registrar("LOGIN_FALLIDO", "SISTEMA", correo,
                    "Intento de inicio de sesión sobre una cuenta bloqueada temporalmente.", ip);
            throw new CuentaBloqueadaException(
                    "Cuenta bloqueada temporalmente por 5 intentos fallidos consecutivos. Contacte al administrador.");
        }

        if (!Boolean.TRUE.equals(usuario.getEstadousuario())) {
            auditoriaService.registrar("LOGIN_FALLIDO", "SISTEMA", correo,
                    "Intento de inicio de sesión sobre una cuenta inactiva o pendiente de aprobación.", ip);
            throw new CuentaInactivaException(
                    "Cuenta inactiva. Si acaba de registrarse como Docente u Operador, debe esperar la aprobación del administrador.");
        }

        if (!passwordEncoder.matches(contrasena, usuario.getContraseniausuario())) {
            // BUG-001 (QA): este guardado tiene que sobrevivir aunque este método
            // termine lanzando una excepción — por eso va en una transacción
            // aparte (REQUIRES_NEW) en vez de usuarioRepository.save(usuario)
            // directo acá, que se revertía con el rollback de este método.
            Usuario actualizado = usuarioBloqueoService.registrarIntentoFallido(usuario.getIdusuario());

            if (actualizado.isBloqueado()) {
                auditoriaService.registrar("CUENTA_BLOQUEADA", "SISTEMA", correo,
                        "Cuenta bloqueada tras 5 intentos fallidos consecutivos de inicio de sesión.", ip);
                throw new CuentaBloqueadaException(
                        "Cuenta bloqueada temporalmente por 5 intentos fallidos consecutivos. Contacte al administrador.");
            }

            auditoriaService.registrar("LOGIN_FALLIDO", "SISTEMA", correo,
                    "Contraseña incorrecta. Intento " + actualizado.getIntentosFallidos() + " de 5.", ip);
            throw new CredencialesInvalidasException(
                    "Contraseña incorrecta. Intento " + actualizado.getIntentosFallidos() + " de 5.");
        }

        usuario.reiniciarIntentosFallidos();
        usuarioRepository.save(usuario);

        auditoriaService.registrar("LOGIN_EXITOSO", correo, correo, "Inicio de sesión exitoso.", ip);

        String rol = tipoUsuarioResolver.resolver(usuario.getIdusuario());
        String token = jwtTokenProvider.generarToken(usuario.getCorreousuario(), rol,
                usuario.getIdusuario(), usuario.getNombreusuario());

        UsuarioRespuestaDto usuarioDto = usuarioRespuestaMapper.mapear(usuario);
        return new LoginResponseDto(token, jwtTokenProvider.getExpiration(), usuarioDto);
    }

    @Transactional
    public RegistroPendienteRespuestaDto registrarDocenteOAyudante(String nombre, String apellido, String ci,
                                                                     String correo, String contrasena,
                                                                     Integer telefono, String rolSolicitado) {
        String rolNormalizado = rolSolicitado == null ? "" : rolSolicitado.trim().toUpperCase();
        if (!rolNormalizado.equals(TipoUsuarioResolver.DOCENTE) && !rolNormalizado.equals(TipoUsuarioResolver.OPERADOR)) {
            throw new SolicitudInvalidaException(
                    "El rol solicitado debe ser DOCENTE u OPERADOR (ayudante/auxiliar).");
        }
        validarUnicidad(ci, correo);

        // Cuenta pendiente de aprobación: estadousuario = false hasta que el
        // administrador la active (PATCH /api/admin/usuarios/{id}/estado).
        Usuario usuario = new Usuario(ci, nombre, apellido, telefono, correo,
                passwordEncoder.encode(contrasena), false);
        usuario = usuarioRepository.save(usuario);

        if (rolNormalizado.equals(TipoUsuarioResolver.DOCENTE)) {
            docenteRepository.save(new Docente(usuario.getIdusuario(), usuario.getIdusuario()));
        } else {
            ayudanteRepository.save(new Ayudante(usuario.getIdusuario()));
        }

        auditoriaService.registrar("SOLICITUD_REGISTRO", correo, correo,
                "Auto-registro como " + rolNormalizado + ", cuenta pendiente de aprobación del administrador.", null);

        return new RegistroPendienteRespuestaDto(
                "Solicitud registrada. Su cuenta quedará activa cuando el administrador la apruebe.",
                usuario.getIdusuario(), correo, rolNormalizado, "PENDIENTE");
    }

    @Transactional
    public void cambiarContrasena(String correoUsuario, String contrasenaActual, String nuevaContrasena, String ip) {
        Usuario usuario = usuarioRepository.findByCorreousuario(correoUsuario)
                .orElseThrow(() -> new CredencialesInvalidasException("Usuario no encontrado."));

        if (!passwordEncoder.matches(contrasenaActual, usuario.getContraseniausuario())) {
            auditoriaService.registrar("CAMBIO_CONTRASENA_FALLIDO", correoUsuario, correoUsuario,
                    "Intento de cambio de contraseña con contraseña actual incorrecta.", ip);
            throw new CredencialesInvalidasException("La contraseña actual es incorrecta.");
        }

        usuario.setContraseniausuario(passwordEncoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);

        auditoriaService.registrar("CAMBIO_CONTRASENA_EXITOSO", correoUsuario, correoUsuario,
                "El usuario cambió su contraseña exitosamente.", ip);
    }

    private void validarUnicidad(String ci, String correo) {
        if (usuarioRepository.existsByCiusuario(ci)) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con el CI " + ci + ".");
        }
        if (usuarioRepository.existsByCorreousuario(correo)) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con el correo " + correo + ".");
        }
    }
}
