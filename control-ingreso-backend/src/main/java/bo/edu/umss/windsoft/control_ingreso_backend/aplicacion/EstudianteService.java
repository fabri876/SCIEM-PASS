package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.stereotype.Service;

/**
 * Punto de partida para el panel de Estudiante (frontend ya armado por el
 * equipo, ver HomeEstudiante.jsx). Por ahora solo expone el perfil propio;
 * el resto (mis exámenes, QR) depende de entidades que todavía no existen
 * (Inscrito/Credencial) y no corresponde a esta HU.
 */
@Service
public class EstudianteService {

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;

    public EstudianteService(UsuarioRepository usuarioRepository, EstudianteRepository estudianteRepository,
                              UsuarioRespuestaMapper usuarioRespuestaMapper) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.usuarioRespuestaMapper = usuarioRespuestaMapper;
    }

    public UsuarioRespuestaDto obtenerPerfil(String correo) {
        Usuario usuario = usuarioRepository.findByCorreousuario(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un usuario con correo " + correo + "."));
        if (!estudianteRepository.existsByIdusuario(usuario.getIdusuario())) {
            throw new RecursoNoEncontradoException("El usuario autenticado no tiene rol ESTUDIANTE.");
        }
        return usuarioRespuestaMapper.mapear(usuario);
    }
}
