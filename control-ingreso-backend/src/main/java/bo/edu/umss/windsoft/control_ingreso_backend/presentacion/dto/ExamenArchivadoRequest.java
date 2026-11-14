package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;
import jakarta.validation.constraints.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
public record ExamenArchivadoRequest(
        @NotBlank(message="El título es obligatorio.") @Size(max=200,message="El título admite hasta 200 caracteres.") String strNombre,
        @NotBlank(message="La gestión es obligatoria.") @Pattern(regexp="[12]-[12][0-9]{3}",message="Indique la gestión con formato 1-2026 o 2-2026.") String strPeriodo,
        @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate strFecha,
        @Size(max=500, message="Las observaciones no pueden superar 500 caracteres.") String strObservaciones) {}
