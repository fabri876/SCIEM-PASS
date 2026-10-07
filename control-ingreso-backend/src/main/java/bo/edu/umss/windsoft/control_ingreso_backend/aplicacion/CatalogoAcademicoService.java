package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogoAcademicoService {
    private final AsignaturaRepository asignaturas;
    public CatalogoAcademicoService(AsignaturaRepository asignaturas) { this.asignaturas = asignaturas; }
    @Transactional
    public Asignatura crear(Integer codigo, String nombre, String sigla) {
        if (codigo == null || codigo < 1 || nombre == null || nombre.isBlank() || nombre.trim().length() > 255
                || (sigla != null && sigla.trim().length() > 50)) {
            throw new SolicitudInvalidaException("Indique el código oficial y el nombre de la asignatura (hasta 255 caracteres); la sigla admite hasta 50.");
        }
        if (asignaturas.existsById(codigo)) throw new RecursoDuplicadoException("Ese código de asignatura ya existe.");
        Asignatura nueva = new Asignatura(); nueva.setIdAsignatura(codigo); nueva.setNombreAsignatura(nombre.trim());
        nueva.setSiglaAsignatura(sigla == null || sigla.isBlank() ? null : sigla.trim());
        nueva.setCodigoOficial(String.valueOf(codigo));
        return asignaturas.save(nueva);
    }
}
