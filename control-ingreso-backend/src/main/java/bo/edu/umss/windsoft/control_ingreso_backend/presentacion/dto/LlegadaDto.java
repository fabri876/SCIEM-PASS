package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/** Un punto de la curva de llegada: ingresos entre hora y hora + intervalo. */
public record LlegadaDto(String hora, long cantidad) {
}
