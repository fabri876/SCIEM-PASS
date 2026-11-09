package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage;

import java.io.IOException;

/** Almacenamiento privado de evidencia biométrica. Nunca expone rutas públicas. */
public interface StorageProvider {
    String save(byte[] bytes, String extension, String subcarpeta) throws IOException;

    byte[] get(String rutaRelativa) throws IOException;

    boolean delete(String rutaRelativa) throws IOException;
}
