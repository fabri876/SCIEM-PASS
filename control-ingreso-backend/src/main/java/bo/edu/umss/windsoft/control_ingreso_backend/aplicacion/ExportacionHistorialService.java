package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HistorialInmodificableBloqueDto;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class ExportacionHistorialService {
    private final HistorialInmodificableService historial;
    private final AuditoriaService auditoria;

    public ExportacionHistorialService(HistorialInmodificableService historial, AuditoriaService auditoria) {
        this.historial = historial;
        this.auditoria = auditoria;
    }

    /** La lectura consistente termina antes de iniciar la transaccion que registra la exportacion.
     * Si falla la generacion o el registro, no se devuelve un archivo como exitoso. */
    public byte[] generar(String modulo, String ejecutor, String fecha, String fechaInicio, String fechaFin,
                          String busqueda, String responsable, String ip) {
        List<HistorialInmodificableBloqueDto> registros = historial.listarHistorialInmodificable(
                modulo, ejecutor, fecha, fechaInicio, fechaFin, busqueda);
        StringBuilder csv = new StringBuilder("\uFEFFID_BLOQUE;FECHA_HORA_OFICIAL;MODULO;OPERACION_EJECUTADA;USUARIO_EJECUTOR;IP_ORIGEN;SELLO_SHA256;HASH_BLOQUE_ANTERIOR;DETALLES\r\n");
        for (var b : registros) {
            csv.append(escaparCsv(b.getIdBloque())).append(';').append(escaparCsv(b.getFechaHoraOficial())).append(';')
                    .append(escaparCsv(b.getModulo())).append(';').append(escaparCsv(b.getOperacionEjecutada())).append(';')
                    .append(escaparCsv(b.getUsuarioEjecutor())).append(';').append(escaparCsv(b.getIpOrigen())).append(';')
                    .append(escaparCsv(b.getSelloSha256())).append(';').append(escaparCsv(b.getHashBloqueAnterior())).append(';')
                    .append(escaparCsv(b.getDetalles())).append("\r\n");
        }
        byte[] resultado = csv.toString().getBytes(StandardCharsets.UTF_8);
        String detalle = "filtros: modulo=" + campo(modulo) + "; ejecutor=" + campo(ejecutor) + "; fecha=" + campo(fecha)
                + "; desde=" + campo(fechaInicio) + "; hasta=" + campo(fechaFin) + "; busqueda=" + campo(busqueda)
                + "; registros=" + registros.size();
        auditoria.registrarCompletoEnTransaccion("EXPORTACION_HISTORIAL_CSV", responsable, responsable, detalle, ip);
        return resultado;
    }

    private static String campo(String valor) {
        if (valor == null || valor.isBlank()) return "(todos)";
        return valor.replace("\\", "\\\\").replace(";", "\\;").replace("|", "\\|")
                .replace("\r", "\\r").replace("\n", "\\n");
    }

    private static String escaparCsv(Object valor) {
        if (valor == null) return "\"\"";
        String s = String.valueOf(valor);
        if (s.stripLeading().matches("^[=+@\\-\\t\\r].*")) s = "'" + s;
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
