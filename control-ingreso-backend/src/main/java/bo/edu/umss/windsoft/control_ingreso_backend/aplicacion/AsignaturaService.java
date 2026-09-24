// aplicacion/AsignaturaService.java
package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AsignaturaService {

    private final DocenteAsignaturaRepository docenteAsignaturaRepository;
    private final AsignaturaRepository asignaturaRepository;

    public AsignaturaService(
            DocenteAsignaturaRepository docenteAsignaturaRepository,
            AsignaturaRepository asignaturaRepository) {
        this.docenteAsignaturaRepository = docenteAsignaturaRepository;
        this.asignaturaRepository = asignaturaRepository;
    }

    public List<Asignatura> obtenerPorDocente(Integer idUsuario, Integer codsisDocente) {
        List<Integer> ids = docenteAsignaturaRepository
                .findByIdIdusuarioAndIdCodsisdocente(idUsuario, codsisDocente)
                .stream()
                .map(da -> da.getId().getIdasignatura())
                .toList();

        return asignaturaRepository.findAllById(ids);
    }

    public List<Asignatura> obtenerTodas() {
        return asignaturaRepository.findAll();
    }
}