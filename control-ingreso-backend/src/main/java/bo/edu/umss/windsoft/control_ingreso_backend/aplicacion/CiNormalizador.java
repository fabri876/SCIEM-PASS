package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

/**
 * CI boliviano con complemento alfanumérico (ej. "8765432-1E", "8.765.432"):
 * se guarda sin puntos, guiones ni espacios, y en mayúsculas ("87654321E"),
 * para que la unicidad y las búsquedas no dependan de cómo cada pantalla lo
 * haya escrito. Decisión de equipo (Sprint 2).
 */
public final class CiNormalizador {

    private CiNormalizador() {
    }

    public static String normalizar(String ci) {
        if (ci == null) {
            return null;
        }
        return ci.trim().toUpperCase().replaceAll("[.\\-\\s]", "");
    }
}
