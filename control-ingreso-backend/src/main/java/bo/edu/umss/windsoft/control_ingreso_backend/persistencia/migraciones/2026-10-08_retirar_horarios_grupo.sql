-- Los horarios de exámenes se administran mediante horarioregular/examen.
-- No usar CASCADE: cualquier dependencia inesperada debe impedir el cambio.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.grupo DROP COLUMN IF EXISTS horarios;
