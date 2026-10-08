package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Docente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

import java.util.Optional;

@Repository
public interface DocenteRepository extends JpaRepository<Docente, Integer> {
    @org.springframework.data.jpa.repository.Query("SELECT d.codsisdocente FROM Docente d WHERE d.codsisdocente IN :valores")
    List<Integer> buscarCodigosExistentes(@org.springframework.data.repository.query.Param("valores") List<Integer> valores);

    boolean existsByIdusuario(Integer idusuario);

    Optional<Docente> findByIdusuario(Integer idusuario);

    List<Docente> findByIdusuarioIn(List<Integer> idsUsuario);

    Optional<Docente> findByCodsisdocente(Integer codsisdocente);
    List<Docente> findByIdusuarioIn(Collection<Integer> ids);
}
