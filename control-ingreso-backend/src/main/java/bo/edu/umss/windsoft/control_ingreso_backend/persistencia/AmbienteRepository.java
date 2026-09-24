package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AmbienteRepository extends JpaRepository<Ambiente, Integer> {

    List<Ambiente> findByIdExamen(Integer idExamen);

    @Query("SELECT a FROM Ambiente a WHERE a.idAula = :idAula " +
           "AND a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.fechaExamen = :fecha)")
    List<Ambiente> findByIdAulaYFecha(@Param("idAula") Integer idAula, @Param("fecha") LocalDate fecha);
}