package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

/** Opciones para los formularios de la HU06 (así el frontend no las escribe a mano). */
public record CatalogosIncidenciaDto(
        List<OpcionCatalogoDto> tiposIncidencia,
        List<OpcionCatalogoDto> severidades,
        List<OpcionCatalogoDto> accionesIncidencia,
        List<OpcionCatalogoDto> estados,
        List<OpcionCatalogoDto> motivosExcepcion) {
}
