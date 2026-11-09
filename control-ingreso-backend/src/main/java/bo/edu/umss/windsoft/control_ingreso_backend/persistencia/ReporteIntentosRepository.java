package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReporteIntentoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CatalogoReporteExamenDto;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Repository
public class ReporteIntentosRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public ReporteIntentosRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<CatalogoReporteExamenDto> catalogo(Integer docente) {
        return jdbc.query("""
                SELECT e.idasignatura, a.nombreasignatura, e.idexamen, t.nombretipoexamen, e.fechaexamen
                  FROM public.examen e
                  LEFT JOIN public.asignatura a ON a.idasignatura = e.idasignatura
                  LEFT JOIN public.tipoexamen t ON t.idtipoexamen = e.idtipoexamen
                 WHERE (:docente IS NULL OR e.idusuario = :docente)
                 ORDER BY a.nombreasignatura, e.fechaexamen DESC, e.idexamen DESC
                """, new MapSqlParameterSource().addValue("docente", docente, java.sql.Types.INTEGER), (rs, row) -> {
            var fecha = rs.getDate("fechaexamen");
            return new CatalogoReporteExamenDto(rs.getInt("idasignatura"), rs.getString("nombreasignatura"),
                    rs.getInt("idexamen"),
                    unir(rs.getString("nombretipoexamen"), fecha == null ? null : fecha.toString()));
        });
    }

    public List<ReporteIntentoDto> listar(Integer docente, Integer asignatura, Integer examen,
            String motivo, LocalDate fecha, String busqueda) {
        StringBuilder sql = new StringBuilder(
                """
                        SELECT i.idintento, i.idasignatura, a.nombreasignatura, i.idexamen,
                               t.nombretipoexamen, e.fechaexamen, u.nombreusuario, u.apellidousuario,
                               i.codsisestudiante, u.ciusuario, i.motivointento, ap.nombreaula AS aula_presentada,
                               aa.nombreaula AS aula_asignada, ad.nombreasignatura AS asignatura_destino,
                               td.nombretipoexamen AS tipo_examen_destino, ed.fechaexamen AS fecha_examen_destino,
                               aad.nombreaula AS aula_destino, i.fechaintento, i.horaintento,
                               op.nombreusuario AS operador_nombre, op.apellidousuario AS operador_apellido,
                               EXISTS (SELECT 1 FROM public.cambioambiente ca WHERE ca.idintento_origen = i.idintento) AS reubicacion_registrada
                          FROM public.intentosnoautorizados i
                          JOIN public.examen e ON e.idexamen = i.idexamen AND e.idasignatura = i.idasignatura
                          LEFT JOIN public.asignatura a ON a.idasignatura = i.idasignatura
                          LEFT JOIN public.tipoexamen t ON t.idtipoexamen = e.idtipoexamen
                          LEFT JOIN public.usuario u ON u.idusuario = i.est_idusuario
                          LEFT JOIN public.usuario op ON op.idusuario = i.idusuario
                          LEFT JOIN public.ambiente p ON p.idambiente = i.idambiente
                          LEFT JOIN public.aula ap ON ap.idaula = p.idaula
                          LEFT JOIN public.ambiente destino ON destino.idambiente = i.idambienteasignado
                           LEFT JOIN public.aula aa ON aa.idaula = destino.idaula
                           LEFT JOIN public.asignatura ad ON ad.idasignatura = i.hu09_asignatura_destino
                           LEFT JOIN public.examen ed ON ed.idasignatura = i.hu09_asignatura_destino AND ed.idexamen = i.hu09_examen_destino
                           LEFT JOIN public.tipoexamen td ON td.idtipoexamen = ed.idtipoexamen
                           LEFT JOIN public.ambiente ambd ON ambd.idambiente = i.hu09_ambiente_destino
                           LEFT JOIN public.aula aad ON aad.idaula = ambd.idaula
                         WHERE 1=1
                        """);
        MapSqlParameterSource params = new MapSqlParameterSource();
        if (docente != null) {
            sql.append(" AND e.idusuario = :docente");
            params.addValue("docente", docente);
        }
        if (asignatura != null) {
            sql.append(" AND i.idasignatura = :asignatura");
            params.addValue("asignatura", asignatura);
        }
        if (examen != null) {
            sql.append(" AND i.idexamen = :examen");
            params.addValue("examen", examen);
        }
        if (motivo != null && !motivo.isBlank()) {
            sql.append(" AND i.motivointento = :motivo");
            params.addValue("motivo", motivo);
        }
        if (fecha != null) {
            sql.append(" AND i.fechaintento = :fecha");
            params.addValue("fecha", Date.valueOf(fecha));
        }
        if (busqueda != null && !busqueda.isBlank()) {
            sql.append(
                    " AND lower(concat_ws(' ', u.nombreusuario, u.apellidousuario, u.ciusuario, i.codsisestudiante, op.nombreusuario, op.apellidousuario, ap.nombreaula, aa.nombreaula)) LIKE :busqueda");
            params.addValue("busqueda", "%" + busqueda.trim().toLowerCase(java.util.Locale.ROOT) + "%");
        }
        sql.append(" ORDER BY i.horaintento DESC, i.idintento DESC");
        return jdbc.query(sql.toString(), params, (rs, row) -> {
            String motivoReal = rs.getString("motivointento");
            String etiqueta = switch (motivoReal) {
                case "DUPLICADO" -> "DUPLICADO BLOQUEADO";
                case "AMBIENTE_DIFERENTE" -> "AMBIENTE DIFERENTE";
                case "INHABILITADO" -> "INHABILITADO ACADEMICO";
                default -> motivoReal;
            };
            var fechaExamen = rs.getDate("fechaexamen");
            var fechaIntento = rs.getDate("fechaintento");
            var hora = rs.getTimestamp("horaintento");
            String asignado = rs.getString("aula_asignada");
            if ("EXAMEN_INCORRECTO".equals(motivoReal)) {
                var fechaDestino = rs.getDate("fecha_examen_destino");
                asignado = unir(unir(rs.getString("asignatura_destino"), rs.getString("tipo_examen_destino")),
                        unir(fechaDestino == null ? null : fechaDestino.toString(), rs.getString("aula_destino")));
            }
            return new ReporteIntentoDto(rs.getInt("idintento"), rs.getInt("idasignatura"),
                    rs.getString("nombreasignatura"), rs.getInt("idexamen"),
                    unir(rs.getString("nombretipoexamen"), fechaExamen == null ? null : fechaExamen.toString()),
                    unir(rs.getString("nombreusuario"), rs.getString("apellidousuario")),
                    rs.getString("codsisestudiante"), rs.getString("ciusuario"), null,
                    motivoReal, etiqueta, rs.getString("aula_presentada"), asignado,
                    fechaIntento == null ? null : fechaIntento.toString(),
                    hora == null ? null : hora.toLocalDateTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                    unir(rs.getString("operador_nombre"), rs.getString("operador_apellido")),
                    rs.getBoolean("reubicacion_registrada") ? "Reubicado e ingreso registrado" : null, null);
        });
    }

    private static String unir(String a, String b) {
        String valor = ((a == null ? "" : a) + " " + (b == null ? "" : b)).trim();
        return valor.isEmpty() ? null : valor;
    }
}
