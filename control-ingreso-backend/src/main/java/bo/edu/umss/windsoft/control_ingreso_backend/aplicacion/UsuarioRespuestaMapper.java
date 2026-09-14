package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class UsuarioRespuestaMapper {

    private final TipoUsuarioResolver tipoUsuarioResolver;
    private final RolCatalogoService rolCatalogoService;

    public UsuarioRespuestaMapper(TipoUsuarioResolver tipoUsuarioResolver, RolCatalogoService rolCatalogoService) {
        this.tipoUsuarioResolver = tipoUsuarioResolver;
        this.rolCatalogoService = rolCatalogoService;
    }

    public UsuarioRespuestaDto mapear(Usuario usuario) {
        String rol = tipoUsuarioResolver.resolver(usuario.getIdusuario());
        return construir(usuario, rol);
    }

    /**
     * Igual que mapear(), pero resuelve el rol de todos los usuarios de una
     * sola pasada (ver TipoUsuarioResolver.resolverTodos) en vez de una
     * consulta por usuario — usado por el listado del panel de administración.
     */
    public List<UsuarioRespuestaDto> mapearTodos(List<Usuario> usuarios) {
        List<Integer> ids = usuarios.stream().map(Usuario::getIdusuario).toList();
        Map<Integer, String> roles = tipoUsuarioResolver.resolverTodos(ids);
        return usuarios.stream()
                .map(usuario -> construir(usuario, roles.get(usuario.getIdusuario())))
                .toList();
    }

    private UsuarioRespuestaDto construir(Usuario usuario, String rol) {
        List<String> permisos = rol == null ? List.of() : rolCatalogoService.permisosDe(rol);
        return new UsuarioRespuestaDto(usuario.getIdusuario(), usuario.getCiusuario(), usuario.getNombreusuario(),
                usuario.getApellidousuario(), usuario.getTelefonousuario(), usuario.getCorreousuario(),
                Boolean.TRUE.equals(usuario.getEstadousuario()), rol, usuario.getIntentosFallidos(), permisos);
    }
}
