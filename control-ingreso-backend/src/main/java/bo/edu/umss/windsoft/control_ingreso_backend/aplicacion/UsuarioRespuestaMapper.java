package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.stereotype.Component;

import java.util.List;

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
        List<String> permisos = rol == null ? List.of() : rolCatalogoService.permisosDe(rol);
        return new UsuarioRespuestaDto(usuario.getIdusuario(), usuario.getCiusuario(), usuario.getNombreusuario(),
                usuario.getApellidousuario(), usuario.getTelefonousuario(), usuario.getCorreousuario(),
                Boolean.TRUE.equals(usuario.getEstadousuario()), rol, usuario.getIntentosFallidos(), permisos);
    }
}
