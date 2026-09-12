package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;

@Repository
public interface ExamenRepository extends JpaRepository<Examen, Long> {

    List<Examen> findByDocenteIdusuario(Integer idUsuarioDocente);

    List<Examen> findByEstado(String estado);
}
