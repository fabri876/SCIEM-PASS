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
        return construir(usuario, rol);
    }

    /** Enriquece en batch: UNA consulta a docente y UNA a estudiante para todo
     *  el lote, en vez de una por usuario (evita el patrón N+1). */
    public List<UsuarioRespuestaDto> mapearTodos(List<Usuario> usuarios) {
        List<Integer> ids = usuarios.stream().map(Usuario::getIdusuario).toList();
        Map<Integer, String> roles = tipoUsuarioResolver.resolverTodos(ids);

        // Usamos findByIdusuarioIn en lugar de findAll() para no saturar la memoria
        Map<Integer, Integer> codigosSisDocente = docenteRepository.findByIdusuarioIn(ids).stream()
                .collect(Collectors.toMap(Docente::getIdusuario, Docente::getCodsisdocente,
                        (a, b) -> a));
        Map<Integer, Integer> codigosSisEstudiante = estudianteRepository.findByIdusuarioIn(ids).stream()
                .collect(Collectors.toMap(Estudiante::getIdusuario, Estudiante::getCodsisestudiante,
                        (a, b) -> a));

        // FIX: Caché de permisos para evitar el N+1 al consultar la BD por cada usuario
        Map<String, List<String>> permisosCache = new java.util.HashMap<>();

        return usuarios.stream()
                .map(usuario -> {
                    String rol = roles.get(usuario.getIdusuario());
                    
                    // Solo va a la base de datos la primera vez que ve un rol nuevo
                    List<String> permisos = permisosCache.computeIfAbsent(rol, 
                            r -> r == null ? List.of() : rolCatalogoService.permisosDe(r));
                            
                    return construir(usuario, rol, permisos, codigosSisDocente, codigosSisEstudiante);
                })
                .toList();
    }

    private UsuarioRespuestaDto construir(Usuario usuario, String rol) {
        // Se mantiene para el caso de mapear() un solo usuario (no hay N+1 con 1 solo).
        List<String> permisos = rol == null ? List.of() : rolCatalogoService.permisosDe(rol);
        Integer codigoSis = resolverCodigoSis(usuario.getIdusuario(), rol);
        return new UsuarioRespuestaDto(usuario.getIdusuario(), usuario.getCiusuario(), usuario.getNombreusuario(),
                usuario.getApellidousuario(), usuario.getTelefonousuario(), usuario.getCorreousuario(),
                Boolean.TRUE.equals(usuario.getEstadousuario()), rol, usuario.getIntentosFallidos(), permisos,
                codigoSis);
    }

    private UsuarioRespuestaDto construir(Usuario usuario, String rol, List<String> permisos,
                                        Map<Integer, Integer> codigosSisDocente,
                                        Map<Integer, Integer> codigosSisEstudiante) {
        Integer codigoSis;
        if (TipoUsuarioResolver.DOCENTE.equals(rol)) {
            codigoSis = codigosSisDocente.get(usuario.getIdusuario());
        } else if (TipoUsuarioResolver.ESTUDIANTE.equals(rol)) {
            codigoSis = codigosSisEstudiante.get(usuario.getIdusuario());
        } else {
            codigoSis = null;
        }
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