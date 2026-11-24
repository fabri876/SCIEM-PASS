import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Duration;
import java.util.ArrayList;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/** Prueba manual: 20 solicitudes HTTP, solo con backend conectado a la base local aislada. */
public class AuditoriaConcurrenciaHttpLocal {
    private static final String URL_BD = "jdbc:postgresql://127.0.0.1:5432/sciem_pass_integracion";
    private static final String URL_BACKEND = "http://127.0.0.1:8080";

    public static void main(String[] args) throws Exception {
        var consola = System.console();
        if (consola == null) throw new IllegalStateException("Ejecute en una consola interactiva");
        System.out.println("ATENCION: genera auditorias permanentes. Backend 8080 DEBE usar sciem_pass_integracion LOCAL.");
        if (!"LOCAL".equals(consola.readLine("Escriba LOCAL para confirmar: "))) return;
        String usuarioBd = consola.readLine("Usuario de PostgreSQL local: ");
        char[] claveBd = consola.readPassword("Contrasena de PostgreSQL local: ");
        String correo = consola.readLine("Correo del administrador ficticio local: ");
        char[] claveApp = consola.readPassword("Contrasena del administrador ficticio: ");
        String claveBdTexto = new String(claveBd);
        String claveAppTexto = new String(claveApp);
        java.util.Arrays.fill(claveBd, '\0');
        java.util.Arrays.fill(claveApp, '\0');

        try (Connection control = DriverManager.getConnection(URL_BD, usuarioBd, claveBdTexto)) {
            control.setReadOnly(true);
            try (var s = control.createStatement(); var r = s.executeQuery("select current_database()")) {
                r.next();
                if (!"sciem_pass_integracion".equals(r.getString(1))) throw new IllegalStateException("Base incorrecta");
            }
            var cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
            String cuerpo = "{\"correo\":\"" + json(correo) + "\",\"contrasena\":\"" + json(claveAppTexto) + "\"}";
            var login = HttpRequest.newBuilder(URI.create(URL_BACKEND + "/api/auth/login"))
                    .timeout(Duration.ofSeconds(30)).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build();
            var respuestaLogin = cliente.send(login, HttpResponse.BodyHandlers.ofString());
            if (respuestaLogin.statusCode() != 200) throw new IllegalStateException("Login local fallo: HTTP " + respuestaLogin.statusCode());
            var matcher = Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"").matcher(respuestaLogin.body());
            if (!matcher.find()) throw new IllegalStateException("La respuesta no contiene token");
            String token = matcher.group(1);
            String lote = "qa002-" + UUID.randomUUID();
            CountDownLatch salida = new CountDownLatch(1);
            var resultados = new ArrayList<Future<Integer>>();
            long inicio = System.nanoTime();
            try (var ejecutor = Executors.newVirtualThreadPerTaskExecutor()) {
                for (int i = 1; i <= 20; i++) {
                    String marca = lote + "-" + i;
                    resultados.add(ejecutor.submit(() -> {
                        salida.await();
                        var peticion = HttpRequest.newBuilder(URI.create(URL_BACKEND + "/api/monitoreo/examenes"))
                                .timeout(Duration.ofSeconds(60)).header("Authorization", "Bearer " + token)
                                .header("X-Forwarded-For", marca).GET().build();
                        return cliente.send(peticion, HttpResponse.BodyHandlers.discarding()).statusCode();
                    }));
                }
                salida.countDown();
                int exitos = 0;
                int fallos = 0;
                for (var resultado : resultados) {
                    try {
                        int estado = resultado.get(70, TimeUnit.SECONDS);
                        if (estado == 200) exitos++;
                        else { fallos++; System.out.println("Respuesta no exitosa: HTTP " + estado); }
                    } catch (Exception e) {
                        fallos++;
                        System.out.println("Solicitud fallida: " + e.getClass().getSimpleName());
                    }
                }
                System.out.printf("HTTP: exitos=%d fallos=%d tiempo=%.2fs%n", exitos, fallos,
                        (System.nanoTime() - inicio) / 1_000_000_000.0);
            }
            try (PreparedStatement s = control.prepareStatement("""
                    select count(*), count(distinct h.accion), count(s.idauditoria),
                           count(*) filter (where s.hash_actual <> public.calcular_hash_evento_auditoria(
                               s.secuencia, s.hash_anterior, h.idauditoria, h.idusuario, h.fechaaccion, h.accion))
                      from public.historialauditoria h
                      left join public.sello_auditoria s on s.idauditoria = h.idauditoria
                     where h.accion like '[MONITOREO_ACCESO]%' and h.accion like ?
                    """)) {
                s.setString(1, "% | ip=" + lote + "-%");
                try (ResultSet r = s.executeQuery()) {
                    r.next();
                    System.out.printf("Base local: eventos=%d distintos=%d sellos=%d hashes_incorrectos=%d%n",
                            r.getLong(1), r.getLong(2), r.getLong(3), r.getLong(4));
                }
            }
            System.out.println("Verifique tambien la cadena completa desde la interfaz. No se incluye el evento de login.");
        }
    }

    private static String json(String texto) {
        StringBuilder salida = new StringBuilder();
        for (char c : texto.toCharArray()) {
            if (c == '"' || c == '\\') salida.append('\\').append(c);
            else if (c < 0x20) salida.append(String.format("\\u%04x", (int) c));
            else salida.append(c);
        }
        return salida.toString();
    }
}
