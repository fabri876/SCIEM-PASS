package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;

@Repository
public interface AyudanteRepository extends JpaRepository<Ayudante, Integer> {

    boolean existsByIdusuario(Integer idusuario);

    Optional<Ayudante> findByIdusuario(Integer idusuario);

    List<Ayudante> findByIdusuarioIn(Collection<Integer> ids);
}
