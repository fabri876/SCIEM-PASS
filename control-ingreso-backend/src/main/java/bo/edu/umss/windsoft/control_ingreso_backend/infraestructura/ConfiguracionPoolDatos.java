package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * BUG-001 · Tiempo máximo de espera por un lock de la base de datos.
 *
 * <p>El sellado de la auditoría (HU15) actualiza una única fila compartida
 * ({@code cabeza_cadena_auditoria.secuencia}) en cada INSERT de {@code historialauditoria}.
 * Esa fila es un punto de serialización global: dos escrituras simultáneas (por ejemplo, dos
 * expulsiones en el mismo instante) hacen que la segunda espere el lock de la primera.
 *
 * <p>Sin un tope, esa espera es indefinida y el conflicto terminaba en un 500 opaco que se
 * llevaba por delante la operación. Con {@code lock_timeout} el conflicto sale a los 10
 * segundos como error transitorio, el backend lo reintenta y, si no alcanza, el cliente
 * guarda el registro en la cola offline del dispositivo.
 *
 * <p>Se configura aquí y no en {@code application.yaml} para que el corte de espera viva
 * junto al código que lo necesita y no dependa de un archivo de configuración que puede
 * quedar desactualizado en algún entorno.
 */
@Configuration
public class ConfiguracionPoolDatos {

    private static final Logger logger = LoggerFactory.getLogger(ConfiguracionPoolDatos.class);

    /** Tiempo máximo que una operación espera un lock antes de que la base la aborte. */
    private static final String LOCK_TIMEOUT = "SET lock_timeout = '10s'";

    /**
     * Aplica el {@code lock_timeout} al pool de conexiones cuando se crea y todavía no
     * arrancó. Se hace en un {@link BeanPostProcessor} para no depender de que el pool
     * sea el de Hikari (si algún día se cambia de pool, simplemente no se aplica nada).
     */
    @Bean
    public static BeanPostProcessor configuradorLockTimeout() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (!(bean instanceof HikariDataSource fuente)) {
                    return bean;
                }
                try {
                    // Si el pool ya arrancó no se puede cambiar su configuración: en ese
                    // caso se deja como está (el reintento del backend sigue cubriendo).
                    if (fuente.getHikariPoolMXBean() == null) {
                        fuente.setConnectionInitSql(LOCK_TIMEOUT);
                        logger.info("Pool de conexiones: lock_timeout de 10s (BUG-001)");
                    }
                } catch (RuntimeException e) {
                    logger.warn("No se pudo aplicar el lock_timeout al pool de conexiones: {}", e.getMessage());
                }
                return bean;
            }
        };
    }
}
