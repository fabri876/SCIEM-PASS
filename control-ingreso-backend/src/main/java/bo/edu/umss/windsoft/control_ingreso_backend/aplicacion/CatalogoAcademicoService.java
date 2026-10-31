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
    private ClasificacionAcademicaService clasificacion;
    @org.springframework.beans.factory.annotation.Autowired
    public CatalogoAcademicoService(AsignaturaRepository asignaturas,ClasificacionAcademicaService clasificacion) {this(asignaturas);this.clasificacion=clasificacion;}
    public CatalogoAcademicoService(AsignaturaRepository asignaturas) { this.asignaturas = asignaturas; }
    @Transactional
    public Asignatura crear(Integer codigo,String nombre,String sigla,Integer carrera,Integer nivel) {
        if(carrera==null||nivel==null) throw new SolicitudInvalidaException("Seleccione carrera y nivel para la nueva asignatura.");
        var nueva=crear(codigo,nombre,sigla);
        asignaturas.flush();
        clasificacion.vincular(nueva.getIdAsignatura(),carrera,nivel);
        return nueva;
    }
    @Transactional
    public Asignatura crear(Integer codigo, String nombre, String sigla) {
        if (codigo == null || codigo < 1 || nombre == null || nombre.isBlank() || nombre.trim().length() > 255
                || (sigla != null && sigla.trim().length() > 50)) {
            throw new SolicitudInvalidaException("Indique el código oficial y el nombre de la asignatura (hasta 255 caracteres); la sigla admite hasta 50.");
        }
        if (asignaturas.findByCodigoOficial(String.valueOf(codigo)).isPresent() || asignaturas.existsById(codigo)) throw new RecursoDuplicadoException("Ese código de asignatura ya existe.");
        Asignatura nueva = new Asignatura(); nueva.setIdAsignatura(codigo); nueva.setNombreAsignatura(nombre.trim());
        nueva.setSiglaAsignatura(sigla == null || sigla.isBlank() ? null : sigla.trim());
        nueva.setCodigoOficial(String.valueOf(codigo));
        return asignaturas.save(nueva);
    }
}
