package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;
import java.time.LocalDate;
public record ExamenPublicoDto(Integer intId, Integer idAmbiente, LocalDate strFecha, String strNombre,
        String strDocente, String strAmbiente, String strHoraInicio, String strHoraFin) {}
