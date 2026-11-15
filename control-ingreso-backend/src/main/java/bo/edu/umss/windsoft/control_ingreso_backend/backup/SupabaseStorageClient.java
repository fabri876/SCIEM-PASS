package bo.edu.umss.windsoft.control_ingreso_backend.backup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class SupabaseStorageClient {

    @Value("${backup.storage.url}")
    private String baseUrl;

    @Value("${backup.storage.service-key}")
    private String serviceKey;

    @Value("${backup.storage.bucket}")
    private String bucket;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private HttpRequest.Builder req(String path) {
        return HttpRequest.newBuilder(URI.create(baseUrl + "/storage/v1" + path))
                .header("Authorization", "Bearer " + serviceKey)
                .header("apikey", serviceKey);
    }

    private void validar(HttpResponse<?> res, String accion) throws IOException {
        if (res.statusCode() >= 300) {
            throw new IOException("Storage (" + accion + ") respondió " + res.statusCode() + ": " + res.body());
        }
    }

    public void subir(Path archivo, String nombre) throws Exception {
        HttpRequest r = req("/object/" + bucket + "/" + nombre)
                .header("Content-Type", "application/octet-stream")
                .POST(HttpRequest.BodyPublishers.ofFile(archivo))
                .build();
        validar(http.send(r, HttpResponse.BodyHandlers.ofString()), "subir");
    }

    public void descargar(String nombre, Path destino) throws Exception {
        HttpRequest r = req("/object/" + bucket + "/" + nombre).GET().build();
        HttpResponse<Path> res = http.send(r, HttpResponse.BodyHandlers.ofFile(destino));
        if (res.statusCode() >= 300) {
            throw new IOException("Storage (descargar) respondió " + res.statusCode());
        }
    }

    public String urlFirmada(String nombre, int segundos) throws Exception {
        HttpRequest r = req("/object/sign/" + bucket + "/" + nombre)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"expiresIn\":" + segundos + "}"))
                .build();
        HttpResponse<String> res = http.send(r, HttpResponse.BodyHandlers.ofString());
        validar(res, "firmar");
        String firmada = mapper.readTree(res.body()).get("signedURL").asText();
        return baseUrl + "/storage/v1" + firmada + "&download=" + nombre;
    }

    public List<Map<String, Object>> listar() throws Exception {
        String body = "{\"prefix\":\"\",\"limit\":200,\"offset\":0,"
                + "\"sortBy\":{\"column\":\"created_at\",\"order\":\"desc\"}}";
        HttpRequest r = req("/object/list/" + bucket)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> res = http.send(r, HttpResponse.BodyHandlers.ofString());
        validar(res, "listar");

        List<Map<String, Object>> lista = new ArrayList<>();
        for (JsonNode n : mapper.readTree(res.body())) {
            String nombre = n.get("name").asText();
            if (!nombre.endsWith(".sql")) continue;
            Map<String, Object> item = new HashMap<>();
            item.put("nombre", nombre);
            item.put("fecha", n.path("created_at").asText());
            item.put("tamano", n.path("metadata").path("size").asLong(0));
            lista.add(item);
        }
        return lista;
    }

    public void eliminar(String nombre) throws Exception {
        HttpRequest r = req("/object/" + bucket + "/" + nombre).DELETE().build();
        validar(http.send(r, HttpResponse.BodyHandlers.ofString()), "eliminar");
    }
}