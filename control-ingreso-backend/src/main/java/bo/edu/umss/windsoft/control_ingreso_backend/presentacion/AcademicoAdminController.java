package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CatalogoAcademicoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HorarioImportacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HorarioImportacionDto.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/academico")
public class AcademicoAdminController {
    private final CatalogoAcademicoService catalogo;
    private final HorarioImportacionService importador;
    public AcademicoAdminController(CatalogoAcademicoService catalogo, HorarioImportacionService importador) {
        this.catalogo = catalogo; this.importador = importador;
    }
    public record AsignaturaRequest(Integer codigo, String nombre, String sigla,Integer idCarrera,Integer idNivel) {
        public AsignaturaRequest(Integer codigo,String nombre,String sigla){this(codigo,nombre,sigla,null,null);}
    }
    @PostMapping("/asignaturas")
    public Asignatura crear(@RequestBody AsignaturaRequest datos) {
        return catalogo.crear(datos.codigo(), datos.nombre(), datos.sigla(),datos.idCarrera(),datos.idNivel());
    }
    @PostMapping("/horario/vista-previa")
    public VistaPrevia preview(@RequestParam("archivo") MultipartFile archivo) { return importador.previsualizar(archivo); }
    @PostMapping("/horario/confirmar")
    public Resultado confirmar(@RequestParam("archivo") MultipartFile archivo) {
        return importador.confirmarAutomaticamente(archivo);
    }
}
