// persistencia/HorarioRegularRepository.java
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

    List<HorarioRegular> findByIdAsignatura(Integer idAsignatura);
}