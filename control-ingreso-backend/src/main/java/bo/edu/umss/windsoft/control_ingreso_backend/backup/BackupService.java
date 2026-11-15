package bo.edu.umss.windsoft.control_ingreso_backend.backup;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

@Service
public class BackupService {

    public static final String SISTEMA_ID = "00000000-0000-0000-0000-000000000000";
    private static final Pattern NOMBRE_VALIDO = Pattern.compile("^backup_[A-Za-z0-9_\\-]+\\.sql$");
    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    @Value("${backup.db.host}") private String dbHost;
    @Value("${backup.db.port}") private String dbPort;
    @Value("${backup.db.user}") private String dbUser;
    @Value("${backup.db.name}") private String dbName;
    @Value("${backup.db.password}") private String dbPassword;
    @Value("${backup.retention.max}") private int maxBackups;

    @Autowired private JdbcTemplate jdbc;
    @Autowired private SupabaseStorageClient storage;
    @Autowired private DataSource dataSource;

    private final AtomicBoolean ocupado = new AtomicBoolean(false);
    private volatile boolean restaurando = false;

    public boolean isRestaurando() {
        return restaurando;
    }

    // ---------- GENERAR ----------
    public Map<String, Object> generar(String adminId, String accion) throws Exception {
        if (!ocupado.compareAndSet(false, true)) {
            throw new IllegalStateException("Hay otra operación de backup o restauración en curso");
        }
        try {
            String nombre = generarInterno(adminId, accion, null);
            Map<String, Object> res = new HashMap<>();
            res.put("nombre", nombre);
            return res;
        } finally {
            ocupado.set(false);
        }
    }

    private String generarInterno(String adminId, String accion, String protegido) throws Exception {
        String nombre = "backup_" + LocalDateTime.now().format(FORMATO) + ".sql";
        Path ruta = Path.of(System.getProperty("java.io.tmpdir"), nombre);
        try {
            ejecutar(List.of(
                    "pg_dump",
                    "-h", dbHost, "-p", dbPort, "-U", dbUser, "-d", dbName,
                    "-F", "p",
                    "--schema=public",
                    "--clean", "--if-exists",
                    "--no-owner", "--no-privileges",
                    "--exclude-table=public.bitacora_backups",
                    "-f", ruta.toString()));
            long bytes = Files.size(ruta);
            storage.subir(ruta, nombre);
            registrar(adminId, accion, nombre, "EXITO", "Backup generado (" + bytes + " bytes)");
            aplicarRetencion(protegido);
            return nombre;
        } catch (Exception e) {
            registrar(adminId, accion, nombre, "ERROR", e.getMessage());
            throw e;
        } finally {
            borrarLocal(ruta);
        }
    }

    // ---------- DESCARGAR ----------
    public String urlDescarga(String nombre, String adminId) throws Exception {
        validarNombre(nombre);
        try {
            String url = storage.urlFirmada(nombre, 60);
            registrar(adminId, "DESCARGAR", nombre, "EXITO", "URL de descarga generada");
            return url;
        } catch (Exception e) {
            registrar(adminId, "DESCARGAR", nombre, "ERROR", e.getMessage());
            throw e;
        }
    }

    // ---------- RESTAURAR ----------
    public void restaurar(String nombre, String adminId) throws Exception {
        validarNombre(nombre);
        if (!ocupado.compareAndSet(false, true)) {
            throw new IllegalStateException("Hay otra operación de backup o restauración en curso");
        }
        Path ruta = Path.of(System.getProperty("java.io.tmpdir"), "restore_" + nombre);
        try {
            storage.descargar(nombre, ruta);

            // Respaldo de seguridad antes de tocar nada
            String previo = generarInterno(adminId, "PRE_RESTAURACION", nombre);

            restaurando = true;
            ejecutar(List.of(
                    "psql",
                    "-h", dbHost, "-p", dbPort, "-U", dbUser, "-d", dbName,
                    "-v", "ON_ERROR_STOP=1",
                    "--single-transaction",
                    "-c", "SET lock_timeout = '30s'",
                    "-f", ruta.toString()));

            // Las conexiones del pool pueden tener planes viejos de las tablas recreadas
            if (dataSource instanceof HikariDataSource) {
                ((HikariDataSource) dataSource).getHikariPoolMXBean().softEvictConnections();
            }
            registrar(adminId, "RESTAURAR", nombre, "EXITO", "Restaurado. Respaldo previo: " + previo);
        } catch (Exception e) {
            registrar(adminId, "RESTAURAR", nombre, "ERROR", e.getMessage());
            throw e;
        } finally {
            restaurando = false;
            borrarLocal(ruta);
            ocupado.set(false);
        }
    }

    // ---------- LISTADOS ----------
    public List<Map<String, Object>> listar() throws Exception {
        return storage.listar();
    }

    public List<Map<String, Object>> bitacora() {
        return jdbc.queryForList(
                "SELECT id, admin_id, accion, archivo_nombre, fecha, estado, detalles "
                + "FROM bitacora_backups ORDER BY fecha DESC LIMIT 100");
    }

    // ---------- INTERNOS ----------
    private void validarNombre(String nombre) {
        if (nombre == null || !NOMBRE_VALIDO.matcher(nombre).matches()) {
            throw new IllegalArgumentException("Nombre de archivo inválido");
        }
    }

    private void registrar(String adminId, String accion, String archivo, String estado, String detalles) {
        try {
            jdbc.update("INSERT INTO bitacora_backups (admin_id, accion, archivo_nombre, estado, detalles) "
                    + "VALUES (?::uuid, ?, ?, ?, ?)", adminId, accion, archivo, estado, detalles);
        } catch (Exception e) {
            System.err.println("No se pudo escribir en bitacora_backups: " + e.getMessage());
        }
    }

    private void aplicarRetencion(String protegido) {
        try {
            List<Map<String, Object>> todos = new ArrayList<>(storage.listar()); // más nuevos primero
            for (int i = maxBackups; i < todos.size(); i++) {
                String nombre = (String) todos.get(i).get("nombre");
                if (nombre.equals(protegido)) continue;
                storage.eliminar(nombre);
            }
        } catch (Exception e) {
            System.err.println("No se pudo aplicar la retención: " + e.getMessage());
        }
    }

    private void ejecutar(List<String> comando) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(comando);
        pb.environment().put("PGPASSWORD", dbPassword);
        pb.redirectErrorStream(true);
        Process p = pb.start();
        String salida = new String(p.getInputStream().readAllBytes());
        int codigo = p.waitFor();
        if (codigo != 0) {
            String corto = salida.length() > 800 ? salida.substring(0, 800) : salida;
            throw new RuntimeException(comando.get(0) + " terminó con código " + codigo + ": " + corto);
        }
    }

    private void borrarLocal(Path ruta) {
        try {
            Files.deleteIfExists(ruta);
        } catch (Exception ignorado) {
            // no es crítico
        }
    }
}