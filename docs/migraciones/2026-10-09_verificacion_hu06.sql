-- =============================================================================
-- Verificación HU06 (SOLO LECTURA: no modifica nada)
-- Fecha: 2026-10-09 · Autora: Marcela Chalco Soliz
--
-- Por qué: después del 04/10 el equipo cambió la BD (grupos, ayudante_examen,
-- credencial, ingreso.metodo_ingreso de la HU05). Hibernate valida al arrancar
-- que existan las columnas mapeadas, pero NO revisa reglas (UNIQUE/CHECK),
-- contadores de id, triggers ni las columnas que la HU06 lee con SQL directo.
--
-- Cómo ejecutar: Supabase > SQL Editor, pegar TODO y ejecutar UNA vez
-- (es una sola consulta). Todas las filas deben decir OK; mandar captura.
-- =============================================================================

WITH columnas(tabla, columna) AS (
    VALUES ('ambiente', 'capacidadambiente'),   -- leída con SQL directo (aforo)
           ('aula', 'capacidadaula'),           -- leída con SQL directo (aforo)
           ('examen', 'idusuario'),             -- docente asignado al examen
           ('ayudante_examen', 'estado_asignacion'),
           ('ingreso', 'horaingreso'),
           ('ingreso', 'tipoingreso'),
           ('ingreso', 'motivoexcepcion'),
           ('ingreso', 'evidenciaurl'),
           ('ingreso', 'metodo_ingreso'),
           ('expulsion', 'horaexpulsion'),
           ('expulsion', 'idincidencia'),
           ('incidencia', 'clavesolicitud'),
           ('incidencia', 'fecharevision'),
           ('incidencia', 'idusuariorevisa')
),
reglas(tabla, regla) AS (
    VALUES ('ingreso', 'uq_ingreso_estudiante_examen'),
           ('ingreso', 'ck_ingreso_tipo'),
           ('ingreso', 'ck_ingreso_motivo'),
           ('ingreso', 'ck_ingreso_excepcional'),
           ('incidencia', 'uq_incidencia_clavesolicitud'),
           ('incidencia', 'ck_incidencia_tipo'),
           ('incidencia', 'ck_incidencia_severidad'),
           ('incidencia', 'ck_incidencia_estado'),
           ('incidencia', 'ck_incidencia_cierre'),
           ('incidencia', 'ck_incidencia_revision'),
           ('incidencia', 'ck_incidencia_estudiante'),
           ('expulsion', 'fk_expulsion_incidencia')
),
contadores(tabla, columna) AS (
    VALUES ('ingreso', 'idingreso'),
           ('expulsion', 'idexpulsion'),
           ('incidencia', 'idincidencia'),
           ('historialauditoria', 'idauditoria')
)
SELECT '1. Columna ' || c.tabla || '.' || c.columna AS chequeo,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns ic
                         WHERE ic.table_schema = 'public' AND ic.table_name = c.tabla
                           AND ic.column_name = c.columna)
            THEN 'OK' ELSE 'FALTA' END AS resultado
FROM columnas c

UNION ALL
SELECT '2. Regla ' || r.regla || ' en ' || r.tabla,
       CASE WHEN EXISTS (SELECT 1 FROM pg_constraint pc
                         WHERE pc.conname = r.regla
                           AND pc.conrelid = to_regclass('public.' || r.tabla))
            THEN 'OK' ELSE 'FALTA' END
FROM reglas r

UNION ALL
SELECT '3. Contador de ' || k.tabla || '.' || k.columna,
       CASE WHEN to_regclass('public.' || k.tabla) IS NOT NULL
                 AND pg_get_serial_sequence('public.' || k.tabla, k.columna) IS NOT NULL
            THEN 'OK' ELSE 'FALTA' END
FROM contadores k

UNION ALL
-- El ingreso excepcional guarda metodo_ingreso = 'MANUAL': ninguna regla debe impedirlo
SELECT '4. Reglas sobre ingreso.metodo_ingreso',
       COALESCE((SELECT string_agg(pc.conname || ': ' || pg_get_constraintdef(pc.oid), ' | ')
                 FROM pg_constraint pc
                 WHERE pc.conrelid = 'public.ingreso'::regclass
                   AND pg_get_constraintdef(pc.oid) ILIKE '%metodo_ingreso%'),
                'OK (sin reglas extra)')

UNION ALL
SELECT '5. Valor por defecto de ingreso.metodo_ingreso',
       COALESCE((SELECT 'OK (' || ic.column_default || ', nulo=' || ic.is_nullable || ')'
                 FROM information_schema.columns ic
                 WHERE ic.table_schema = 'public' AND ic.table_name = 'ingreso'
                   AND ic.column_name = 'metodo_ingreso'),
                'FALTA')

UNION ALL
-- Triggers nuevos podrían cambiar lo que se guarda
SELECT '6. Triggers en ingreso / incidencia / expulsion',
       COALESCE((SELECT string_agg(DISTINCT event_object_table || '.' || trigger_name, ', ')
                 FROM information_schema.triggers
                 WHERE event_object_schema = 'public'
                   AND event_object_table IN ('ingreso', 'incidencia', 'expulsion')),
                'OK (ninguno)')

UNION ALL
-- Datos: un examen sin docente responsable no aparece para ningún docente
SELECT '7. Exámenes sin docente asignado (examen.idusuario vacío)',
       (SELECT count(*)::text FROM public.examen WHERE idusuario IS NULL)
       || ' de ' || (SELECT count(*)::text FROM public.examen)

UNION ALL
SELECT '8. Asignaciones de operador ACTIVAS (ayudante_examen)',
       COALESCE((SELECT count(*)::text FROM public.ayudante_examen WHERE estado_asignacion = 'ACTIVO'), '0')

UNION ALL
SELECT '9. Ingresos registrados (normal / excepcional)',
       (SELECT count(*) FILTER (WHERE tipoingreso = 'NORMAL')::text || ' / '
             || count(*) FILTER (WHERE tipoingreso = 'EXCEPCIONAL')::text
        FROM public.ingreso)

ORDER BY 1;
