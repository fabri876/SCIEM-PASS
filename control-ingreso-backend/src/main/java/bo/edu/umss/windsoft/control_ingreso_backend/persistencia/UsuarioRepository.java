package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Optional<Usuario> findByCorreousuario(String correousuario);

    Optional<Usuario> findByCiusuario(String ciusuario);

    boolean existsByCorreousuario(String correousuario);

    boolean existsByCiusuario(String ciusuario);
}
