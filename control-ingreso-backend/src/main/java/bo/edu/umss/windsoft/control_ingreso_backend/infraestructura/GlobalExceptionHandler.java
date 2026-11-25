package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CredencialesInvalidasException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaBloqueadaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.CuentaInactivaException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoDuplicadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ReintentarSincronizacionException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ErrorResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // --- Excepciones del flujo de auto-registro genérico (RegistroUsuarioService) ---
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleIntegridad(org.springframework.dao.DataIntegrityViolationException ex) {
        Throwable causa = NestedExceptionUtils.getMostSpecificCause(ex);
        String detalleOriginal = String.valueOf(causa.getMessage());
        String detalle = detalleOriginal.toLowerCase();
        logger.error("Violacion de integridad de base de datos: {}", detalleOriginal, ex);
        if (detalle.contains("face_enrollment") && detalle.contains("estado")) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("mensaje",
                    "La base de datos aun no permite el estado pendiente_reenrolamiento. "
                            + "Ejecute la migracion HU22 de enrolamiento facial y vuelva a intentar."));
        }
        if (detalle.contains("limpieza_foto_biometrica")) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("mensaje",
                    "No se pudo programar la limpieza de la foto anterior. Revise la cola limpieza_foto_biometrica."));
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("mensaje",
                "No se pudo guardar: existe un registro duplicado o una relación inválida. Actualice los datos y vuelva a intentar."));
    }

    // Nota: bo.edu.umss...infraestructura.RecursoDuplicadoException es una clase distinta
    // de bo.edu.umss...dominio.exception.RecursoDuplicadoException (mismo nombre simple,
    // paquete distinto), por eso se referencia con el nombre completo aquí abajo.

    @ExceptionHandler(bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.RecursoDuplicadoException.class)
    public ResponseEntity<Map<String, String>> handleRecursoDuplicadoRegistro(
            bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.RecursoDuplicadoException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("mensaje", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(ValidacionNegocioException.class)
    public ResponseEntity<Map<String, String>> handleValidacionNegocio(ValidacionNegocioException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("mensaje", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("mensaje", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // --- Excepciones del módulo de administración de usuarios/roles/auditoría (HU16) ---

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(RecursoNoEncontradoException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorDto);
    }

    @ExceptionHandler(RecursoDuplicadoException.class)
    public ResponseEntity<ErrorResponseDto> handleConflict(RecursoDuplicadoException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorDto);
    }

    @ExceptionHandler(SolicitudInvalidaException.class)
    public ResponseEntity<ErrorResponseDto> handleBadRequest(SolicitudInvalidaException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorDto);
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorResponseDto> handleUnauthorized(CredencialesInvalidasException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorDto);
    }

    @ExceptionHandler(CuentaBloqueadaException.class)
    public ResponseEntity<ErrorResponseDto> handleBlocked(CuentaBloqueadaException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorDto);
    }

    @ExceptionHandler(CuentaInactivaException.class)
    public ResponseEntity<ErrorResponseDto> handleInactive(CuentaInactivaException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorDto);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponseDto> handleAccessDenied(AccessDeniedException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                "Acceso denegado: no cuenta con los permisos necesarios para realizar esta acción."
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorDto);
    }

    // --- HU06: incidencias e ingreso excepcional ---

    @ExceptionHandler(AccesoDenegadoException.class)
    public ResponseEntity<ErrorResponseDto> handleAccesoDenegado(AccesoDenegadoException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorDto);
    }

    @ExceptionHandler(ConflictoEstadoException.class)
    public ResponseEntity<ErrorResponseDto> handleConflictoEstado(ConflictoEstadoException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorDto);
    }

    /**
     * Error transitorio de la sincronización offline (HU21). En el flujo en
     * línea no debería ocurrir (el ingreso del estudiante ya está en el
     * servidor), pero si ocurre se responde 409 con el motivo en vez de un 500.
     */
    @ExceptionHandler(ReintentarSincronizacionException.class)
    public ResponseEntity<ErrorResponseDto> handleReintentarSincronizacion(ReintentarSincronizacionException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorDto);
    }

    // Sin esto, un archivo de más de 10 MB (límite global de multipart) caía
    // en el handler genérico como "error inesperado del servidor".
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponseDto> handleArchivoMuyGrande(MaxUploadSizeExceededException ex) {
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "El archivo supera el tamaño máximo permitido de 10 MB."
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorDto);
    }

    // --- Compartidas por ambos flujos ---
    // Solo puede existir un @ExceptionHandler por tipo de excepción en toda la clase,
    // así que esta usa el formato ErrorResponseDto (HU16) pero conserva en "mensaje"
    // el mismo texto (primer error de campo) que ya devolvía el flujo de registro.

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String nombreCampo = ((FieldError) error).getField();
            String mensajeError = error.getDefaultMessage();
            errores.put(nombreCampo, mensajeError);
        });

        String primerMensaje = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .findFirst()
                .orElse("Datos de entrada inválidos.");

        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                primerMensaje,
                errores
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorDto);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponseDto> handleHttpMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex) {
        String mensaje = "El formato del JSON enviado es inválido. Verifique la sintaxis: comas de más, llaves sin cerrar o comillas faltantes.";
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                mensaje
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorDto);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponseDto> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
        String mensaje = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();
        ErrorResponseDto errorDto = new ErrorResponseDto(status.value(), status.getReasonPhrase(), mensaje);
        return ResponseEntity.status(status).body(errorDto);
    }

    /**
     * Conflicto transitorio de concurrencia (deadlock, lock timeout, fallo de serialización).
     *
     * BUG-001: estos fallos NO son un error de negocio: la operación se puede reintentar tal
     * cual. Se responden con 503 para que el cliente (y la cola offline del dispositivo) sepa
     * que debe reintentar, en lugar de un 500 que se lee como "operación inválida" y hace que
     * el registro se descarte.
     */
    @ExceptionHandler({ConcurrencyFailureException.class, QueryTimeoutException.class})
    public ResponseEntity<ErrorResponseDto> handleConcurrencia(Exception ex) {
        logger.error("Fallo transitorio de concurrencia: {}", ex.getMessage(), ex);
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                "Service Unavailable",
                "La operacion choco con otra en curso. Se puede reintentar sin perdida de informacion."
        );
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorDto);
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponseDto> handleMetodoNoPermitido(
            org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .headers(ex.getHeaders())
                .body(new ErrorResponseDto(405, "Método no permitido", "El método HTTP no está permitido para esta ruta."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGeneral(Exception ex) {
        // BUG-001: antes no se logueaba nada y el 500 era invisible: sin el log no se podia
        // saber que el fallo venia de un conflicto de concurrencia con la cadena de auditoria.
        logger.error("Error no controlado: {}", ex.getMessage(), ex);
        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "No se pudo completar la operación. Intenta nuevamente en unos minutos."
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorDto);
    }
}
