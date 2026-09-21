package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.stereotype.Service;

/**
 * Punto de partida para el panel de Docente (frontend ya armado por el
 * equipo, ver HomeDocente.jsx). Por ahora solo expone el perfil propio; el
 * resto (exámenes del día, habilitaciones por examen) depende de entidades
 * que todavía no existen (Asignatura/DocenteAsignatura) y no corresponde a
 * esta HU.
 */
@Service
public class DocenteService {

    private final UsuarioRepository usuarioRepository;
    private final DocenteRepository docenteRepository;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;

    public DocenteService(UsuarioRepository usuarioRepository, DocenteRepository docenteRepository,
                           UsuarioRespuestaMapper usuarioRespuestaMapper) {
        this.usuarioRepository = usuarioRepository;
        this.docenteRepository = docenteRepository;
        this.usuarioRespuestaMapper = usuarioRespuestaMapper;
    }

    public UsuarioRespuestaDto obtenerPerfil(String correo) {
        Usuario usuario = usuarioRepository.findByCorreousuario(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un usuario con correo " + correo + "."));
        if (!docenteRepository.existsByIdusuario(usuario.getIdusuario())) {
            throw new RecursoNoEncontradoException("El usuario autenticado no tiene rol DOCENTE.");
        }
        return usuarioRespuestaMapper.mapear(usuario);
    }
}
