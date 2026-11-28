-- Vista previa: psql -v corte='2026-11-28 10:00:00-04' -v aplicar=false -f este_archivo.sql
-- Aplicación: repetir con el mismo corte y aplicar=true. Validar primero en una copia.
-- Ejecutar la vista previa y la aplicación en una ventana sin escrituras de la aplicación.
\set ON_ERROR_STOP on
BEGIN;
WITH inicios AS (
    SELECT idexamen, MIN(horainicio) AS primer_inicio
    FROM ambiente
    GROUP BY idexamen
), candidatas AS (
    SELECT h.idhabilitacion,
           e.fechaexamen IS NULL OR i.primer_inicio IS NULL AS sin_horario
    FROM habilitacion h
    LEFT JOIN estudiante s ON s.codsisestudiante = h.codsisestudiante
    JOIN usuario u ON u.idusuario = COALESCE(s.idusuario, h.idusuario)
    JOIN examen e ON e.idexamen = h.idexamen
    LEFT JOIN inicios i ON i.idexamen = e.idexamen
    WHERE u.estadousuario IS NOT TRUE
      AND h.estadohabilitacion IS TRUE
      AND e.estadoexamen IS TRUE AND e.cancelado IS NOT TRUE
      AND (e.fechaexamen IS NULL OR i.primer_inicio IS NULL
          OR e.fechaexamen + i.primer_inicio > (:'corte'::timestamptz AT TIME ZONE 'America/La_Paz'))
), actualizadas AS (
    UPDATE habilitacion h
    SET estadohabilitacion = false, observacionhabilitacion = 'Usuario desactivado'
    FROM candidatas c
    WHERE :'aplicar'::boolean AND h.idhabilitacion = c.idhabilitacion
      AND NOT c.sin_horario AND h.estadohabilitacion IS TRUE
    RETURNING h.idhabilitacion
)
SELECT COUNT(*) FILTER (WHERE NOT sin_horario) AS previstas,
       COUNT(*) FILTER (WHERE sin_horario) AS sin_horario_para_revisar,
       COALESCE(array_agg(idhabilitacion ORDER BY idhabilitacion) FILTER (WHERE sin_horario), '{}') AS ids_sin_horario,
       (SELECT COUNT(*) FROM actualizadas) AS modificadas
FROM candidatas;
COMMIT;
