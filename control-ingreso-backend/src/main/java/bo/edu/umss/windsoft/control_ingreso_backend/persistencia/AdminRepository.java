package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Integer> {

    boolean existsByIdusuario(Integer idusuario);

    Optional<Admin> findByIdusuario(Integer idusuario);
    List<Admin> findByIdusuarioIn(Collection<Integer> ids);
}
