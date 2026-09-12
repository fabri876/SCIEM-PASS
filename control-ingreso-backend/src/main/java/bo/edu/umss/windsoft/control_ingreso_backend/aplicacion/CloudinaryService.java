package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Sube un archivo a Cloudinary especificando la carpeta de destino.
     *
     * @param file   Archivo recibido desde el controlador.
     * @param folder Nombre de la carpeta en Cloudinary (ejemplo: "estudiantes").
     * @return Map con los detalles completos de la respuesta de Cloudinary (url,
     *         secure_url, public_id, etc.).
     * @throws IOException Si ocurre un error de lectura o conexión al subir.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> uploadFile(MultipartFile file, String folder) throws IOException {
        return cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder", folder,
                "resource_type", "auto"));
    }

    /**
     * Sube una imagen a la carpeta por defecto "estudiantes" y retorna directamente
     * su URL segura (HTTPS).
     *
     * @param file Archivo recibido desde el controlador.
     * @return URL segura (HTTPS) generada por Cloudinary.
     * @throws IOException Si ocurre un error al subir el archivo.
     */
    public String uploadImage(MultipartFile file) throws IOException {
        Map<String, Object> uploadResult = uploadFile(file, "estudiantes");
        return (String) uploadResult.get("secure_url");
    }

    /**
     * Elimina una imagen de Cloudinary a partir de su identificador público
     * (public_id).
     *
     * @param publicId Identificador público del recurso en Cloudinary.
     * @return Map con el resultado de la eliminación ("result": "ok").
     * @throws IOException Si ocurre un error al eliminar.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> deleteImage(String publicId) throws IOException {
        return cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
    }
}
