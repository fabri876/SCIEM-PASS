// aplicacion/HorarioRegularService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.HorarioRegularRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignaturaId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HorarioRegular;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HorarioRegularRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HorarioRegularService {

    private final HorarioRegularRepository horarioRegularRepository;
    private final DocenteAsignaturaRepository docenteAsignaturaRepository;
    private final AulaRepository aulaRepository;

    public HorarioRegularService(
            HorarioRegularRepository horarioRegularRepository,
            DocenteAsignaturaRepository docenteAsignaturaRepository,
            AulaRepository aulaRepository) {
        this.horarioRegularRepository = horarioRegularRepository;
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.aulaRepository = aulaRepository;
    }

    @Transactional
    public HorarioRegular crear(HorarioRegularRequest request) {
        validar(request);

        HorarioRegular hr = new HorarioRegular();
        hr.setIdUsuario(request.getIdUsuario());
        hr.setCodsisDocente(request.getCodsisDocente());
        hr.setIdAsignatura(request.getIdAsignatura());
        hr.setIdAula(request.getIdAula());
        hr.setDiaSemana(request.getDiaSemana());
        hr.setHoraInicio(request.getHoraInicio());
        hr.setHoraFin(request.getHoraFin());
        hr.setEstadoHorario(true);

        return horarioRegularRepository.save(hr);
    }

    @Transactional
    public HorarioRegular actualizar(Integer id, HorarioRegularRequest request) {
        HorarioRegular hr = horarioRegularRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Horario regular no encontrado."));

        boolean esDueño =
                hr.getIdUsuario().equals(request.getIdUsuario())
                && hr.getCodsisDocente().equals(request.getCodsisDocente())
                && hr.getIdAsignatura().equals(request.getIdAsignatura());

        if (!esDueño) {
            throw new IllegalArgumentException("No puede modificar un horario que no le pertenece.");
        }

        validar(request);

        hr.setIdAula(request.getIdAula());
        hr.setDiaSemana(request.getDiaSemana());
        hr.setHoraInicio(request.getHoraInicio());
        hr.setHoraFin(request.getHoraFin());

        return horarioRegularRepository.save(hr);
    }

    // Desactivación lógica (no borra la fila): así no se pierde el vínculo
    // histórico con exámenes ya creados que usaron este horario.
    @Transactional
    public void desactivar(Integer id) {
        HorarioRegular hr = horarioRegularRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Horario regular no encontrado."));
        hr.setEstadoHorario(false);
        horarioRegularRepository.save(hr);
    }

    public List<HorarioRegular> listar(Integer idUsuario, Integer codsisDocente, Integer idAsignatura) {
        return horarioRegularRepository
                .findByIdUsuarioAndCodsisDocenteAndIdAsignaturaAndEstadoHorarioTrue(
                        idUsuario, codsisDocente, idAsignatura);
    }

    private void validar(HorarioRegularRequest request) {
        DocenteAsignaturaId daId = new DocenteAsignaturaId(
                request.getIdUsuario(), request.getCodsisDocente(), request.getIdAsignatura());

        docenteAsignaturaRepository.findById(daId)
                .orElseThrow(() -> new IllegalArgumentException("El docente no dicta esa asignatura."));

        aulaRepository.findById(request.getIdAula())
                .orElseThrow(() -> new IllegalArgumentException("Aula no encontrada."));

        if (!request.getHoraFin().isAfter(request.getHoraInicio())) {
            throw new IllegalArgumentException("La hora de fin debe ser posterior a la hora de inicio.");
        }
    }
}