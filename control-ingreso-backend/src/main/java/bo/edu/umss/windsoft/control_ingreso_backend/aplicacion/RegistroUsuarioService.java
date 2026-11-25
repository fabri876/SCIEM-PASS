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
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.PoliticaAdministrador;
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
    private final GrupoService grupoService;
    private final PasswordEncoder passwordEncoder;

    public RegistroUsuarioService(
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            DocenteRepository docenteRepository,
            AyudanteRepository ayudanteRepository,
            AdminRepository adminRepository,
            GrupoService grupoService,
            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.adminRepository = adminRepository;
        this.grupoService = grupoService;
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
        if (rolesNormalizados.contains("admin")) {
            throw new ValidacionNegocioException("El registro de administradores no está disponible por esta vía.");
        }
        if ((rolesNormalizados.contains("docente") || rolesNormalizados.contains("estudiante") || rolesNormalizados.contains("ayudante"))
                && dto.getIdGrupo() == null && (dto.getIdGrupos() == null || dto.getIdGrupos().isEmpty())) {
            throw new ValidacionNegocioException("Debe asignar una asignatura y grupo al registrar docentes, estudiantes o ayudantes.");
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

        // 5. Generar el hash con el PasswordEncoder configurado (por defecto, el CI es la clave inicial).
        String ciNormalizado = CiNormalizador.normalizar(dto.getCarnetIdentidad());
        String rawPassword = (dto.getContrasena() == null || dto.getContrasena().trim().isEmpty())
                ? ciNormalizado
                : dto.getContrasena().trim();
        String contraseniaEncriptada = passwordEncoder.encode(rawPassword);

        // 6. Guardar la entidad Usuario
        Usuario usuario = new Usuario(
                ciNormalizado,
                nombreFinal,
                apellidoFinal,
                telefono,
                correoNormalizado,
                contraseniaEncriptada,
                true
        );
        usuario.setDebeCambiarContrasena(ciNormalizado.equals(rawPassword));
        Usuario usuarioGuardado = usuarioRepository.save(usuario);
        Integer idUsuarioGenerado = usuarioGuardado.getIdusuario();

        // 7. Guardar en las tablas de roles correspondientes y sus vincualciones con grupos
        Integer codigoSisParsed = null;
        if (dto.getCodigoSis() != null && !dto.getCodigoSis().trim().isEmpty()) {
            try {
                codigoSisParsed = Integer.parseInt(dto.getCodigoSis().trim());
            } catch (NumberFormatException e) {
                throw new ValidacionNegocioException("El Código SIS debe ser un número entero válido.");
            }
        }

        java.util.Set<Integer> gruposSolicitados = new java.util.LinkedHashSet<>();
        if (dto.getIdGrupo() != null) gruposSolicitados.add(dto.getIdGrupo());
        if (dto.getIdGrupos() != null) gruposSolicitados.addAll(dto.getIdGrupos());
        if (gruposSolicitados.size() > 100) throw new ValidacionNegocioException("Se admiten hasta 100 grupos.");
        for (String rol : rolesNormalizados) {
            String destino = switch (rol) {
                case "docente" -> TipoUsuarioResolver.DOCENTE;
                case "estudiante" -> TipoUsuarioResolver.ESTUDIANTE;
                case "ayudante" -> TipoUsuarioResolver.OPERADOR;
                default -> TipoUsuarioResolver.ADMINISTRADOR;
            };
            grupoService.validarAccesoRegistro(new java.util.ArrayList<>(gruposSolicitados), destino);
            switch (rol) {
                case "estudiante" -> {
                    int codSis = codigoSisParsed != null ? codigoSisParsed : idUsuarioGenerado;
                    estudianteRepository.save(new Estudiante(idUsuarioGenerado, codSis));
                    if (dto.getIdGrupo() != null) {
                        grupoService.inscribirEstudianteAGrupo(idUsuarioGenerado, codSis, dto.getIdGrupo());
                    }
                    if (dto.getIdGrupos() != null) {
                        for (Integer idG : dto.getIdGrupos()) {
                            grupoService.inscribirEstudianteAGrupo(idUsuarioGenerado, codSis, idG);
                        }
                    }
                }
                case "docente" -> {
                    int codSis = codigoSisParsed != null ? codigoSisParsed : idUsuarioGenerado;
                    docenteRepository.save(new Docente(idUsuarioGenerado, codSis));
                    if (dto.getIdGrupo() != null) {
                        grupoService.asignarDocenteAGrupo(idUsuarioGenerado, codSis, dto.getIdGrupo());
                    }
                    if (dto.getIdGrupos() != null) {
                        for (Integer idG : dto.getIdGrupos()) {
                            grupoService.asignarDocenteAGrupo(idUsuarioGenerado, codSis, idG);
                        }
                    }
                }
                case "ayudante" -> {
                    ayudanteRepository.save(new Ayudante(idUsuarioGenerado));
                    if (dto.getIdGrupo() != null) {
                        grupoService.asignarAyudanteAGrupo(idUsuarioGenerado, dto.getIdGrupo());
                    }
                    if (dto.getIdGrupos() != null) {
                        for (Integer idG : dto.getIdGrupos()) {
                            grupoService.asignarAyudanteAGrupo(idUsuarioGenerado, idG);
                        }
                    }
                }
                case "admin" -> {
                    PoliticaAdministrador.validarPuedeExistirOtro(adminRepository.count());
                    adminRepository.save(new Admin(idUsuarioGenerado));
                }
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
