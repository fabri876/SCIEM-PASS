-- Ejecutar en una transacción. No elimina inscripciones.
-- La asignatura se deriva del grupo para poder exigir unicidad en PostgreSQL.
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.grupo, public.estudiantegrupo IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM public.estudiantegrupo eg JOIN public.grupo g ON g.idgrupo=eg.idgrupo
               GROUP BY eg.idusuario,g.idasignatura HAVING count(*)>1) THEN
        RAISE EXCEPTION 'Existen estudiantes con más de un grupo por asignatura. Revisar antes de migrar.';
    END IF;
END $$;
ALTER TABLE public.estudiantegrupo ADD COLUMN IF NOT EXISTS idasignatura INTEGER;
UPDATE public.estudiantegrupo eg SET idasignatura=g.idasignatura
FROM public.grupo g WHERE g.idgrupo=eg.idgrupo AND eg.idasignatura IS DISTINCT FROM g.idasignatura;
ALTER TABLE public.estudiantegrupo ALTER COLUMN idasignatura SET NOT NULL;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.grupo'::regclass AND conname='uk_grupo_id_asignatura') THEN
        ALTER TABLE public.grupo ADD CONSTRAINT uk_grupo_id_asignatura UNIQUE (idgrupo,idasignatura);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.estudiantegrupo'::regclass AND conname='fk_inscripcion_grupo_asignatura') THEN
        ALTER TABLE public.estudiantegrupo ADD CONSTRAINT fk_inscripcion_grupo_asignatura
            FOREIGN KEY (idgrupo,idasignatura) REFERENCES public.grupo(idgrupo,idasignatura);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.estudiantegrupo'::regclass AND conname='uk_estudiante_asignatura') THEN
        ALTER TABLE public.estudiantegrupo ADD CONSTRAINT uk_estudiante_asignatura UNIQUE (idusuario,idasignatura);
    END IF;
END $$;
CREATE OR REPLACE FUNCTION public.derivar_asignatura_inscripcion() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
    SELECT g.idasignatura INTO NEW.idasignatura FROM public.grupo g WHERE g.idgrupo=NEW.idgrupo;
    IF NEW.idasignatura IS NULL THEN
        RAISE EXCEPTION 'El grupo no existe o no tiene asignatura.' USING ERRCODE='23503';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS derivar_asignatura_inscripcion ON public.estudiantegrupo;
CREATE TRIGGER derivar_asignatura_inscripcion BEFORE INSERT OR UPDATE ON public.estudiantegrupo
FOR EACH ROW EXECUTE FUNCTION public.derivar_asignatura_inscripcion();
