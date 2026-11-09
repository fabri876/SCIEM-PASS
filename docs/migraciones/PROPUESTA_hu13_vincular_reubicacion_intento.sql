-- Aplicada por el usuario en Supabase; no repetir en esa base.
-- Los cambios anteriores permanecen sin vinculo: no se infiere su origen.
BEGIN;
-- Si la tabla esta ocupada, abortar sin cambios en lugar de esperar indefinidamente.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.cambioambiente ADD COLUMN idintento_origen integer;
ALTER TABLE public.cambioambiente ADD CONSTRAINT fk_cambioambiente_intento_origen
    FOREIGN KEY (idintento_origen) REFERENCES public.intentosnoautorizados (idintento);
CREATE UNIQUE INDEX uq_cambioambiente_intento_origen
    ON public.cambioambiente (idintento_origen) WHERE idintento_origen IS NOT NULL;
COMMIT;
