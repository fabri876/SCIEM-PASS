package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/** Rango de un operador dentro del mismo examen y ambiente. */
public record FilaDelegadoExamenDTO(
        String letraDesde,
        String letraHasta,
        String nombreOperador,
        int ingresaron,
        int total,
        boolean esMia
) {}
