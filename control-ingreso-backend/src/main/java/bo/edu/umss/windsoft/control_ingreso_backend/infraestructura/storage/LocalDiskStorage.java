package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/** Implementación local con rutas normalizadas para impedir path traversal. */
@Service
public class LocalDiskStorage implements StorageProvider {
    private static final Logger logger = LoggerFactory.getLogger(LocalDiskStorage.class);
    private final Path basePath;

    public LocalDiskStorage(@Value("${storage.biometric.path:./storage/biometrics}") String rutaBase,
                            @Value("${storage.biometric.require-existing:false}") boolean requireExisting)
            throws IOException {
        this.basePath = Path.of(rutaBase).toAbsolutePath().normalize();
        if (requireExisting) {
            if (!Files.isDirectory(this.basePath) || !Files.isWritable(this.basePath)) {
                throw new IOException("El almacenamiento biometrico requerido no existe o no permite escritura: " + basePath);
            }
        } else {
            Files.createDirectories(this.basePath);
        }
        logger.info("Almacenamiento biometrico listo en {} ({} archivos)", basePath, contarArchivos());
    }

    @Override
    public String save(byte[] bytes, String extension, String subcarpeta) throws IOException {
        if (bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("El archivo biométrico está vacío.");
        }
        String extensionSegura = extension == null ? "" : extension.replaceFirst("^\\.", "");
        if (!extensionSegura.matches("[A-Za-z0-9]{1,10}")) {
            throw new IllegalArgumentException("La extensión del archivo no es válida.");
        }
        Path directorio = resolverRuta(subcarpeta == null ? "" : subcarpeta);
        Files.createDirectories(directorio);
        Path archivo = directorio.resolve(UUID.randomUUID() + "." + extensionSegura).normalize();
        if (!archivo.startsWith(basePath)) {
            throw new SecurityException("Ruta de almacenamiento inválida.");
        }
        Files.write(archivo, bytes);
        return basePath.relativize(archivo).toString().replace('\\', '/');
    }

    @Override
    public byte[] get(String rutaRelativa) throws IOException {
        return Files.readAllBytes(resolverRuta(rutaRelativa));
    }

    @Override
    public boolean delete(String rutaRelativa) throws IOException {
        return Files.deleteIfExists(resolverRuta(rutaRelativa));
    }

    /** Comprueba escritura real sin dejar archivos persistentes. */
    public void verificarSalud() throws IOException {
        Path temporal = Files.createTempFile(basePath, ".health-", ".tmp");
        Files.deleteIfExists(temporal);
    }

    private long contarArchivos() throws IOException {
        try (var rutas = Files.walk(basePath)) {
            return rutas.filter(Files::isRegularFile).count();
        }
    }

    private Path resolverRuta(String rutaRelativa) {
        if (rutaRelativa.isBlank() || rutaRelativa.contains("\\") || rutaRelativa.contains("..")) {
            throw new SecurityException("Ruta relativa inválida.");
        }
        Path resuelta = basePath.resolve(rutaRelativa).normalize();
        if (!resuelta.startsWith(basePath)) {
            throw new SecurityException("Ruta fuera del almacenamiento biométrico.");
        }
        return resuelta;
    }
}
