-- =============================================================================
-- Migración HU10: Dashboard de Monitoreo de Asistencia y Control de Aulas
-- Fecha: 2026-10-10 · Autora: Marcela Chalco Soliz (Sprint 2)
--
-- Qué hace (solo AGREGA; las dos tablas existen desde el diseño original,
-- están VACÍAS y ningún código las usa — verificado el 10/10/2026):
--
--   1. intentosnoautorizados → guarda cada ingreso BLOQUEADO en el punto de
--      control (HU05): DUPLICADO, AMBIENTE_DIFERENTE (aula equivocada) o
--      INHABILITADO. De aquí salen "Duplicados Bloqueados" y las alertas de
--      estudiantes desubicados del dashboard.
--   2. cambioambiente → guarda cada "Reubicar y Autorizar" del docente
--      (aula de origen, aula nueva, quién autorizó y cuándo). Tiene prioridad
--      sobre el reparto automático por apellido.
--   3. Contador automático del id en las dos tablas.
--
-- Cómo ejecutar: Supabase > SQL Editor.
--   · PASO 1: ejecutar y mandar captura (debe salir 0 | 0).
--   · PASO 2: TODO junto (transacción: se aplica completo o nada).
--   · PASO 3: ejecutar y mandar captura (todo OK).
-- Ejecutarlo ANTES de levantar el backend con el código de la HU10
-- (Hibernate valida estas columnas al arrancar).
-- =============================================================================


-- PASO 1 · Diagnóstico (solo lectura). Esperado: 0 | 0
SELECT (SELECT count(*) FROM public.intentosnoautorizados) AS intentos,
       (SELECT count(*) FROM public.cambioambiente)        AS cambios;


-- PASO 2 · Migración (ejecutar TODO junto)
BEGIN;

-- 2.1 intentosnoautorizados
ALTER TABLE public.intentosnoautorizados
  ADD COLUMN horaintento        timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'America/La_Paz'),
  ADD COLUMN motivointento      varchar(20) NOT NULL DEFAULT 'INHABILITADO',
  ADD COLUMN idambiente         integer,   -- aula donde se presentó
  ADD COLUMN idambienteasignado integer,   -- aula que tenía asignada (AMBIENTE_DIFERENTE)
  ADD CONSTRAINT ck_intento_motivo
      CHECK (motivointento IN ('DUPLICADO', 'AMBIENTE_DIFERENTE', 'INHABILITADO')),
  ADD CONSTRAINT fk_intento_ambiente
      FOREIGN KEY (idambiente) REFERENCES public.ambiente(idambiente),
  ADD CONSTRAINT fk_intento_ambiente_asignado
      FOREIGN KEY (idambienteasignado) REFERENCES public.ambiente(idambiente);

CREATE SEQUENCE public.intentosnoautorizados_idintento_seq AS integer
  OWNED BY public.intentosnoautorizados.idintento;
ALTER TABLE public.intentosnoautorizados
  ALTER COLUMN idintento SET DEFAULT nextval('public.intentosnoautorizados_idintento_seq');

CREATE INDEX ix_intento_examen_motivo
  ON public.intentosnoautorizados (idasignatura, idexamen, motivointento);

-- 2.2 cambioambiente (reubicaciones)
ALTER TABLE public.cambioambiente
  ADD COLUMN idambienteorigen  integer,
  ADD COLUMN idusuarioautoriza integer,
  ADD COLUMN fechahoracambio   timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'America/La_Paz'),
  ADD CONSTRAINT fk_cambio_ambiente_origen
      FOREIGN KEY (idambienteorigen) REFERENCES public.ambiente(idambiente),
  ADD CONSTRAINT fk_cambio_autoriza
      FOREIGN KEY (idusuarioautoriza) REFERENCES public.usuario(idusuario);

CREATE SEQUENCE public.cambioambiente_idcambio_seq AS integer
  OWNED BY public.cambioambiente.idcambio;
ALTER TABLE public.cambioambiente
  ALTER COLUMN idcambio SET DEFAULT nextval('public.cambioambiente_idcambio_seq');

CREATE INDEX ix_cambioambiente_ambiente ON public.cambioambiente (idambiente);

COMMIT;


-- PASO 3 · Verificación (solo lectura, una sola consulta). Todo debe decir OK.
SELECT chequeo, CASE WHEN ok THEN 'OK' ELSE 'FALTA' END AS resultado FROM (
  SELECT 'intentos: columnas nuevas' AS chequeo,
         (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'
            AND table_name = 'intentosnoautorizados'
            AND column_name IN ('horaintento', 'motivointento', 'idambiente', 'idambienteasignado')) = 4 AS ok
  UNION ALL
  SELECT 'cambioambiente: columnas nuevas',
         (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'
            AND table_name = 'cambioambiente'
            AND column_name IN ('idambienteorigen', 'idusuarioautoriza', 'fechahoracambio')) = 3
  UNION ALL
  SELECT 'regla ck_intento_motivo',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_intento_motivo')
  UNION ALL
  SELECT 'contador intentosnoautorizados',
         pg_get_serial_sequence('public.intentosnoautorizados', 'idintento') IS NOT NULL
  UNION ALL
  SELECT 'contador cambioambiente',
         pg_get_serial_sequence('public.cambioambiente', 'idcambio') IS NOT NULL
) v;


-- REVERTIR (solo si hay que deshacer la HU10; borra intentos y reubicaciones)
-- BEGIN;
-- ALTER TABLE public.cambioambiente ALTER COLUMN idcambio DROP DEFAULT;
-- DROP SEQUENCE IF EXISTS public.cambioambiente_idcambio_seq;
-- DROP INDEX IF EXISTS public.ix_cambioambiente_ambiente;
-- ALTER TABLE public.cambioambiente DROP CONSTRAINT fk_cambio_autoriza,
--   DROP CONSTRAINT fk_cambio_ambiente_origen,
--   DROP COLUMN fechahoracambio, DROP COLUMN idusuarioautoriza, DROP COLUMN idambienteorigen;
-- ALTER TABLE public.intentosnoautorizados ALTER COLUMN idintento DROP DEFAULT;
-- DROP SEQUENCE IF EXISTS public.intentosnoautorizados_idintento_seq;
-- DROP INDEX IF EXISTS public.ix_intento_examen_motivo;
-- ALTER TABLE public.intentosnoautorizados DROP CONSTRAINT fk_intento_ambiente_asignado,
--   DROP CONSTRAINT fk_intento_ambiente, DROP CONSTRAINT ck_intento_motivo,
--   DROP COLUMN idambienteasignado, DROP COLUMN idambiente, DROP COLUMN motivointento, DROP COLUMN horaintento;
-- COMMIT;
