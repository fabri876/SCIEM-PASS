package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class QrService {

    private static final int DEFAULT_WIDTH = 300;
    private static final int DEFAULT_HEIGHT = 300;

    /**
     * Genera un código QR en arreglo de bytes (formato PNG).
     *
     * @param contenido Texto o identificador a codificar en el QR.
     * @param ancho     Ancho en píxeles.
     * @param alto      Alto en píxeles.
     * @return Arreglo de bytes de la imagen PNG generada.
     * @throws Exception Si ocurre un error durante la generación del QR.
     */
    public byte[] generarQrBytes(String contenido, int ancho, int alto) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();

        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
        hints.put(EncodeHintType.MARGIN, 1);

        BitMatrix bitMatrix = qrCodeWriter.encode(contenido, BarcodeFormat.QR_CODE, ancho, alto, hints);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

        return outputStream.toByteArray();
    }

    /**
     * Genera un código QR en formato Base64 Data URL (data:image/png;base64,...)
     * listo para incrustarse directamente en etiquetas <img src="..." /> en React.
     *
     * @param contenido Texto o identificador a codificar.
     * @return Cadena Base64 Data URL (data:image/png;base64,...).
     * @throws Exception Si ocurre un error durante la generación.
     */
    public String generarQrBase64(String contenido) throws Exception {
        return generarQrBase64(contenido, DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    /**
     * Genera un código QR en formato Base64 Data URL con dimensiones personalizadas.
     *
     * @param contenido Texto o identificador a codificar.
     * @param ancho     Ancho en píxeles.
     * @param alto      Alto en píxeles.
     * @return Cadena Base64 Data URL (data:image/png;base64,...).
     * @throws Exception Si ocurre un error durante la generación.
     */
    public String generarQrBase64(String contenido, int ancho, int alto) throws Exception {
        byte[] qrBytes = generarQrBytes(contenido, ancho, alto);
        String base64 = Base64.getEncoder().encodeToString(qrBytes);
        return "data:image/png;base64," + base64;
    }
}
