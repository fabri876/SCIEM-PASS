// persistencia/DocenteAsignaturaRepository.java
package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignaturaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List; 

@Repository
public interface DocenteAsignaturaRepository extends JpaRepository<DocenteAsignatura, DocenteAsignaturaId> {
    List<DocenteAsignatura> findByIdIdusuarioAndIdCodsisdocente(Integer idusuario, Integer codsisdocente);
    // BUG-004 (QA): "codsisdocente" está duplicado en esta tabla intermedia y
    // desincronizado del valor real en la tabla "docente" para varios
    // docentes, así que filtrar por los dos campos a la vez perdía filas.
    // idusuario solo ya identifica al docente sin ambigüedad.
    List<DocenteAsignatura> findByIdIdusuario(Integer idusuario);
    List<DocenteAsignatura> findByIdIdasignatura(Integer idasignatura);
}