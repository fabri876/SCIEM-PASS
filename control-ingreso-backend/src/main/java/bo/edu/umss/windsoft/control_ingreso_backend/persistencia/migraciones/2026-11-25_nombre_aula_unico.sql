-- Evita aulas duplicadas por nombre ignorando espacios exteriores y mayúsculas.
-- La migración no modifica ni elimina datos existentes.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.aula
        WHERE nombreaula IS NOT NULL
        GROUP BY upper(btrim(nombreaula))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'No se puede crear la unicidad de aula: existen nombres duplicados. Corrija los duplicados antes de continuar.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS aula_nombre_normalizado_uq
    ON public.aula (upper(btrim(nombreaula)));
