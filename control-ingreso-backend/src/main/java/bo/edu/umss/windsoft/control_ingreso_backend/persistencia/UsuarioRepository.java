package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Optional<Usuario> findByCorreousuario(String correousuario);

    Optional<Usuario> findByCiusuario(String ciusuario);

    boolean existsByCorreousuario(String correousuario);

    boolean existsByCiusuario(String ciusuario);

    List<Usuario> findByEstadousuario(Boolean estadousuario);

    // El "rol" no vive en esta tabla (lo da la tabla hija en la que el usuario
    // tiene fila: admin/docente/ayudante/estudiante), así que ese filtro se
    // aplica en Java después de resolver el tipo de cada usuario (ver
    // UsuarioService.listar).
    //
    // "busqueda" se compara contra '' (no "IS NULL"): cuando Hibernate liga un
    // parámetro nulo dentro de un CONCAT(), el driver de Postgres no puede
    // inferirle un tipo y termina tratándolo como bytea, lo que rompe LOWER()
    // con "function lower(bytea) does not exist". UsuarioService.listar ya
    // convierte null a "" antes de llamar este método para evitarlo.
    @Query("SELECT u FROM Usuario u WHERE " +
           "(:estado IS NULL OR u.estadousuario = :estado) AND " +
           "(:busqueda = '' OR " +
           " LOWER(u.nombreusuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
           " LOWER(u.apellidousuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
           " u.ciusuario LIKE CONCAT('%', :busqueda, '%') OR " +
           " LOWER(u.correousuario) LIKE LOWER(CONCAT('%', :busqueda, '%'))) " +
           "ORDER BY u.idusuario ASC")
    List<Usuario> filtrarUsuarios(@Param("estado") Boolean estado,
                                  @Param("busqueda") String busqueda);

       @Query("SELECT u FROM Usuario u WHERE u.idusuario IN (SELECT a.idusuario FROM Admin a) " +
              "AND (:estado IS NULL OR u.estadousuario = :estado) AND " +
              "(:busqueda = '' OR " +
              " LOWER(u.nombreusuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " LOWER(u.apellidousuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " u.ciusuario LIKE CONCAT('%', :busqueda, '%') OR " +
              " LOWER(u.correousuario) LIKE LOWER(CONCAT('%', :busqueda, '%'))) " +
              "ORDER BY u.idusuario ASC")
       List<Usuario> filtrarUsuariosPorRolAdministrador(@Param("estado") Boolean estado,
                                                        @Param("busqueda") String busqueda);

       @Query("SELECT u FROM Usuario u WHERE u.idusuario IN (SELECT d.idusuario FROM Docente d) " +
              "AND (:estado IS NULL OR u.estadousuario = :estado) AND " +
              "(:busqueda = '' OR " +
              " LOWER(u.nombreusuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " LOWER(u.apellidousuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " u.ciusuario LIKE CONCAT('%', :busqueda, '%') OR " +
              " LOWER(u.correousuario) LIKE LOWER(CONCAT('%', :busqueda, '%'))) " +
              "ORDER BY u.idusuario ASC")
       List<Usuario> filtrarUsuariosPorRolDocente(@Param("estado") Boolean estado,
                                                 @Param("busqueda") String busqueda);

       @Query("SELECT u FROM Usuario u WHERE u.idusuario IN (SELECT ay.idusuario FROM Ayudante ay) " +
              "AND (:estado IS NULL OR u.estadousuario = :estado) AND " +
              "(:busqueda = '' OR " +
              " LOWER(u.nombreusuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " LOWER(u.apellidousuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " u.ciusuario LIKE CONCAT('%', :busqueda, '%') OR " +
              " LOWER(u.correousuario) LIKE LOWER(CONCAT('%', :busqueda, '%'))) " +
              "ORDER BY u.idusuario ASC")
       List<Usuario> filtrarUsuariosPorRolOperador(@Param("estado") Boolean estado,
                                                 @Param("busqueda") String busqueda);

       @Query("SELECT u FROM Usuario u WHERE u.idusuario IN (SELECT e.idusuario FROM Estudiante e) " +
              "AND (:estado IS NULL OR u.estadousuario = :estado) AND " +
              "(:busqueda = '' OR " +
              " LOWER(u.nombreusuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " LOWER(u.apellidousuario) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR " +
              " u.ciusuario LIKE CONCAT('%', :busqueda, '%') OR " +
              " LOWER(u.correousuario) LIKE LOWER(CONCAT('%', :busqueda, '%'))) " +
              "ORDER BY u.idusuario ASC")
       List<Usuario> filtrarUsuariosPorRolEstudiante(@Param("estado") Boolean estado,
                                                 @Param("busqueda") String busqueda);
}
