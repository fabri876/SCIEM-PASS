package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/** Implementación local con rutas normalizadas para impedir path traversal. */
@Service
public class LocalDiskStorage implements StorageProvider {
    private final Path basePath;

    public LocalDiskStorage(@Value("${storage.biometric.path:./storage/biometrics}") String rutaBase)
            throws IOException {
        this.basePath = Path.of(rutaBase).toAbsolutePath().normalize();
        Files.createDirectories(this.basePath);
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
