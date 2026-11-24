package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long expiration;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    /**
     * Genera un token JWT firmado con claims personalizados.
     *
     * @param correo    Correo electrónico del usuario (Subject).
     * @param rol       Nombre del rol (ej. ADMINISTRADOR, DOCENTE, OPERADOR, ESTUDIANTE).
     * @param idUsuario Identificador del usuario.
     * @param nombre    Nombre completo o de pila del usuario.
     * @return Cadena del token JWT.
     */
    public String generarToken(String correo, String rol, Integer idUsuario, String nombre, String hashContrasena) {
        Date ahora = new Date();
        Date fechaExpiracion = new Date(ahora.getTime() + expiration);

        return Jwts.builder()
                .subject(correo)
                .claim("rol", rol)
                .claim("idUsuario", idUsuario)
                .claim("nombre", nombre)
                .claim("versionCredencial", versionCredencial(idUsuario, hashContrasena))
                .issuedAt(ahora)
                .expiration(fechaExpiracion)
                .signWith(secretKey)
                .compact();
    }

    /** No expone el hash de la contraseña; cambia al actualizarla o migrar su hash. */
    private String versionCredencial(Integer idUsuario, String hashContrasena) {
        if (idUsuario == null || hashContrasena == null || hashContrasena.isBlank()) {
            throw new IllegalArgumentException("Credencial de cuenta no disponible");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretKey.getEncoded(), "HmacSHA256"));
            byte[] datos = ("SCIEM-SESSION-V1|" + idUsuario + "|" + hashContrasena).getBytes(StandardCharsets.UTF_8);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(datos));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo comprobar la credencial de sesion", e);
        }
    }

    public boolean credencialVigente(String token, Integer idUsuario, String hashContrasena) {
        if (idUsuario == null || hashContrasena == null || hashContrasena.isBlank()) return false;
        try {
            String version = obtenerClaims(token).get("versionCredencial", String.class);
            if (version == null) return false;
            return MessageDigest.isEqual(version.getBytes(StandardCharsets.UTF_8),
                    versionCredencial(idUsuario, hashContrasena).getBytes(StandardCharsets.UTF_8));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Obtiene los Claims contenidos en el token JWT.
     */
    public Claims obtenerClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String obtenerCorreo(String token) {
        return obtenerClaims(token).getSubject();
    }

    public String obtenerRol(String token) {
        return obtenerClaims(token).get("rol", String.class);
    }

    public Integer obtenerIdUsuario(String token) {
        return obtenerClaims(token).get("idUsuario", Integer.class);
    }

    public String obtenerNombre(String token) {
        return obtenerClaims(token).get("nombre", String.class);
    }

    /**
     * Valida que el token tenga una firma válida y no esté expirado.
     *
     * @param token Token JWT a evaluar.
     * @return true si el token es válido, false en caso contrario.
     */
    public boolean validarToken(String token) {
        try {
            obtenerClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getExpiration() {
        return expiration;
    }
}
