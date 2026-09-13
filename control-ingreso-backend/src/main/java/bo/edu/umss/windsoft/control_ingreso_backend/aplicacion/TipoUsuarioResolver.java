package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import org.springframework.stereotype.Component;

/**
 * Determina el "rol" de un usuario a partir de en qué tabla hija tiene fila
 * (admin/docente/ayudante/estudiante), siguiendo el mismo diseño de
 * RegistroUsuarioService: no hay una columna "rol" en usuario, el tipo lo da
 * la tabla hija.
 *
 * Para estudiante se revisan dos casos porque hoy conviven dos flujos de
 * registro con convenciones distintas: RegistroUsuarioService guarda
 * codsisestudiante = idusuario (mismo patrón que admin/docente/ayudante),
 * mientras que el auto-registro de estudiante de HU16 guarda en
 * codsisestudiante el código SIS real y enlaza con idusuario en la columna
 * id_usuario. Por eso se prueban ambas formas de encontrar la fila.
 */
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
        if (adminRepository.existsById(idUsuario)) {
            return ADMINISTRADOR;
        }
        if (docenteRepository.existsById(idUsuario)) {
            return DOCENTE;
        }
        if (ayudanteRepository.existsById(idUsuario)) {
            return OPERADOR;
        }
        if (estudianteRepository.findByIdUsuario(idUsuario).isPresent() || estudianteRepository.existsById(idUsuario)) {
            return ESTUDIANTE;
        }
        return null;
    }
}
