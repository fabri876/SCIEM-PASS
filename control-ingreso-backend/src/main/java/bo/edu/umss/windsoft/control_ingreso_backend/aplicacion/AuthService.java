package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CredencialesInvalidasException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaBloqueadaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaInactivaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.LoginResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroEstudianteResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroPendienteRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern CORREO_INSTITUCIONAL = Pattern.compile("(?i)@(est\\.)?umss\\.edu$");

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final CloudinaryService cloudinaryService;
    private final QrService qrService;
    private final AuditoriaService auditoriaService;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;
    private final TipoUsuarioResolver tipoUsuarioResolver;

    public AuthService(UsuarioRepository usuarioRepository, EstudianteRepository estudianteRepository,
                        DocenteRepository docenteRepository, AyudanteRepository ayudanteRepository,
                        PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider,
                        CloudinaryService cloudinaryService, QrService qrService,
                        AuditoriaService auditoriaService, UsuarioRespuestaMapper usuarioRespuestaMapper,
                        TipoUsuarioResolver tipoUsuarioResolver) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.cloudinaryService = cloudinaryService;
        this.qrService = qrService;
        this.auditoriaService = auditoriaService;
        this.usuarioRespuestaMapper = usuarioRespuestaMapper;
        this.tipoUsuarioResolver = tipoUsuarioResolver;
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
            usuario.registrarIntentoFallido();
            usuarioRepository.save(usuario);

            if (usuario.isBloqueado()) {
                auditoriaService.registrar("CUENTA_BLOQUEADA", "SISTEMA", correo,
                        "Cuenta bloqueada tras 5 intentos fallidos consecutivos de inicio de sesión.", ip);
                throw new CuentaBloqueadaException(
                        "Cuenta bloqueada temporalmente por 5 intentos fallidos consecutivos. Contacte al administrador.");
            }

            auditoriaService.registrar("LOGIN_FALLIDO", "SISTEMA", correo,
                    "Contraseña incorrecta. Intento " + usuario.getIntentosFallidos() + " de 5.", ip);
            throw new CredencialesInvalidasException(
                    "Contraseña incorrecta. Intento " + usuario.getIntentosFallidos() + " de 5.");
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
    public RegistroEstudianteResponseDto registrarEstudiante(String nombre, String apellido, String ci,
                                                               String correo, String contrasena, Integer codigoSis,
                                                               Integer telefono, MultipartFile foto) throws Exception {
        if (!CORREO_INSTITUCIONAL.matcher(correo).find()) {
            throw new SolicitudInvalidaException(
                    "El correo debe ser institucional (dominio umss.edu o est.umss.edu).");
        }
        validarUnicidad(ci, correo);
        if (foto == null || foto.isEmpty()) {
            throw new SolicitudInvalidaException("La foto del estudiante es obligatoria.");
        }

        String fotoUrl = cloudinaryService.uploadImage(foto);

        Usuario usuario = new Usuario(ci, nombre, apellido, telefono, correo,
                passwordEncoder.encode(contrasena), true);
        usuario = usuarioRepository.save(usuario);

        String contenidoQr = "EST:" + ci + ":" + codigoSis;
        String codigoQr = qrService.generarQrBase64(contenidoQr);

        Estudiante estudiante = new Estudiante(codigoSis, ci, nombre, apellido,
                usuario.getIdusuario(), fotoUrl, codigoQr);
        estudiante = estudianteRepository.save(estudiante);

        auditoriaService.registrar("REGISTRO_ESTUDIANTE", correo, correo,
                "Auto-registro de estudiante con generación de código QR.", null);

        return new RegistroEstudianteResponseDto("Estudiante registrado exitosamente", usuario.getIdusuario(),
                estudiante.getCodsisestudiante(), nombre, apellido, ci, correo, codigoSis,
                TipoUsuarioResolver.ESTUDIANTE, fotoUrl, codigoQr);
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
            docenteRepository.save(new Docente(usuario.getIdusuario()));
        } else {
            ayudanteRepository.save(new Ayudante(usuario.getIdusuario()));
        }

        auditoriaService.registrar("SOLICITUD_REGISTRO", correo, correo,
                "Auto-registro como " + rolNormalizado + ", cuenta pendiente de aprobación del administrador.", null);

        return new RegistroPendienteRespuestaDto(
                "Solicitud registrada. Su cuenta quedará activa cuando el administrador la apruebe.",
                usuario.getIdusuario(), correo, rolNormalizado, "PENDIENTE");
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
