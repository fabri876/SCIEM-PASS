// aplicacion/AulaService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AulaOcupadaDTO;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AulaService {

    private final AulaRepository aulaRepository;
    private final AmbienteRepository ambienteRepository;

    public AulaService(AulaRepository aulaRepository, AmbienteRepository ambienteRepository) {
        this.aulaRepository = aulaRepository;
        this.ambienteRepository = ambienteRepository;
    }

    public List<Aula> obtenerAulasActivas() {
        return aulaRepository.findByEstadoAulaTrue();
    }

    public List<AulaOcupadaDTO> obtenerAulasOcupadas(LocalDate fecha, LocalTime horaInicio,
            LocalTime horaFin, Integer idExamenExcluir) {
        if (fecha == null || horaInicio == null || horaFin == null || !horaInicio.isBefore(horaFin)) {
            return Collections.emptyList();
        }

        List<Ambiente> ambientes = ambienteRepository.findByFechaSemestreActual(fecha).stream()
                .filter(a -> idExamenExcluir == null || !idExamenExcluir.equals(a.getIdExamen()))
                .filter(a -> horaInicio.isBefore(a.getHoraFin()) && horaFin.isAfter(a.getHoraInicio()))
                .toList();
        Set<Integer> idsAula = ambientes.stream().map(Ambiente::getIdAula).collect(Collectors.toSet());
        if (idsAula.isEmpty()) return Collections.emptyList();
        Map<Integer, Aula> aulas = aulaRepository.findAllById(idsAula).stream()
                .collect(Collectors.toMap(Aula::getIdAula, Function.identity()));
        return ambientes.stream()
                .filter(a -> aulas.containsKey(a.getIdAula()))
                .collect(Collectors.toMap(Ambiente::getIdAula, a -> new AulaOcupadaDTO(
                        a.getIdAula(), aulas.get(a.getIdAula()).getNombreAula(),
                        a.getHoraInicio(), a.getHoraFin()), (primera, segunda) -> primera))
                .values().stream().toList();
    }
}
