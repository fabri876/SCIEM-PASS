package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

/** Persistencia HU09. Requiere la migracion HU09 antes de utilizarse. */
@Repository
public class IntentoExamenIncorrectoRepository {
    public record Datos(UUID solicitud, int asignatura, int examen, int ambiente, int operador,
                        int estudiante, int codSis, String metodo,
                        Integer asignaturaDestino, Integer examenDestino, Integer ambienteDestino) {}
    public record Guardado(int idIntento, Datos datos) {}
    private final NamedParameterJdbcTemplate jdbc;

    public IntentoExamenIncorrectoRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Retorna vacio cuando otra peticion ya registro esta misma clave. */
    public Optional<Integer> insertar(Datos d) {
        return insertar(d, null);
    }

    public Optional<Integer> insertar(Datos d, LocalDateTime marcadoEn) {
        var p = parametros(d);
        p.addValue("marcadoEn", marcadoEn);
        return jdbc.query("""
            INSERT INTO public.intentosnoautorizados
                (idasignatura,idexamen,idambiente,idusuario,est_idusuario,codsisestudiante,
                 fechaintento,horaintento,motivointento,hu09_solicitud,hu09_metodo,
                 hu09_asignatura_destino,hu09_examen_destino,hu09_ambiente_destino)
            VALUES (:asignatura,:examen,:ambiente,:operador,:estudiante,:codSis,
                     CAST(COALESCE(CAST(:marcadoEn AS timestamp), CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz') AS date),
                     COALESCE(CAST(:marcadoEn AS timestamp), CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz'),
                    'EXAMEN_INCORRECTO',:solicitud,:metodo,:asignaturaDestino,:examenDestino,:ambienteDestino)
            ON CONFLICT (hu09_solicitud) WHERE hu09_solicitud IS NOT NULL DO NOTHING
            RETURNING idintento
            """, p, (rs, fila) -> rs.getInt(1)).stream().findFirst();
    }

    public Optional<Guardado> buscar(UUID solicitud) {
        return jdbc.query("""
            SELECT idintento,idasignatura,idexamen,idambiente,idusuario,est_idusuario,codsisestudiante,
                   hu09_metodo,hu09_asignatura_destino,hu09_examen_destino,hu09_ambiente_destino
              FROM public.intentosnoautorizados
             WHERE hu09_solicitud=:solicitud AND motivointento='EXAMEN_INCORRECTO'
            """, new MapSqlParameterSource("solicitud", solicitud), (rs, fila) -> new Guardado(
                    rs.getInt("idintento"), new Datos(solicitud, rs.getInt("idasignatura"),
                    rs.getInt("idexamen"), rs.getInt("idambiente"), rs.getInt("idusuario"),
                    rs.getInt("est_idusuario"), rs.getInt("codsisestudiante"), rs.getString("hu09_metodo"),
                    rs.getObject("hu09_asignatura_destino", Integer.class),
                    rs.getObject("hu09_examen_destino", Integer.class),
                    rs.getObject("hu09_ambiente_destino", Integer.class)))).stream().findFirst();
    }

    private MapSqlParameterSource parametros(Datos d) {
        return new MapSqlParameterSource().addValue("solicitud", d.solicitud())
                .addValue("asignatura", d.asignatura()).addValue("examen", d.examen())
                .addValue("ambiente", d.ambiente()).addValue("operador", d.operador())
                .addValue("estudiante", d.estudiante()).addValue("codSis", d.codSis())
                .addValue("metodo", d.metodo()).addValue("asignaturaDestino", d.asignaturaDestino())
                .addValue("examenDestino", d.examenDestino()).addValue("ambienteDestino", d.ambienteDestino());
    }
}
