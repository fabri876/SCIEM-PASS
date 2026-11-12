package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Hora oficial del sistema (Bolivia, UTC-4). Supabase y el servidor de deploy
 * pueden estar en UTC, y el celular del usuario puede tener cualquier hora,
 * así que los registros de la HU06 (ingreso excepcional, incidencias,
 * expulsiones) siempre toman la hora desde aquí y nunca del cliente.
 *
 * Excepción (HU21): los registros creados SIN conexión en el dispositivo se
 * sincronizan días después. En ese caso se conserva la hora real del evento
 * (la del dispositivo) y se valida contra la fecha y el horario del examen con
 * una tolerancia de reloj de 15 minutos
 * ({@code AmbienteExamenService.TOLERANCIA_RELOJ_MINUTOS}).
 */
public final class HoraOficial {

    public static final ZoneId ZONA = ZoneId.of("America/La_Paz");

    private HoraOficial() {
    }

    public static LocalDateTime ahora() {
        return LocalDateTime.now(ZONA);
    }

    public static LocalDate hoy() {
        return LocalDate.now(ZONA);
    }
}
