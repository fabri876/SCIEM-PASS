package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HorarioRegular;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HorarioRegularRepository extends JpaRepository<HorarioRegular, Integer> {

    // Para el paso 2 del flujo: mostrar horarios regulares del docente para esa asignatura
    List<HorarioRegular> findByIdUsuarioAndCodsisDocenteAndIdAsignaturaAndEstadoHorarioTrue(
            Integer idUsuario, Integer codsisDocente, Integer idAsignatura);

    // Para validar choque de aula: mismo día, misma aula, entre horarios activos
    List<HorarioRegular> findByIdAulaAndDiaSemanaAndEstadoHorarioTrue(
            Integer idAula, Short diaSemana);

    // Para validar que el docente no esté en dos aulas distintas al mismo tiempo
    List<HorarioRegular> findByIdUsuarioAndCodsisDocenteAndDiaSemanaAndEstadoHorarioTrue(
    Integer idUsuario, Integer codsisDocente, Short diaSemana);
    List<HorarioRegular> findByIdAsignatura(Integer idAsignatura);
}