package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** Consulta los sellos opcionales de HU15 sin modificar la tabla histórica. */
@Repository
public class SelloAuditoriaRepository {
    private final JdbcTemplate jdbc;

    public SelloAuditoriaRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Sello(long secuencia, int idAuditoria, String anterior, String actual) {}
    public record Cabeza(long secuencia, String hash) {}

    public boolean disponible() {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "select (to_regclass('public.sello_auditoria') is not null " +
                        "and to_regclass('public.cabeza_cadena_auditoria') is not null) or " +
                        "(to_regclass('public.hu15_sello_auditoria') is not null " +
                        "and to_regclass('public.hu15_cabeza_cadena') is not null)", Boolean.class));
    }

    // Compatibilidad durante el despliegue coordinado de la migracion de nombres.
    private boolean usaNombresNuevos() {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "select to_regclass('public.sello_auditoria') is not null " +
                        "and to_regclass('public.cabeza_cadena_auditoria') is not null", Boolean.class));
    }

    public List<Sello> listar() {
        String tabla = usaNombresNuevos() ? "public.sello_auditoria" : "public.hu15_sello_auditoria";
        return jdbc.query("select secuencia, idauditoria, hash_anterior, hash_actual from " + tabla + " order by secuencia",
                (rs, fila) -> new Sello(rs.getLong(1), rs.getInt(2), rs.getString(3), rs.getString(4)));
    }

    public Optional<Cabeza> cabeza() {
        String tabla = usaNombresNuevos() ? "public.cabeza_cadena_auditoria" : "public.hu15_cabeza_cadena";
        return jdbc.query("select secuencia, hash_actual from " + tabla + " where singleton = true",
                (rs, fila) -> new Cabeza(rs.getLong(1), rs.getString(2))).stream().findFirst();
    }
}
