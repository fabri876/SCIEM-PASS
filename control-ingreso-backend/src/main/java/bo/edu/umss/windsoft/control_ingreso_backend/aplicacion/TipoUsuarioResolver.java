package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class TipoUsuarioResolver {

    public static final String ADMINISTRADOR = "ADMINISTRADOR";
    public static final String DOCENTE = "DOCENTE";
    public static final String OPERADOR = "OPERADOR";
    public static final String ESTUDIANTE = "ESTUDIANTE";

    private final AdminRepository adminRepository;
    private final DocenteRepository docenteRepository;
    private final AyudanteRepository ayudanteRepository;
    private final EstudianteRepository estudianteRepository;

    public TipoUsuarioResolver(AdminRepository adminRepository, DocenteRepository docenteRepository,
                                AyudanteRepository ayudanteRepository, EstudianteRepository estudianteRepository) {
        this.adminRepository = adminRepository;
        this.docenteRepository = docenteRepository;
        this.ayudanteRepository = ayudanteRepository;
        this.estudianteRepository = estudianteRepository;
    }

    public String resolver(Integer idUsuario) {
        if (adminRepository.existsByIdusuario(idUsuario)) {
            return ADMINISTRADOR;
        }
        if (docenteRepository.existsByIdusuario(idUsuario)) {
            return DOCENTE;
        }
        if (ayudanteRepository.existsByIdusuario(idUsuario)) {
            return OPERADOR;
        }
        if (estudianteRepository.existsByIdusuario(idUsuario)) {
            return ESTUDIANTE;
        }
        return null;
    }

    public Map<Integer, String> resolverTodos(Collection<Integer> idsUsuario) {
        Map<Integer, String> resultado = new HashMap<>();
        if (idsUsuario == null || idsUsuario.isEmpty()) {
            return resultado;
        }

        Set<Integer> idsAdmin = adminRepository.findByIdusuarioIn(idsUsuario)
                .stream().map(Admin::getIdusuario).collect(Collectors.toSet());

        Set<Integer> idsDocente = docenteRepository.findByIdusuarioIn(idsUsuario)
                .stream().map(Docente::getIdusuario).collect(Collectors.toSet());

        Set<Integer> idsAyudante = ayudanteRepository.findByIdusuarioIn(idsUsuario)
                .stream().map(Ayudante::getIdusuario).collect(Collectors.toSet());

        Set<Integer> idsEstudiante = estudianteRepository.findByIdusuarioIn(idsUsuario)
                .stream().map(Estudiante::getIdusuario).collect(Collectors.toSet());

        for (Integer id : idsUsuario) {
            if (idsAdmin.contains(id)) {
                resultado.put(id, ADMINISTRADOR);
            } else if (idsDocente.contains(id)) {
                resultado.put(id, DOCENTE);
            } else if (idsAyudante.contains(id)) {
                resultado.put(id, OPERADOR);
            } else if (idsEstudiante.contains(id)) {
                resultado.put(id, ESTUDIANTE);
            } else {
                resultado.put(id, null);
            }
        }
        return resultado;
    }
}