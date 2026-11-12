package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CarreraEstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CarreraEstudianteService {
    private final CarreraEstudianteRepository repository;
    public CarreraEstudianteService(CarreraEstudianteRepository repository) { this.repository = repository; }

    @Transactional
    public void vincular(Integer usuario, Integer carrera) {
        if (!repository.existeEstudiante(usuario))
            throw new RecursoNoEncontradoException("El estudiante no existe.");
        if (!repository.existeCarrera(carrera))
            throw new RecursoNoEncontradoException("La carrera no existe en el catálogo.");
        repository.vincular(usuario, carrera);
    }
}
