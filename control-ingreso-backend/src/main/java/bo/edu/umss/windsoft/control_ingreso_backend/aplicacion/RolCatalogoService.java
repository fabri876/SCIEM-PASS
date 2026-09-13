package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RolRespuestaDto;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Catálogo fijo de roles y permisos básicos (HU16, criterio #1). No vive en
 * base de datos: con el diseño de tablas hijas (admin/docente/ayudante/
 * estudiante) los 4 tipos de usuario son fijos, así que sus permisos también.
 */
@Service
public class RolCatalogoService {

    private static final Map<String, RolRespuestaDto> CATALOGO = new LinkedHashMap<>();

    static {
        agregar(1, TipoUsuarioResolver.ADMINISTRADOR,
                "Acceso total a la administración de usuarios, roles y auditoría",
                List.of("GESTION_USUARIOS", "GESTION_ROLES", "VER_AUDITORIA", "CONTROL_INGRESO"));
        agregar(2, TipoUsuarioResolver.DOCENTE,
                "Gestión de exámenes y visualización de habilitaciones",
                List.of("GESTION_EXAMENES", "VER_PERFIL_PROPIO"));
        agregar(3, TipoUsuarioResolver.OPERADOR,
                "Personal de control de ingreso en accesos y escaneo de QR",
                List.of("CONTROL_INGRESO", "VER_PERFIL_PROPIO"));
        agregar(4, TipoUsuarioResolver.ESTUDIANTE,
                "Visualización de su código QR y estado de habilitación",
                List.of("VER_PERFIL_PROPIO"));
    }

    private static void agregar(int idRol, String rol, String descripcion, List<String> permisos) {
        CATALOGO.put(rol, new RolRespuestaDto(idRol, rol, descripcion, permisos));
    }

    public List<RolRespuestaDto> listar() {
        return List.copyOf(CATALOGO.values());
    }

    public List<String> permisosDe(String rol) {
        RolRespuestaDto entrada = CATALOGO.get(rol);
        return entrada == null ? List.of() : entrada.getPermisos();
    }
}
