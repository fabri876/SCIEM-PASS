package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

/**
 * Servicio utilitario para cálculo de sellos y hashes SHA-256 en formato hexadecimal de 64 caracteres.
 * Utilizado por HU-15 para la cadena criptográfica WORM inmodificable.
 */
public final class AuditoriaHashService {

    public static final String HASH_GENESIS = "0".repeat(64);

    private AuditoriaHashService() {
    }

    /**
     * Calcula el hash SHA-256 en minúsculas (64 hex) a partir de una cadena UTF-8.
     */
    public static String calcularSha256(String entrada) {
        if (entrada == null) {
            entrada = "";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(entrada.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Algoritmo SHA-256 no disponible en la JVM", e);
        }
    }

    /** Representación HU15-V1 propuesta; no certifica eventos históricos sin sello. */
    public static String hashEventoPersistido(long secuencia, String anterior, Integer id,
                                               Integer usuario, LocalDateTime fecha, String accion) {
        if (anterior == null || id == null) {
            throw new IllegalArgumentException("El identificador y hash anterior son obligatorios");
        }
        String usuarioCanonico = usuario == null ? "N" : "V" + usuario;
        String fechaCanonica = fecha == null ? "N" : "V" + fecha.format(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS"));
        String accionCanonica = accion == null ? "N" : "V" + Base64.getEncoder().encodeToString(
                accion.getBytes(StandardCharsets.UTF_8));
        return calcularSha256("HU15-V1|" + secuencia + "|" + anterior + "|" + id + "|"
                + usuarioCanonico + "|" + fechaCanonica + "|" + accionCanonica);
    }

    /**
     * Genera la representación canónica del bloque idéntica a la esperada por el frontend
     * (ver historialInmodificableService.js: obtenerTextoCanonicoBloque).
     *
     * Formato: id|prevHash|fecha|modulo|operacion|ejecutor|ip|detalles
     */
    public static String textoCanonico(Integer idBloque, String hashAnterior, String fechaHoraOficial,
                                       String modulo, String operacion, String ejecutor, String ip, String detalles) {
        String idStr = idBloque != null ? String.valueOf(idBloque) : "";
        String prevStr = (hashAnterior != null && !hashAnterior.isBlank()) ? hashAnterior : HASH_GENESIS;
        String fechaStr = fechaHoraOficial != null ? fechaHoraOficial : "";
        String modStr = modulo != null ? modulo : "";
        String opStr = operacion != null ? operacion : "";
        String ejecutorStr = ejecutor != null ? ejecutor : "";
        String ipStr = ip != null ? ip : "";
        String detallesStr = detalles != null ? detalles : "";

        return idStr + "|" + prevStr + "|" + fechaStr + "|" + modStr + "|" + opStr + "|" + ejecutorStr + "|" + ipStr + "|" + detallesStr;
    }
}
