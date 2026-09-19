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
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

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
        Set<Integer> idsAdmin = new HashSet<>();
        for (Admin admin : adminRepository.findAll()) {
            idsAdmin.add(admin.getIdusuario());
        }

        Set<Integer> idsDocente = new HashSet<>();
        for (Docente docente : docenteRepository.findAll()) {
            idsDocente.add(docente.getIdusuario());
        }

        Set<Integer> idsAyudante = new HashSet<>();
        for (Ayudante ayudante : ayudanteRepository.findAll()) {
            idsAyudante.add(ayudante.getIdusuario());
        }

        Set<Integer> idsEstudiantePorUsuario = new HashSet<>();
        for (Estudiante estudiante : estudianteRepository.findAll()) {
            idsEstudiantePorUsuario.add(estudiante.getIdusuario());
        }

        Map<Integer, String> resultado = new HashMap<>();
        for (Integer idUsuario : idsUsuario) {
            if (idsAdmin.contains(idUsuario)) {
                resultado.put(idUsuario, ADMINISTRADOR);
            } else if (idsDocente.contains(idUsuario)) {
                resultado.put(idUsuario, DOCENTE);
            } else if (idsAyudante.contains(idUsuario)) {
                resultado.put(idUsuario, OPERADOR);
            } else if (idsEstudiantePorUsuario.contains(idUsuario)) {
                resultado.put(idUsuario, ESTUDIANTE);
            } else {
                resultado.put(idUsuario, null);
            }
        }
        return resultado;
    }
}
