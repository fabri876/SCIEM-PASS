package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class UsuarioRespuestaMapper {

    private final TipoUsuarioResolver tipoUsuarioResolver;
    private final RolCatalogoService rolCatalogoService;
    private final DocenteRepository docenteRepository;

    public UsuarioRespuestaMapper(TipoUsuarioResolver tipoUsuarioResolver, RolCatalogoService rolCatalogoService,
                                   DocenteRepository docenteRepository) {
        this.tipoUsuarioResolver = tipoUsuarioResolver;
        this.rolCatalogoService = rolCatalogoService;
        this.docenteRepository = docenteRepository;
    }

    public UsuarioRespuestaDto mapear(Usuario usuario) {
        String rol = tipoUsuarioResolver.resolver(usuario.getIdusuario());
        return construir(usuario, rol);
    }

    public List<UsuarioRespuestaDto> mapearTodos(List<Usuario> usuarios) {
        List<Integer> ids = usuarios.stream().map(Usuario::getIdusuario).toList();
        Map<Integer, String> roles = tipoUsuarioResolver.resolverTodos(ids);
        return usuarios.stream()
                .map(usuario -> construir(usuario, roles.get(usuario.getIdusuario())))
                .toList();
    }

    private UsuarioRespuestaDto construir(Usuario usuario, String rol) {
        List<String> permisos = rol == null ? List.of() : rolCatalogoService.permisosDe(rol);

        // codsisdocente = idusuario siempre, por diseño, pero igual confirmamos
        // que existe la fila en `docente` antes de asumirlo.
        Integer codsisDocente = null;
        if (TipoUsuarioResolver.DOCENTE.equals(rol)) {
            codsisDocente = docenteRepository.findByIdusuario(usuario.getIdusuario())
                    .map(Docente::getCodsisdocente)
                    .orElse(null);
        }

        return new UsuarioRespuestaDto(usuario.getIdusuario(), usuario.getCiusuario(), usuario.getNombreusuario(),
                usuario.getApellidousuario(), usuario.getTelefonousuario(), usuario.getCorreousuario(),
                Boolean.TRUE.equals(usuario.getEstadousuario()), rol, usuario.getIntentosFallidos(), permisos,
                codsisDocente);
    }
}