package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * La tabla nueva "historialauditoria" solo tiene un idusuario (no distingue
 * ejecutor de afectado) y no tiene columna de IP. Para no perder esa
 * información del todo mientras el equipo decide si se amplía la tabla,
 * se guarda todo (tipo de operación, ejecutor, afectado, IP, detalles) como
 * texto en el campo "accion", y el idusuario que se persiste es el del
 * usuario afectado (o el ejecutor si el afectado no existe en la BD, como
 * en un intento de login con un correo que no está registrado).
 */
@Service
public class AuditoriaService {

    private final AuditoriaRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public AuditoriaService(AuditoriaRepository auditoriaRepository, UsuarioRepository usuarioRepository) {
        this.auditoriaRepository = auditoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public void registrar(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                           String detalles, String ipOrigen) {
        Integer idUsuario = resolverIdUsuario(usuarioAfectado);
        if (idUsuario == null) {
            idUsuario = resolverIdUsuario(usuarioEjecutor);
        }

        String accion = "[" + tipoOperacion + "] ejecutor=" + valorOr(usuarioEjecutor)
                + " | afectado=" + valorOr(usuarioAfectado)
                + " | ip=" + valorOr(ipOrigen)
                + " | " + valorOr(detalles);

        Auditoria auditoria = new Auditoria(idUsuario, accion);
        auditoriaRepository.save(auditoria);
    }

    public List<Auditoria> listar() {
        return auditoriaRepository.findAllByOrderByIdAuditoriaDesc();
    }

    private Integer resolverIdUsuario(String correo) {
        if (correo == null || correo.isBlank()) {
            return null;
        }
        return usuarioRepository.findByCorreousuario(correo)
                .map(u -> u.getIdusuario())
                .orElse(null);
    }

    private String valorOr(String valor) {
        return valor == null || valor.isBlank() ? "-" : valor;
    }
}
