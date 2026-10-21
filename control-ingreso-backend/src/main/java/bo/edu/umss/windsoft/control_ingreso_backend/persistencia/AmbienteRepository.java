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
    @Query("SELECT a FROM Ambiente a WHERE a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<Ambiente> findAll();
    @Query("SELECT a FROM Ambiente a WHERE a.idAmbiente=:id AND a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    java.util.Optional<Ambiente> findById(@Param("id") Integer id);
    @Query("SELECT a FROM Ambiente a WHERE a.idAmbiente IN :ids AND a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<Ambiente> findAllById(@Param("ids") Iterable<Integer> ids);


    @Query("SELECT a FROM Ambiente a WHERE a.idExamen = :idExamen AND a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<Ambiente> findByIdExamen(Integer idExamen);

    @Query("SELECT a FROM Ambiente a WHERE a.idAula = :idAula " +
           "AND a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.fechaExamen = :fecha AND e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    
    List<Ambiente> findByIdAulaYFecha(@Param("idAula") Integer idAula, @Param("fecha") LocalDate fecha);
    
    @Query("SELECT a FROM Ambiente a WHERE a.idExamen IN :idsExamen AND a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<Ambiente> findByIdExamenIn(List<Integer> idsExamen);

    @Query("SELECT a FROM Ambiente a WHERE a.idAsignatura = :idAsignatura AND a.idExamen IN (SELECT e.idExamen FROM Examen e WHERE e.idSemestre=(SELECT s.id FROM Semestre s WHERE s.estado='ACTUAL'))")
    List<Ambiente> findByIdAsignatura(Integer idAsignatura);
}