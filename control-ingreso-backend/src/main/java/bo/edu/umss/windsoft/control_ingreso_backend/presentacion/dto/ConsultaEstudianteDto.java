package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

/**
 * Resultado de buscar a un estudiante en un aula/examen.
 *
 * estado: HABILITADO | INHABILITADO | NO_EN_LISTA | NO_INSCRITO | SIN_INGRESO | NO_ENCONTRADO | DUPLICADO | RETIRADO
 * Los "puede..." ya vienen calculados según el rol y el estado, para que el
 * frontend solo muestre/oculte botones.
 */
public record ConsultaEstudianteDto(
        String estado,
        String mensaje,
        Integer codSis,
        String ci,
        String nombreCompleto,
        LocalDateTime horaIngresoPrevio,
        String aulaIngresoPrevio,
        boolean puedeAutorizarExcepcional,
        boolean puedeRegistrarIncidencia,
        boolean puedeRetirar,
        AforoDto aforo,
        boolean ingresoCerrado) {
}
