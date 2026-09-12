package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ValidacionNegocioException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroUsuarioRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioResponseDTO;

@Service
public class RegistroUsuarioService {

    private static final Set<String> ROLES_PERMITIDOS = Set.of("estudiante", "docente", "ayudante", "admin");

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistroUsuarioService(
            UsuarioRepository usuarioRepository,
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
        String correoNormalizado = dto.getCorreo().trim().toLowerCase();

        // 1. Validar que el correo no esté registrado previamente
        if (usuarioRepository.existsByCorreousuario(correoNormalizado)) {
            throw new RecursoDuplicadoException("El correo '" + correoNormalizado + "' ya se encuentra registrado en el sistema.");
        }

        // 2. Validar roles
        if (dto.getRoles() == null || dto.getRoles().isEmpty()) {
            throw new ValidacionNegocioException("Debe seleccionar al menos un rol para el usuario.");
        }

        List<String> rolesNormalizados = new ArrayList<>();
        for (String rol : dto.getRoles()) {
            if (rol != null && !rol.isBlank()) {
                String rolMin = rol.trim().toLowerCase();
                if (!ROLES_PERMITIDOS.contains(rolMin)) {
                    throw new ValidacionNegocioException("El rol '" + rol + "' no es válido. Roles permitidos: estudiante, docente, ayudante, admin.");
                }
                if (!rolesNormalizados.contains(rolMin)) {
                    rolesNormalizados.add(rolMin);
                }
            }
        }

        if (rolesNormalizados.isEmpty()) {
            throw new ValidacionNegocioException("Debe seleccionar al menos un rol válido.");
        }

        // 3. Normalizar nombres y apellidos
        String nombreFinal = dto.getPrimerNombre().trim();
        if (dto.getSegundoNombre() != null && !dto.getSegundoNombre().trim().isEmpty()) {
            nombreFinal += " " + dto.getSegundoNombre().trim();
        }

        String apellidoFinal = dto.getApellidoPaterno().trim();
        if (dto.getApellidoMaterno() != null && !dto.getApellidoMaterno().trim().isEmpty()) {
            apellidoFinal += " " + dto.getApellidoMaterno().trim();
        }

        // 4. Parsear teléfono opcional
        Integer telefono = null;
        if (dto.getTelefono() != null && !dto.getTelefono().trim().isEmpty()) {
            String soloDigitos = dto.getTelefono().replaceAll("[^0-9]", "");
            if (!soloDigitos.isEmpty()) {
                try {
                    telefono = Integer.parseInt(soloDigitos);
                } catch (NumberFormatException e) {
                    throw new ValidacionNegocioException("El formato del teléfono no es válido.");
                }
            }
        }

        // 5. Encriptar contraseña con BCrypt
        String contraseniaEncriptada = passwordEncoder.encode(dto.getContrasena().trim());

        // 6. Guardar la entidad Usuario
        Usuario usuario = new Usuario(
                dto.getCarnetIdentidad().trim(),
                nombreFinal,
                apellidoFinal,
                telefono,
                correoNormalizado,
                contraseniaEncriptada,
                true
        );
        Usuario usuarioGuardado = usuarioRepository.save(usuario);
        Integer idUsuarioGenerado = usuarioGuardado.getIdusuario();

        // 7. Guardar en las tablas de roles correspondientes
        for (String rol : rolesNormalizados) {
            switch (rol) {
                case "estudiante" -> estudianteRepository.save(new Estudiante(idUsuarioGenerado));
                case "docente" -> docenteRepository.save(new Docente(idUsuarioGenerado));
                case "ayudante" -> ayudanteRepository.save(new Ayudante(idUsuarioGenerado));
                case "admin" -> adminRepository.save(new Admin(idUsuarioGenerado));
            }
        }

        // 8. Construir respuesta
        return new UsuarioResponseDTO(
                usuarioGuardado.getIdusuario(),
                usuarioGuardado.getCiusuario(),
                usuarioGuardado.getNombreusuario(),
                usuarioGuardado.getApellidousuario(),
                usuarioGuardado.getCorreousuario(),
                usuarioGuardado.getTelefonousuario(),
                rolesNormalizados,
                usuarioGuardado.getEstadousuario(),
                "Usuario registrado exitosamente en el sistema."
        );
    }
}
