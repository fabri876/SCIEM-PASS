package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IntentoNoAutorizadoRepository extends JpaRepository<IntentoNoAutorizado, Integer> {

    long countByIdAsignaturaAndIdExamenAndMotivo(Integer idAsignatura, Integer idExamen, MotivoIntento motivo);

    List<IntentoNoAutorizado> findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(Integer idAsignatura,
                                                                                          Integer idExamen,
                                                                                          MotivoIntento motivo);

    List<IntentoNoAutorizado> findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByHoraIntentoDesc(
            Integer idAsignatura, Integer idExamen, Integer idAmbiente);
    List<IntentoNoAutorizado> findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteAndIdUsuarioRegistraOrderByHoraIntentoDesc(
            Integer idAsignatura, Integer idExamen, Integer idAmbiente, Integer idUsuarioRegistra);
}
