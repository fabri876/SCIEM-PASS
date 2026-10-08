package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/** Buscar a un estudiante por Código SIS o CI y ver su habilitación para un examen. */
@Service
public class EstudianteExamenService {

    public record EstudianteEncontrado(Estudiante estudiante, Usuario usuario) {
        public String nombreCompleto() {
            return (usuario.getNombreusuario() + " " + usuario.getApellidousuario()).trim();
        }
    }

    public enum EstadoHabilitacion { HABILITADO, INHABILITADO, NO_EN_LISTA }

    public record HabilitacionExamen(EstadoHabilitacion estado, String observacion) {
    }

    private final EstudianteRepository estudianteRepository;
    private final UsuarioRepository usuarioRepository;
    private final HabilitacionRepository habilitacionRepository;

    public EstudianteExamenService(EstudianteRepository estudianteRepository, UsuarioRepository usuarioRepository,
                                   HabilitacionRepository habilitacionRepository) {
        this.estudianteRepository = estudianteRepository;
        this.usuarioRepository = usuarioRepository;
        this.habilitacionRepository = habilitacionRepository;
    }

    /** Acepta Código SIS (numérico) o CI. Vacío si no existe. */
    public Optional<EstudianteEncontrado> buscar(String codSisOCi) {
        if (codSisOCi == null || codSisOCi.isBlank()) {
            return Optional.empty();
        }
        String valor = codSisOCi.trim();

        Optional<Estudiante> estudiante = Optional.empty();
        if (valor.matches("\\d{1,9}")) {
            estudiante = estudianteRepository.findByCodsisestudiante(Integer.valueOf(valor));
        }
        if (estudiante.isEmpty()) {
            estudiante = usuarioRepository.findByCiusuario(valor)
                    .flatMap(u -> estudianteRepository.findByIdusuario(u.getIdusuario()));
        }
        return estudiante.flatMap(e -> usuarioRepository.findById(e.getIdusuario())
                .map(u -> new EstudianteEncontrado(e, u)));
    }

    public Optional<EstudianteEncontrado> buscarPorCodSis(Integer codSis) {
        return codSis == null ? Optional.empty() : buscar(String.valueOf(codSis));
    }

    /** Habilitación del estudiante para el examen del aula. */
    public HabilitacionExamen habilitacion(Integer codSis, Ambiente ambiente) {
        Optional<Habilitacion> habilitacion = habilitacionRepository.findByEstudianteCodsisestudiante(codSis).stream()
                .filter(h -> ambiente.getIdExamen().equals(h.getIdExamen())
                        || (h.getIdExamen() == null && ambiente.getIdAsignatura().equals(h.getIdAsignatura())))
                .findFirst();

        if (habilitacion.isEmpty()) {
            return new HabilitacionExamen(EstadoHabilitacion.NO_EN_LISTA, null);
        }
        return Boolean.TRUE.equals(habilitacion.get().getEstadohabilitacion())
                ? new HabilitacionExamen(EstadoHabilitacion.HABILITADO, null)
                : new HabilitacionExamen(EstadoHabilitacion.INHABILITADO, habilitacion.get().getObservacionhabilitacion());
    }
}
