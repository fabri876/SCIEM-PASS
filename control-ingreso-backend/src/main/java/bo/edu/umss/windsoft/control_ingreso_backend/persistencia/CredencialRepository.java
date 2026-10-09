package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Credencial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CredencialRepository extends JpaRepository<Credencial, Integer> {

    // Busca por token (columna renombrada de codigoqr a token) y estado (ACTIVO, ANULADO)
    Optional<Credencial> findByTokenAndEstado(String token, String estado);

    // Verifica si ya existe una credencial para un usuario y examen específico (para no duplicar)
    Optional<Credencial> findByIdUsuarioAndIdExamen(Integer idUsuario, Integer idExamen);
}
