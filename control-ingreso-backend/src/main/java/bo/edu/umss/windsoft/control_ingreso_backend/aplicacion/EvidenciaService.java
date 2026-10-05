package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

/**
 * Fotos de respaldo/evidencia de la HU06: JPG o PNG de hasta 5 MB, opcionales.
 * Se revisa el contenido real del archivo (no solo la extensión), para que un
 * PDF renombrado a .jpg no pase.
 */
@Service
public class EvidenciaService {

    public record EvidenciaSubida(String url, String publicId) {
    }

    private static final Logger logger = LoggerFactory.getLogger(EvidenciaService.class);
    private static final long TAMANIO_MAXIMO = 5L * 1024 * 1024;
    private static final String MENSAJE_INVALIDO = "La imagen debe ser JPG o PNG y pesar como máximo 5 MB.";

    private final CloudinaryService cloudinaryService;

    public EvidenciaService(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    /** Valida sin subir: así se rechaza el archivo antes de tocar la BD. */
    public void validar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            return;
        }
        if (archivo.getSize() > TAMANIO_MAXIMO || !esJpgOPng(archivo)) {
            throw new SolicitudInvalidaException(MENSAJE_INVALIDO);
        }
    }

    /** Sube la imagen (si hay) y devuelve su URL; null si no se adjuntó nada. */
    public EvidenciaSubida subir(MultipartFile archivo, String carpeta) {
        if (archivo == null || archivo.isEmpty()) {
            return null;
        }
        validar(archivo);
        try {
            Map<String, Object> resultado = cloudinaryService.uploadFile(archivo, carpeta);
            return new EvidenciaSubida((String) resultado.get("secure_url"), (String) resultado.get("public_id"));
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo subir la imagen. Intente nuevamente.", e);
        }
    }

    /** Si el registro en la BD falla después de subir la imagen, se borra para no dejar huérfanos. */
    public void eliminarSinFallar(EvidenciaSubida evidencia) {
        if (evidencia == null || evidencia.publicId() == null) {
            return;
        }
        try {
            cloudinaryService.deleteImage(evidencia.publicId());
        } catch (Exception e) {
            logger.warn("No se pudo borrar la evidencia huérfana {}: {}", evidencia.publicId(), e.getMessage());
        }
    }

    private boolean esJpgOPng(MultipartFile archivo) {
        try (InputStream in = archivo.getInputStream()) {
            byte[] cabecera = in.readNBytes(4);
            if (cabecera.length < 4) {
                return false;
            }
            boolean jpg = (cabecera[0] & 0xFF) == 0xFF && (cabecera[1] & 0xFF) == 0xD8 && (cabecera[2] & 0xFF) == 0xFF;
            boolean png = (cabecera[0] & 0xFF) == 0x89 && cabecera[1] == 'P' && cabecera[2] == 'N' && cabecera[3] == 'G';
            return jpg || png;
        } catch (IOException e) {
            return false;
        }
    }
}
