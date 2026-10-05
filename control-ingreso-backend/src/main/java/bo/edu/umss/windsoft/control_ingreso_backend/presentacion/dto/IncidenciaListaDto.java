package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

/** Lista filtrada + totales por estado (los totales son del mismo filtro, sin el filtro de estado). */
public record IncidenciaListaDto(TotalesIncidenciasDto totales, List<IncidenciaResumenDto> incidencias) {
}
