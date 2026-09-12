package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroUsuarioRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioResponseDTO;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          EstudianteRepository estudianteRepository,
                          DocenteRepository docenteRepository,
                          AyudanteRepository ayudanteRepository,
                          AdminRepository adminRepository,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UsuarioResponseDTO registrarUsuario(RegistroUsuarioRequestDTO dto) {
        if (usuarioRepository.existsByCiusuario(dto.getCarnetIdentidad())) {
            throw new IllegalArgumentException("Ya existe un usuario registrado con el CI: " + dto.getCarnetIdentidad());
        }
        if (usuarioRepository.existsByCorreousuario(dto.getCorreo())) {
            throw new IllegalArgumentException("Ya existe un usuario registrado con el correo: " + dto.getCorreo());
        }

        String rolPrincipal = "ESTUDIANTE";
        if (dto.getRoles() != null && !dto.getRoles().isEmpty()) {
            rolPrincipal = dto.getRoles().get(0).toUpperCase();
        }

        String passwordHasheada = passwordEncoder.encode(dto.getContrasena());

        Usuario usuario = new Usuario(
                dto.getCarnetIdentidad(),
                dto.obtenerNombreCompleto(),
                dto.obtenerApellidoCompleto(),
                dto.getTelefono(),
                dto.getCorreo(),
                passwordHasheada,
                true,
                rolPrincipal
        );

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        Integer codigoSis = dto.getCodigoSis() != null ? dto.getCodigoSis() : usuarioGuardado.getIdusuario();

        if (dto.getRoles() != null) {
            for (String r : dto.getRoles()) {
                String rolNorm = r.trim().toLowerCase();
                if ("estudiante".equals(rolNorm)) {
                    Estudiante estudiante = new Estudiante(codigoSis, usuarioGuardado, dto.getFotoUrl(), dto.getCodigoQr());
                    estudianteRepository.save(estudiante);
                } else if ("docente".equals(rolNorm)) {
                    Docente docente = new Docente(codigoSis, usuarioGuardado);
                    docenteRepository.save(docente);
                } else if ("ayudante".equals(rolNorm)) {
                    Ayudante ayudante = new Ayudante(usuarioGuardado.getIdusuario(), usuarioGuardado);
                    ayudanteRepository.save(ayudante);
                } else if ("admin".equals(rolNorm) || "administrador".equals(rolNorm)) {
                    Admin admin = new Admin(usuarioGuardado.getIdusuario(), usuarioGuardado);
                    adminRepository.save(admin);
                }
            }
        } else {
            Estudiante estudiante = new Estudiante(codigoSis, usuarioGuardado, dto.getFotoUrl(), dto.getCodigoQr());
            estudianteRepository.save(estudiante);
        }

        return mapearAUsuarioResponseDTO(usuarioGuardado, codigoSis);
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> listarUsuarios() {
        return usuarioRepository.findAll().stream()
                .map(u -> mapearAUsuarioResponseDTO(u, null))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UsuarioResponseDTO obtenerPorId(Integer idusuario) {
        Usuario usuario = usuarioRepository.findById(idusuario)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + idusuario));
        return mapearAUsuarioResponseDTO(usuario, null);
    }

    private UsuarioResponseDTO mapearAUsuarioResponseDTO(Usuario u, Integer codigoSis) {
        return new UsuarioResponseDTO(
                u.getIdusuario(),
                u.getCiusuario(),
                u.getNombreusuario(),
                u.getApellidousuario(),
                u.getTelefonousuario(),
                u.getCorreousuario(),
                u.getEstadousuario(),
                u.getRol(),
                codigoSis
        );
    }
}
