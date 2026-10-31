package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ClasificacionAcademicaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
@Transactional(readOnly=true)
public class ClasificacionAcademicaService {
    private final ClasificacionAcademicaRepository repo;
    public ClasificacionAcademicaService(ClasificacionAcademicaRepository repo) {this.repo=repo;}
    public List<ClasificacionAcademicaRepository.Carrera> carreras(){return repo.carreras();}
    public List<ClasificacionAcademicaRepository.Nivel> niveles(Integer carrera){return repo.niveles(carrera);}
    public List<ClasificacionAcademicaRepository.Materia> materias(Integer carrera,Integer nivel){return repo.materias(carrera,nivel);}
    @Transactional public void vincular(Integer materia,Integer carrera,Integer nivel){
        if(materia==null||carrera==null||nivel==null||repo.niveles(carrera).stream().noneMatch(n->nivel.equals(n.idNivel())))
            throw new SolicitudInvalidaException("Seleccione una carrera y un nivel válido.");
        repo.vincular(materia,carrera,nivel);
    }
}
