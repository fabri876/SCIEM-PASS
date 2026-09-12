package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ayudante;

@Repository
public interface AyudanteRepository extends JpaRepository<Ayudante, Integer> {

    Optional<Ayudante> findByIdayudante(Integer idayudante);

    Optional<Ayudante> findByUsuarioCiusuario(String ciusuario);
}
