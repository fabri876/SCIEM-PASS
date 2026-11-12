-- REGISTRO: fecha oficial probada localmente y aplicada en Supabase el 12/11/2026.
-- No volver a ejecutar donde la funcion o el trigger ya existan.
-- No modifica fechas ni sellos historicos. Solo afecta inserciones futuras.
-- El reloj del servidor PostgreSQL es la referencia; la cuenta propietaria puede
-- desactivar el trigger hasta que se separe la cuenta de aplicacion.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
CREATE FUNCTION public.fijar_fecha_auditoria_servidor() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    NEW.fechaaccion := clock_timestamp() AT TIME ZONE 'America/La_Paz';
    RETURN NEW;
END;
$$;
CREATE TRIGGER fijar_fecha_auditoria_servidor
BEFORE INSERT ON public.historialauditoria
FOR EACH ROW EXECUTE FUNCTION public.fijar_fecha_auditoria_servidor();
COMMIT;
