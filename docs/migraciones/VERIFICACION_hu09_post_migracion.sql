-- Consultas de solo lectura para revisar la migracion HU09.
-- No muestra datos de estudiantes ni modifica la base.
SELECT count(*) = 5 AS cinco_columnas_presentes
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'intentosnoautorizados'
   AND column_name IN ('hu09_solicitud', 'hu09_metodo', 'hu09_asignatura_destino',
                       'hu09_examen_destino', 'hu09_ambiente_destino');

SELECT conname, pg_get_constraintdef(oid) AS definicion
  FROM pg_constraint
 WHERE conrelid = 'public.intentosnoautorizados'::regclass
   AND conname IN ('ck_intento_motivo', 'ck_hu09_destino_completo', 'ck_hu09_datos_minimos',
                   'fk_hu09_examen_destino', 'fk_hu09_ambiente_destino')
 ORDER BY conname;

SELECT indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public' AND tablename = 'intentosnoautorizados'
   AND indexname = 'ux_hu09_solicitud';

SELECT count(*) AS intentos_incompatibles
  FROM public.intentosnoautorizados
 WHERE motivointento IS NULL
    OR motivointento NOT IN ('DUPLICADO', 'AMBIENTE_DIFERENTE', 'INHABILITADO', 'EXAMEN_INCORRECTO');
