package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * BUG-001 (QA): AuthService.login() es @Transactional y, en el camino de
 * contraseña incorrecta, lanza una excepción justo después de guardar el
 * intento fallido — Spring hace rollback de TODA la transacción al salir
 * por una excepción no controlada, así que el contador nunca quedaba
 * persistido (por eso el mensaje siempre decía "Intento 1 de 5"). Mismo
 * problema que ya se había resuelto en AuditoriaService con
 * REQUIRES_NEW: este guardado necesita su propia transacción,
 * independiente de si el método que lo llama termina lanzando una
 * excepción o no.
 */
@Service
public class UsuarioBloqueoService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioBloqueoService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Usuario registrarIntentoFallido(Integer idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe un usuario con id " + idUsuario + "."));
        usuario.registrarIntentoFallido();
        return usuarioRepository.save(usuario);
    }
}
