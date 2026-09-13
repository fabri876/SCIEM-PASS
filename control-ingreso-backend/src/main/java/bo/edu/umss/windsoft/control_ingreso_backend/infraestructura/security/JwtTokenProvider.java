package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
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
    public String generarToken(String correo, String rol, Integer idUsuario, String nombre) {
        Date ahora = new Date();
        Date fechaExpiracion = new Date(ahora.getTime() + expiration);

        return Jwts.builder()
                .subject(correo)
                .claim("rol", rol)
                .claim("idUsuario", idUsuario)
                .claim("nombre", nombre)
                .issuedAt(ahora)
                .expiration(fechaExpiracion)
                .signWith(secretKey)
                .compact();
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
