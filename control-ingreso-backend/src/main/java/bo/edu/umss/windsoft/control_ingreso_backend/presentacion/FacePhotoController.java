package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

/** Las fotos biométricas se sirven solo tras autenticar y autorizar el rol. */
@RestController
@RequestMapping("/api/face/photos")
public class FacePhotoController {
    private final StorageProvider storageProvider;

    public FacePhotoController(StorageProvider storageProvider) {
        this.storageProvider = storageProvider;
    }

    @GetMapping("/{*ruta}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE','OPERADOR')")
    public ResponseEntity<ByteArrayResource> obtener(@PathVariable String ruta) {
        String relativa = ruta.startsWith("/") ? ruta.substring(1) : ruta;
        MediaType mediaType = tipoImagen(relativa);
        try {
            byte[] contenido = storageProvider.get(relativa);
            return ResponseEntity.ok().contentType(mediaType)
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .body(new ByteArrayResource(contenido));
        } catch (SecurityException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta de fotografía inválida.");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fotografía no encontrada.");
        }
    }

    private MediaType tipoImagen(String ruta) {
        String minusculas = ruta.toLowerCase(java.util.Locale.ROOT);
        if (minusculas.endsWith(".jpg") || minusculas.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (minusculas.endsWith(".png")) return MediaType.IMAGE_PNG;
        throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formato de imagen no permitido.");
    }
}
