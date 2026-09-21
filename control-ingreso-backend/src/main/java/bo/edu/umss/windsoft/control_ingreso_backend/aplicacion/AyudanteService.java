package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.stereotype.Service;

/**
 * Punto de partida para el panel de Ayudante/Operador (frontend ya armado
 * por el equipo, ver HomeControl.jsx). Por ahora solo expone el perfil
 * propio; el resto (verificación/registro de ingreso) depende de entidades
 * que todavía no existen (Ingreso/Inscrito/Credencial) y no corresponde a
 * esta HU.
 */
@Service
public class AyudanteService {

    private final UsuarioRepository usuarioRepository;
    private final AyudanteRepository ayudanteRepository;
    private final UsuarioRespuestaMapper usuarioRespuestaMapper;

    public AyudanteService(UsuarioRepository usuarioRepository, AyudanteRepository ayudanteRepository,
                            UsuarioRespuestaMapper usuarioRespuestaMapper) {
        this.usuarioRepository = usuarioRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.usuarioRespuestaMapper = usuarioRespuestaMapper;
    }

    public UsuarioRespuestaDto obtenerPerfil(String correo) {
        Usuario usuario = usuarioRepository.findByCorreousuario(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un usuario con correo " + correo + "."));
        if (!ayudanteRepository.existsByIdusuario(usuario.getIdusuario())) {
            throw new RecursoNoEncontradoException("El usuario autenticado no tiene rol OPERADOR.");
        }
        return usuarioRespuestaMapper.mapear(usuario);
    }
}
