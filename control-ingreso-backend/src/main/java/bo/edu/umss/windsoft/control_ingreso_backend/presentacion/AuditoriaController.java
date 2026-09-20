package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuditoriaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AuditoriaRespuestaDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/auditoria")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @GetMapping
    public ResponseEntity<List<AuditoriaRespuestaDto>> listar() {
        List<AuditoriaRespuestaDto> respuesta = auditoriaService.listar().stream()
                .map(this::mapear)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    // La tabla nueva "historialauditoria" guarda todo junto en el campo "accion"
    // (ver AuditoriaService), así que acá se separa de vuelta para no tener que
    // cambiar el contrato de la API que ya consume el frontend.
    private AuditoriaRespuestaDto mapear(Auditoria auditoria) {
        String accion = auditoria.getAccion() == null ? "" : auditoria.getAccion();

        String tipoOperacion = extraerEntreCorchetes(accion);
        String[] partes = accion.split(" \\| ", 4);
        String ejecutor = partes.length > 0 ? extraerValor(partes[0], "ejecutor=") : null;
        String afectado = partes.length > 1 ? extraerValor(partes[1], "afectado=") : null;
        String ip = partes.length > 2 ? extraerValor(partes[2], "ip=") : null;
        String detalles = partes.length > 3 ? partes[3] : null;

        return new AuditoriaRespuestaDto(auditoria.getIdAuditoria(), tipoOperacion, ejecutor, afectado, detalles,
                ip, auditoria.getFechaAccion());
    }

    private String extraerEntreCorchetes(String texto) {
        int inicio = texto.indexOf('[');
        int fin = texto.indexOf(']');
        if (inicio < 0 || fin < 0 || fin <= inicio) {
            return texto;
        }
        return texto.substring(inicio + 1, fin);
    }

    private String extraerValor(String segmento, String prefijo) {
        int idx = segmento.indexOf(prefijo);
        if (idx < 0) {
            return null;
        }
        String valor = segmento.substring(idx + prefijo.length()).trim();
        return "-".equals(valor) ? null : valor;
    }
}
