package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class UsuarioRespuestaMapper {

    private final TipoUsuarioResolver tipoUsuarioResolver;
    private final RolCatalogoService rolCatalogoService;
    private final DocenteRepository docenteRepository;
    private final EstudianteRepository estudianteRepository;

    public UsuarioRespuestaMapper(TipoUsuarioResolver tipoUsuarioResolver, RolCatalogoService rolCatalogoService,
                                   DocenteRepository docenteRepository, EstudianteRepository estudianteRepository) {
        this.tipoUsuarioResolver = tipoUsuarioResolver;
        this.rolCatalogoService = rolCatalogoService;
        this.docenteRepository = docenteRepository;
        this.estudianteRepository = estudianteRepository;
    }

    public UsuarioRespuestaDto mapear(Usuario usuario) {
        String rol = tipoUsuarioResolver.resolver(usuario.getIdusuario());
        Integer codigoSis = resolverCodigoSis(usuario.getIdusuario(), rol);
        return construir(usuario, rol, codigoSis);
    }

    /** Enriquece en batch: UNA consulta a docente y UNA a estudiante para todo
     *  el lote, en vez de una por usuario (evita el patrón N+1). */
    public List<UsuarioRespuestaDto> mapearTodos(List<Usuario> usuarios) {
        if (usuarios.isEmpty()) {
            return List.of();
        }

        List<Integer> ids = usuarios.stream().map(Usuario::getIdusuario).toList();
        Map<Integer, String> roles = tipoUsuarioResolver.resolverTodos(ids);

        Map<Integer, Integer> codsisDocentePorIdUsuario = docenteRepository.findByIdusuarioIn(ids).stream()
                .collect(Collectors.toMap(Docente::getIdusuario, Docente::getCodsisdocente));

        Map<Integer, Integer> codsisEstudiantePorIdUsuario = estudianteRepository.findByIdusuarioIn(ids).stream()
                .collect(Collectors.toMap(Estudiante::getIdusuario, Estudiante::getCodsisestudiante));

        return usuarios.stream()
                .map(usuario -> {
                    String rol = roles.get(usuario.getIdusuario());
                    Integer codigoSis = TipoUsuarioResolver.DOCENTE.equals(rol)
                            ? codsisDocentePorIdUsuario.get(usuario.getIdusuario())
                            : TipoUsuarioResolver.ESTUDIANTE.equals(rol)
                                    ? codsisEstudiantePorIdUsuario.get(usuario.getIdusuario())
                                    : null;
                    return construir(usuario, rol, codigoSis);
                })
                .toList();
    }

    private UsuarioRespuestaDto construir(Usuario usuario, String rol, Integer codigoSis) {
        List<String> permisos = rol == null ? List.of() : rolCatalogoService.permisosDe(rol);
        return new UsuarioRespuestaDto(usuario.getIdusuario(), usuario.getCiusuario(), usuario.getNombreusuario(),
                usuario.getApellidousuario(), usuario.getTelefonousuario(), usuario.getCorreousuario(),
                Boolean.TRUE.equals(usuario.getEstadousuario()), rol, usuario.getIntentosFallidos(), permisos,
                codigoSis);
    }

    private Integer resolverCodigoSis(Integer idUsuario, String rol) {
        if (TipoUsuarioResolver.DOCENTE.equals(rol)) {
            return docenteRepository.findByIdusuario(idUsuario).map(Docente::getCodsisdocente).orElse(null);
        }
        if (TipoUsuarioResolver.ESTUDIANTE.equals(rol)) {
            return estudianteRepository.findByIdusuario(idUsuario).map(Estudiante::getCodsisestudiante).orElse(null);
        }
        return null;
    }
}