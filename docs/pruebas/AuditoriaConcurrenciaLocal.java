import java.sql.*;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Solo datos ficticios en la base local aislada; deja eventos permanentes. */
public class AuditoriaConcurrenciaLocal {
    private static final String URL = "jdbc:postgresql://127.0.0.1:5432/sciem_pass_integracion?connectTimeout=10";

    public static void main(String[] args) throws Exception {
        if (System.console() == null) throw new IllegalStateException("Ejecute en una consola interactiva");
        String usuario = System.console().readLine("Usuario PostgreSQL local: ");
        char[] clave = System.console().readPassword("Contrasena PostgreSQL local: ");
        String password = new String(clave);
        java.util.Arrays.fill(clave, '\0');
        String lote = "[PRUEBA_HU15_CONCURRENCIA_" + UUID.randomUUID() + "]";
        try (Connection control = DriverManager.getConnection(URL, usuario, password)) {
            try (Statement s = control.createStatement(); ResultSet r = s.executeQuery(
                    "select current_database(), inet_server_addr()::text")) {
                r.next();
                if (!"sciem_pass_integracion".equals(r.getString(1))) throw new IllegalStateException("Base incorrecta");
                System.out.println("Base local: " + r.getString(1) + "; lote: " + lote);
            }
            ejecutar(control, usuario, password, lote, 100);
            ejecutar(control, usuario, password, lote, 500);
        }
    }

    private static void ejecutar(Connection control, String usuario, String password, String lote, int cantidad) throws Exception {
        String prefijo = lote + " " + cantidad + " ";
        AtomicInteger exitos = new AtomicInteger();
        AtomicInteger fallos = new AtomicInteger();
        ConcurrentHashMap<String, AtomicInteger> errores = new ConcurrentHashMap<>();
        CountDownLatch salida = new CountDownLatch(1);
        // Limita conexiones simultaneas; las solicitudes restantes esperan turno.
        // No equivale a probar 500 conexiones o 500 transacciones simultaneas.
        Semaphore conexiones = new Semaphore(20, true);
        long inicio = System.nanoTime();
        try (ExecutorService ejecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 1; i <= cantidad; i++) {
                int numero = i;
                ejecutor.submit(() -> {
                    boolean adquirida = false;
                    try {
                        salida.await();
                        conexiones.acquire();
                        adquirida = true;
                        try (Connection c = DriverManager.getConnection(URL, usuario, password);
                             PreparedStatement s = c.prepareStatement("insert into public.historialauditoria (idusuario,accion,fechaaccion) values (null,?,current_timestamp)")) {
                            s.setString(1, prefijo + numero);
                            s.executeUpdate();
                            exitos.incrementAndGet();
                        }
                    } catch (Exception e) {
                        fallos.incrementAndGet();
                        String codigo = e instanceof SQLException sql && sql.getSQLState() != null ? sql.getSQLState() : e.getClass().getSimpleName();
                        errores.computeIfAbsent(codigo, k -> new AtomicInteger()).incrementAndGet();
                    } finally {
                        if (adquirida) conexiones.release();
                    }
                });
            }
            salida.countDown();
        }
        try (PreparedStatement s = control.prepareStatement("""
                select count(*), count(distinct h.accion), count(s.idauditoria),
                       count(*) filter (where s.hash_actual <> public.calcular_hash_evento_auditoria(
                           s.secuencia, s.hash_anterior, h.idauditoria, h.idusuario, h.fechaaccion, h.accion))
                  from public.historialauditoria h
                  left join public.sello_auditoria s on s.idauditoria = h.idauditoria
                 where h.accion like ?
                """)) {
            s.setString(1, prefijo + "%");
            try (ResultSet r = s.executeQuery()) {
                r.next();
                System.out.printf("Tanda %d (maximo 20 conexiones): exitos=%d fallos=%d eventos=%d distintos=%d sellos=%d hashes_incorrectos=%d tiempo=%.2fs errores=%s%n",
                        cantidad, exitos.get(), fallos.get(), r.getLong(1), r.getLong(2), r.getLong(3), r.getLong(4),
                        (System.nanoTime() - inicio) / 1_000_000_000.0, errores);
            }
        }
    }
}
