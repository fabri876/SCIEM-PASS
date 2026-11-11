package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AltaUsuarioLote;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Escrituras por fases en la misma transaccion JPA/JDBC de la carga. */
@Repository
public class CargaMasivaJdbcRepository {
    private static final int TAMANO_LOTE = 50;
    private final JdbcTemplate jdbc;

    public CargaMasivaJdbcRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Set<String> docenteGruposActuales() {
        return new HashSet<>(jdbc.query("SELECT d.idusuario,d.idgrupo FROM docentegrupo d JOIN grupo g ON g.idgrupo=d.idgrupo WHERE g.idsemestre=semestre_actual_id()",
                (r,n)->r.getInt(1)+":"+r.getInt(2)));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void guardarNuevos(List<AltaUsuarioLote> altas) {
        if (altas.isEmpty()) return;
        List<Integer> ids = jdbc.queryForList(
                "SELECT nextval('usuario_idusuario_seq') FROM generate_series(1, ?)", Integer.class, altas.size());
        if (ids.size() != altas.size()) throw new IllegalStateException("No se pudieron reservar los IDs del lote.");
        List<Object[]> usuarios = new ArrayList<>();
        Map<String, List<Object[]>> roles = new LinkedHashMap<>();
        List<Object[]> docentes = new ArrayList<>(), estudiantes = new ArrayList<>(), ayudantes = new ArrayList<>();
        LocalDate fecha = LocalDate.now();
        LocalDateTime inscripcion = LocalDateTime.now();
        for (int i = 0; i < altas.size(); i++) {
            AltaUsuarioLote alta = altas.get(i);
            var u = alta.usuario(); u.setIdusuario(ids.get(i));
            int sis = alta.codigoSis() == null ? u.getIdusuario() : alta.codigoSis();
            usuarios.add(new Object[]{u.getIdusuario(), u.getCiusuario(), u.getNombreusuario(),
                    u.getApellidousuario(), u.getTelefonousuario(), u.getCorreousuario(),
                    u.getContraseniausuario(), u.getEstadousuario(), u.getIntentosFallidos(),
                    u.getDebeCambiarContrasena()});
            String sql = switch (alta.rol()) {
                case "ADMINISTRADOR" -> "INSERT INTO admin (idusuario) VALUES (?)";
                case "DOCENTE" -> "INSERT INTO docente (idusuario, codsisdocente) VALUES (?, ?)";
                case "ESTUDIANTE" -> "INSERT INTO estudiante (idusuario, codsisestudiante) VALUES (?, ?)";
                case "OPERADOR" -> "INSERT INTO ayudante (idusuario) VALUES (?)";
                default -> throw new IllegalArgumentException("Rol no soportado por la carga.");
            };
            roles.computeIfAbsent(sql, key -> new ArrayList<>()).add(
                    alta.rol().equals("DOCENTE") || alta.rol().equals("ESTUDIANTE")
                            ? new Object[]{u.getIdusuario(), sis} : new Object[]{u.getIdusuario()});
            for (int grupo : alta.grupos()) {
                switch (alta.rol()) {
                    case "DOCENTE" -> docentes.add(new Object[]{u.getIdusuario(), sis, grupo});
                    case "ESTUDIANTE" -> estudiantes.add(new Object[]{u.getIdusuario(), sis, grupo, inscripcion});
                    case "OPERADOR" -> ayudantes.add(new Object[]{u.getIdusuario(), grupo});
                    default -> throw new IllegalArgumentException("El rol no admite grupos.");
                }
            }
        }
        batch("INSERT INTO usuario (idusuario, ciusuario, nombreusuario, apellidousuario, telefonousuario, "
                + "correousuario, contraseniausuario, estadousuario, intentos_fallidos, debe_cambiar_contrasena) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", usuarios);
        roles.forEach(this::batch);
        batch("INSERT INTO docenteasignatura (idusuario, codsisdocente, idasignatura) "
                + "SELECT ?, ?, g.idasignatura FROM grupo g WHERE g.idgrupo=? ON CONFLICT DO NOTHING", docentes);
        batch("INSERT INTO docentegrupo (idusuario, codsisdocente, idgrupo) VALUES (?, ?, ?)", docentes);
        // Los triggers existentes derivan asignatura/semestre y exigen un unico grupo por materia.
        batch("INSERT INTO estudiantegrupo (idusuario, codsisestudiante, idgrupo, fechainscripcion) VALUES (?, ?, ?, ?)", estudiantes);
        batch("INSERT INTO ayudantegrupo (idusuario, idgrupo) VALUES (?, ?)", ayudantes);
        // Mantener la habilitacion por defecto en examenes de la asignatura del semestre actual.
        batch("INSERT INTO habilitacion (idhabilitacion, idusuario, codsisestudiante, idasignatura, idexamen, "
                + "estadohabilitacion, observacionhabilitacion, fecharegistro) "
                + "SELECT nextval('habilitacion_idhabilitacion_seq'), ?, ?, e.idasignatura, e.idexamen, TRUE, NULL, ? "
                + "FROM examen e JOIN grupo g ON g.idasignatura=e.idasignatura AND g.idsemestre=e.idsemestre "
                + "WHERE g.idgrupo=? AND NOT EXISTS (SELECT 1 FROM habilitacion h "
                + "WHERE h.codsisestudiante=? AND h.idasignatura=e.idasignatura AND h.idexamen=e.idexamen)",
                estudiantes.stream().map(r -> new Object[]{r[0], r[1], fecha, r[2], r[1]}).toList());
    }

    private void batch(String sql, List<Object[]> filas) {
        for (int start = 0; start < filas.size(); start += TAMANO_LOTE) {
            var lote = filas.subList(start, Math.min(start + TAMANO_LOTE, filas.size()));
            // Tipos explicitos para NULL: evita consultas adicionales de metadata del driver.
            jdbc.batchUpdate(sql, lote, lote.getFirst().length == 9
                    ? new int[]{Types.INTEGER, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR, Types.INTEGER,
                    Types.VARCHAR, Types.VARCHAR, Types.BOOLEAN, Types.INTEGER}
                    : tipos(lote.getFirst()));
        }
    }

    private int[] tipos(Object[] fila) {
        int[] tipos = new int[fila.length];
        for (int i = 0; i < fila.length; i++) tipos[i] = fila[i] instanceof LocalDate ? Types.DATE
                : fila[i] instanceof LocalDateTime ? Types.TIMESTAMP : Types.INTEGER;
        return tipos;
    }
}
