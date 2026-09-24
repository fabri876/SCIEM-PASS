package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaEspecifica;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.NormaEspecificaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NormaEspecificaService {

    private final NormaEspecificaRepository normaEspecificaRepository;

    public NormaEspecificaService(NormaEspecificaRepository normaEspecificaRepository) {
        this.normaEspecificaRepository = normaEspecificaRepository;
    }

    public List<NormaEspecifica> listarTodas(Integer idAsignatura, Integer idExamen) {
        if (idAsignatura != null && idExamen != null) {
            return normaEspecificaRepository.findByIdAsignaturaAndIdExamen(idAsignatura, idExamen);
        }
        if (idAsignatura != null) {
            return normaEspecificaRepository.findByIdAsignatura(idAsignatura);
        }
        if (idExamen != null) {
            return normaEspecificaRepository.findByIdExamen(idExamen);
        }
        return normaEspecificaRepository.findAll();
    }
}