package bo.edu.umss.windsoft.control_ingreso_backend.dominio;
import java.time.LocalDate;
/** Documento de consulta independiente del proceso operativo de examenes. */
public record ExamenArchivado(long intId, String strNombre, String strPeriodo,
        LocalDate strFecha, String strObservaciones) {}
