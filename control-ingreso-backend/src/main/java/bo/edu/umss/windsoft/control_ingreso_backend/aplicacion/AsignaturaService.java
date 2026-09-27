// aplicacion/AsignaturaService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignaturaResponseDto;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AsignaturaService {

    private final DocenteAsignaturaRepository docenteAsignaturaRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ExamenRepository examenRepository;
    private final HabilitacionRepository habilitacionRepository;

    public AsignaturaService(
            DocenteAsignaturaRepository docenteAsignaturaRepository,
            AsignaturaRepository asignaturaRepository,
            UsuarioRepository usuarioRepository,
            ExamenRepository examenRepository,
            HabilitacionRepository habilitacionRepository) {
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.usuarioRepository = usuarioRepository;
        this.examenRepository = examenRepository;
        this.habilitacionRepository = habilitacionRepository;
    }

    public List<AsignaturaResponseDto> obtenerPorDocente(Integer idUsuario, Integer codsisDocente) {
        List<Integer> ids = docenteAsignaturaRepository
                .findByIdIdusuarioAndIdCodsisdocente(idUsuario, codsisDocente)
                .stream()
                .map(da -> da.getId().getIdasignatura())
                .toList();

        List<Asignatura> asignaturas = asignaturaRepository.findAllById(ids);
        return mapToDtosBatch(asignaturas);
    }

    public List<AsignaturaResponseDto> obtenerTodas() {
        List<Asignatura> asignaturas = asignaturaRepository.findAll();
        return mapToDtosBatch(asignaturas);
    }

    private List<AsignaturaResponseDto> mapToDtosBatch(List<Asignatura> asignaturas) {
        if (asignaturas == null || asignaturas.isEmpty()) {
            return Collections.emptyList();
        }

        // 1. Obtener conteos masivos en 1 sola consulta SQL
        Map<Integer, int[]> conteosMap = new HashMap<>();
        List<Object[]> counts = habilitacionRepository.countHabilitacionesGroupedByAsignatura();
        for (Object[] row : counts) {
            Integer idAsig = (Integer) row[0];
            Boolean estado = (Boolean) row[1];
            long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            if (idAsig != null) {
                int[] arr = conteosMap.computeIfAbsent(idAsig, k -> new int[2]);
                if (Boolean.TRUE.equals(estado)) {
                    arr[0] += (int) count;
                } else {
                    arr[1] += (int) count;
                }
            }
        }

        // 2. Pre-cargar nombres de docentes masivamente
        Map<Integer, String> docentesMap = resolverNombresDocentesBatch();

        // 3. Mapear asignaturas a DTOs
        return asignaturas.stream().map(asig -> {
            Integer idAsig = asig.getIdAsignatura();
            int[] countsArr = conteosMap.getOrDefault(idAsig, new int[]{0, 0});
            int hab = countsArr[0];
            int inhab = countsArr[1];
            int total = hab + inhab;
            String docente = docentesMap.getOrDefault(idAsig, "Docente Asignado");

            return new AsignaturaResponseDto(
                    asig.getIdAsignatura(),
                    asig.getIdInscripcion(),
                    asig.getNombreAsignatura(),
                    asig.getSiglaAsignatura(),
                    docente,
                    total,
                    hab,
                    inhab
            );
        }).collect(Collectors.toList());
    }

    private Map<Integer, String> resolverNombresDocentesBatch() {
        Map<Integer, String> resultado = new HashMap<>();

        // Cargar docentes asignados
        List<DocenteAsignatura> todasAsigDocentes = docenteAsignaturaRepository.findAll();
        Set<Integer> userIds = todasAsigDocentes.stream()
                .map(da -> da.getId().getIdusuario())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // Cargar exámenes para fallback
        List<Examen> todosExamenes = examenRepository.findAll();
        for (Examen ex : todosExamenes) {
            if (ex.getIdUsuario() != null) {
                userIds.add(ex.getIdUsuario());
            }
        }

        // Cargar usuarios en 1 sola consulta
        Map<Integer, Usuario> usuariosMap = userIds.isEmpty() ? Collections.emptyMap() :
                usuarioRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(Usuario::getIdusuario, u -> u, (u1, u2) -> u1));

        // Mapear docentes directos
        Map<Integer, List<String>> asignaciones = new HashMap<>();
        for (DocenteAsignatura da : todasAsigDocentes) {
            Integer idAsig = da.getId().getIdasignatura();
            Integer idUser = da.getId().getIdusuario();
            Usuario u = usuariosMap.get(idUser);
            if (u != null) {
                String nombre = ((u.getNombreusuario() != null ? u.getNombreusuario() : "") + " " + (u.getApellidousuario() != null ? u.getApellidousuario() : "")).trim();
                if (!nombre.isEmpty()) {
                    asignaciones.computeIfAbsent(idAsig, k -> new ArrayList<>()).add(nombre);
                }
            }
        }

        for (Map.Entry<Integer, List<String>> entry : asignaciones.entrySet()) {
            List<String> nombresUnicos = entry.getValue().stream().distinct().toList();
            if (!nombresUnicos.isEmpty()) {
                resultado.put(entry.getKey(), String.join(", ", nombresUnicos));
            }
        }

        // Fallback desde exámenes
        for (Examen ex : todosExamenes) {
            if (ex.getIdAsignatura() != null && !resultado.containsKey(ex.getIdAsignatura()) && ex.getIdUsuario() != null) {
                Usuario u = usuariosMap.get(ex.getIdUsuario());
                if (u != null) {
                    String nombre = ((u.getNombreusuario() != null ? u.getNombreusuario() : "") + " " + (u.getApellidousuario() != null ? u.getApellidousuario() : "")).trim();
                    if (!nombre.isEmpty()) {
                        resultado.put(ex.getIdAsignatura(), nombre);
                    }
                }
            }
        }

        return resultado;
    }
}