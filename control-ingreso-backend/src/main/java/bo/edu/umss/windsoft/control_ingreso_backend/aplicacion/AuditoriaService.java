package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

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

    private static final Logger logger = LoggerFactory.getLogger(AuditoriaService.class);

    private final AuditoriaRepository auditoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final TransactionTemplate transaccionPropia;

    public AuditoriaService(AuditoriaRepository auditoriaRepository, UsuarioRepository usuarioRepository,
                            PlatformTransactionManager transactionManager) {
        this.auditoriaRepository = auditoriaRepository;
        this.usuarioRepository = usuarioRepository;
        this.transaccionPropia = new TransactionTemplate(transactionManager);
        this.transaccionPropia.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Guarda la auditoría en una transacción PROPIA (REQUIRES_NEW) y NUNCA lanza.
     *
     * Antes el método era @Transactional(REQUIRES_NEW) y el try/catch estaba DENTRO:
     * si el insert (o la búsqueda del usuario) fallaba, la excepción se tragaba pero
     * Spring ya había marcado esa transacción como "rollback-only", y al hacer commit
     * lanzaba UnexpectedRollbackException ("Transaction silently rolled back because
     * it has been marked as rollback-only"): el flujo que estaba auditando terminaba
     * en HTTP 500 y la fila se perdía (BUG-038). Con TransactionTemplate el commit
     * queda dentro del try/catch, igual que en IntentoIngresoService.
     */
    public void registrar(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                           String detalles, String ipOrigen) {
        try {
            transaccionPropia.executeWithoutResult(estado ->
                    guardarRegistro(tipoOperacion, usuarioEjecutor, usuarioAfectado, detalles, ipOrigen));
        } catch (Exception e) {
            // Con la traza completa para ver la causa real si la auditoría no se guarda
            logger.error("No se pudo registrar la auditoría [{}]: {}", tipoOperacion, e.getMessage(), e);
        }
    }

    /** Se une a la transacción de quien la llama (la auditoría es parte de su misma operación). */
    @Transactional
    public void registrarEnTransaccion(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                                       String detalles, String ipOrigen) {
        // Una operación crítica no debe confirmarse si su auditoría falla.
        guardarRegistro(tipoOperacion, usuarioEjecutor, usuarioAfectado, detalles, ipOrigen);
    }

    /** Para registros que no pueden perder detalles; requiere columna accion de tipo TEXT. */
    @Transactional
    public void registrarCompletoEnTransaccion(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                                               String detalles, String ipOrigen) {
        guardarRegistro(tipoOperacion, usuarioEjecutor, usuarioAfectado, detalles, ipOrigen, false);
    }

    private void guardarRegistro(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                                 String detalles, String ipOrigen) {
        // accion es TEXT desde BUG-030: conservar detalles completos.
        guardarRegistro(tipoOperacion, usuarioEjecutor, usuarioAfectado, detalles, ipOrigen, false);
    }

    private void guardarRegistro(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                                 String detalles, String ipOrigen, boolean limitarLongitud) {
        Integer idUsuario = resolverIdUsuario(usuarioAfectado);
        if (idUsuario == null) {
            idUsuario = resolverIdUsuario(usuarioEjecutor);
        }

        String accion = "[" + tipoOperacion + "] ejecutor=" + valorOr(usuarioEjecutor)
                + " | afectado=" + valorOr(usuarioAfectado)
                + " | ip=" + valorOr(ipOrigen)
                + " | " + valorOr(detalles);

        // La columna 'accion' en PostgreSQL es varchar(255) (BUG-030 y BUG-038).
        // Si el texto supera los 255 caracteres, PostgreSQL rechaza el insert.
        // Se trunca a 255 para garantizar que el registro de auditoría siempre se guarde.
        if (limitarLongitud && accion.length() > 255) {
            accion = accion.substring(0, 255);
        }

        // El id lo genera PostgreSQL (columna IDENTITY, ver Auditoria.java).
        Auditoria auditoria = new Auditoria(idUsuario, accion);
        auditoriaRepository.save(auditoria);
    }
    @Transactional
    public void registrarExpulsionEnTransaccion(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                                                 String detalles, String motivo, String ipOrigen) {
        guardarRegistroConMotivo(tipoOperacion, usuarioEjecutor, usuarioAfectado, detalles, motivo, ipOrigen, false);
    }

    private void guardarRegistroConMotivo(String tipoOperacion, String usuarioEjecutor, String usuarioAfectado,
                                           String detalles, String motivo, String ipOrigen, boolean limitarLongitud) {
        Integer idUsuario = resolverIdUsuario(usuarioAfectado);
        if (idUsuario == null) {
            idUsuario = resolverIdUsuario(usuarioEjecutor);
        }

        String accion = "[" + tipoOperacion + "] ejecutor=" + valorOr(usuarioEjecutor)
                + " | afectado=" + valorOr(usuarioAfectado)
                + " | ip=" + valorOr(ipOrigen)
                + " | " + valorOr(detalles);

        // La columna 'accion' en PostgreSQL es varchar(255) (BUG-030 y BUG-038).
        // Si el texto supera los 255 caracteres, PostgreSQL rechaza el insert.
        // Se trunca a 255 para garantizar que el registro de auditoría siempre se guarde.
        if (limitarLongitud && accion.length() > 255) {
            accion = accion.substring(0, 255);
        }

        // El id lo genera PostgreSQL (columna IDENTITY, ver Auditoria.java).
        Auditoria auditoria = new Auditoria(idUsuario, accion, motivo);
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
