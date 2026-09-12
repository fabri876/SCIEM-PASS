package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Admin;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Integer> {

    Optional<Admin> findByIdadmin(Integer idadmin);

    Optional<Admin> findByUsuarioCiusuario(String ciusuario);
}
