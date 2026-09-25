// aplicacion/AsignaturaService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignaturaResponseDto;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AsignaturaService {

    private final DocenteAsignaturaRepository docenteAsignaturaRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ExamenRepository examenRepository;

    public AsignaturaService(
            DocenteAsignaturaRepository docenteAsignaturaRepository,
            AsignaturaRepository asignaturaRepository,
            UsuarioRepository usuarioRepository,
            ExamenRepository examenRepository) {
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.usuarioRepository = usuarioRepository;
        this.examenRepository = examenRepository;
    }

    public List<AsignaturaResponseDto> obtenerPorDocente(Integer idUsuario, Integer codsisDocente) {
        List<Integer> ids = docenteAsignaturaRepository
                .findByIdIdusuarioAndIdCodsisdocente(idUsuario, codsisDocente)
                .stream()
                .map(da -> da.getId().getIdasignatura())
                .toList();

        List<Asignatura> asignaturas = asignaturaRepository.findAllById(ids);
        return asignaturas.stream().map(this::mapToDto).toList();
    }

    public List<AsignaturaResponseDto> obtenerTodas() {
        List<Asignatura> asignaturas = asignaturaRepository.findAll();
        return asignaturas.stream().map(this::mapToDto).toList();
    }

    private AsignaturaResponseDto mapToDto(Asignatura asignatura) {
        String nombreDocente = resolverNombreDocente(asignatura.getIdAsignatura());
        return new AsignaturaResponseDto(
                asignatura.getIdAsignatura(),
                asignatura.getIdInscripcion(),
                asignatura.getNombreAsignatura(),
                asignatura.getSiglaAsignatura(),
                nombreDocente
        );
    }

    private String resolverNombreDocente(Integer idAsignatura) {
        if (idAsignatura == null) return "Docente Asignado";

        // 1. Buscar en DocenteAsignatura
        List<DocenteAsignatura> docentesAsig = docenteAsignaturaRepository.findByIdIdasignatura(idAsignatura);
        if (!docentesAsig.isEmpty()) {
            List<String> nombres = docentesAsig.stream()
                    .map(da -> da.getId().getIdusuario())
                    .map(usuarioRepository::findById)
                    .flatMap(opt -> opt.stream())
                    .map(u -> ((u.getNombreusuario() != null ? u.getNombreusuario() : "") + " " + (u.getApellidousuario() != null ? u.getApellidousuario() : "")).trim())
                    .filter(n -> !n.isEmpty())
                    .distinct()
                    .collect(Collectors.toList());

            if (!nombres.isEmpty()) {
                return String.join(", ", nombres);
            }
        }

        // 2. Fallback: Buscar en Examen
        List<Examen> examenes = examenRepository.findByIdAsignatura(idAsignatura);
        if (!examenes.isEmpty()) {
            for (Examen ex : examenes) {
                if (ex.getIdUsuario() != null) {
                    Usuario u = usuarioRepository.findById(ex.getIdUsuario()).orElse(null);
                    if (u != null) {
                        String nombre = ((u.getNombreusuario() != null ? u.getNombreusuario() : "") + " " + (u.getApellidousuario() != null ? u.getApellidousuario() : "")).trim();
                        if (!nombre.isEmpty()) {
                            return nombre;
                        }
                    }
                }
            }
        }

        return "Docente Asignado";
    }
}