package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HorarioRegular;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface HorarioRegularRepository extends JpaRepository<HorarioRegular, Integer> {

    @Query("SELECT h FROM HorarioRegular h WHERE h.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<HorarioRegular> findAll();
    @Query("SELECT h FROM HorarioRegular h WHERE h.idHorarioRegular=:id AND h.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    java.util.Optional<HorarioRegular> findById(@org.springframework.data.repository.query.Param("id") Integer id);
    // Para el paso 2 del flujo: mostrar horarios regulares del docente para esa asignatura
    @Query("SELECT h FROM HorarioRegular h WHERE h.idUsuario=:idUsuario AND h.codsisDocente=:codsisDocente AND h.idAsignatura=:idAsignatura AND h.estadoHorario=true AND h.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<HorarioRegular> findByIdUsuarioAndCodsisDocenteAndIdAsignaturaAndEstadoHorarioTrue(
            Integer idUsuario, Integer codsisDocente, Integer idAsignatura);

    // Para validar choque de aula: mismo día, misma aula, entre horarios activos
    @Query("SELECT h FROM HorarioRegular h WHERE h.idAula=:idAula AND h.diaSemana=:diaSemana AND h.estadoHorario=true AND h.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<HorarioRegular> findByIdAulaAndDiaSemanaAndEstadoHorarioTrue(
            Integer idAula, Short diaSemana);

    // Para validar que el docente no esté en dos aulas distintas al mismo tiempo
    @Query("SELECT h FROM HorarioRegular h WHERE h.idUsuario=:idUsuario AND h.codsisDocente=:codsisDocente AND h.diaSemana=:diaSemana AND h.estadoHorario=true AND h.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<HorarioRegular> findByIdUsuarioAndCodsisDocenteAndDiaSemanaAndEstadoHorarioTrue(
    Integer idUsuario, Integer codsisDocente, Short diaSemana);
    @Query("SELECT h FROM HorarioRegular h WHERE h.idAsignatura=:idAsignatura AND h.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL')")
    List<HorarioRegular> findByIdAsignatura(Integer idAsignatura);
}