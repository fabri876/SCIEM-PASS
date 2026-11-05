package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;
import jakarta.validation.constraints.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
public record ExamenArchivadoRequest(
        @NotBlank @Size(max=200) String strNombre,
        @NotBlank @Pattern(regexp="[12]-[12][0-9]{3}") String strPeriodo,
        @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate strFecha,
        @Size(max=2000) String strObservaciones) {}
