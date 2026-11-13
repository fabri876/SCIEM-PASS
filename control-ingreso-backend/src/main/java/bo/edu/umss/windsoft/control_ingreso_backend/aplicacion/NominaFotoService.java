package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceEnrollmentRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Prepara miniaturas privadas para la precarga offline de un examen. */
@Service
@Transactional(readOnly = true)
public class NominaFotoService {
    private static final String ESTADO_ACTIVO = "activo";
    private static final int MAX_LADO = 160;

    public record FotoItem(String codigoSis, String tipo, String base64) {}
    public record PaginaFotos(List<FotoItem> items, int page, int totalPages, int total) {}

    private final AsignacionIngresoService asignacionIngresoService;
    private final FaceEnrollmentRepository enrollmentRepository;
    private final StorageProvider storageProvider;

    public NominaFotoService(AsignacionIngresoService asignacionIngresoService,
                             FaceEnrollmentRepository enrollmentRepository,
                             StorageProvider storageProvider) {
        this.asignacionIngresoService = asignacionIngresoService;
        this.enrollmentRepository = enrollmentRepository;
        this.storageProvider = storageProvider;
    }

    public PaginaFotos obtenerPagina(Integer idExamen, int page, int size) {
        List<EstudianteListaOficialDTO> nomina = asignacionIngresoService.obtenerListaOficial(idExamen, null);
        List<Integer> ids = nomina.stream().map(EstudianteListaOficialDTO::getIdUsuario)
                .filter(Objects::nonNull).distinct().toList();
        Map<Integer, FaceEnrollment> porUsuario = new HashMap<>();
        enrollmentRepository.findByIdUsuarioInAndEstado(ids, ESTADO_ACTIVO).forEach(enrollment -> {
            if (enrollment.getPhotoPath() != null && !enrollment.getPhotoPath().isBlank()) {
                porUsuario.put(enrollment.getIdUsuario(), enrollment);
            }
        });

        // Filtrar antes de paginar mantiene totalPages e items consistentes.
        List<EstudianteListaOficialDTO> conFoto = nomina.stream()
                .filter(dto -> porUsuario.containsKey(dto.getIdUsuario())).toList();
        int total = conFoto.size();
        int desde = Math.min(page * size, total);
        int hasta = Math.min(desde + size, total);
        List<FotoItem> items = conFoto.subList(desde, hasta).stream()
                .map(dto -> crearItem(dto, porUsuario.get(dto.getIdUsuario())))
                .filter(Objects::nonNull).toList();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        return new PaginaFotos(items, page, totalPages, total);
    }

    private FotoItem crearItem(EstudianteListaOficialDTO estudiante, FaceEnrollment enrollment) {
        try {
            byte[] miniatura = crearMiniatura(storageProvider.get(enrollment.getPhotoPath()));
            if (miniatura == null) return null;
            return new FotoItem(String.valueOf(estudiante.getCodigoSis()), "image/jpeg",
                    Base64.getEncoder().encodeToString(miniatura));
        } catch (IOException | RuntimeException ex) {
            // Una foto dañada no debe impedir el uso offline del resto de la nómina.
            return null;
        }
    }

    private byte[] crearMiniatura(byte[] original) throws IOException {
        ImageIO.setUseCache(false);
        BufferedImage fuente = ImageIO.read(new ByteArrayInputStream(original));
        if (fuente == null || fuente.getWidth() <= 0 || fuente.getHeight() <= 0) return null;
        double escala = Math.min(1d, (double) MAX_LADO / Math.max(fuente.getWidth(), fuente.getHeight()));
        int ancho = Math.max(1, (int) Math.round(fuente.getWidth() * escala));
        int alto = Math.max(1, (int) Math.round(fuente.getHeight() * escala));
        BufferedImage destino = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = destino.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, ancho, alto);
            g.setComposite(AlphaComposite.SrcOver);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.drawImage(fuente, 0, 0, ancho, alto, null);
        } finally {
            g.dispose();
        }
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        ImageWriter escritor = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ImageOutputStream stream = ImageIO.createImageOutputStream(salida)) {
            escritor.setOutput(stream);
            ImageWriteParam parametros = escritor.getDefaultWriteParam();
            if (parametros.canWriteCompressed()) {
                parametros.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                parametros.setCompressionQuality(0.80f);
            }
            escritor.write(null, new IIOImage(destino, null, null), parametros);
        } finally {
            escritor.dispose();
        }
        return salida.toByteArray();
    }
}
