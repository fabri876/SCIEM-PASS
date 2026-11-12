-- REGISTRO: aplicado en la base local de prueba y en Supabase el 12/11/2026.
-- No volver a ejecutar en esas bases ni en otras donde ya existan los nombres nuevos.
-- Requiere desplegar primero el backend compatible con ambos nombres.
-- Renombra objetos existentes sin alterar eventos, sellos, permisos ni hashes.
-- El formato canonico HU15-V1 NO cambia: cambiarlo invalidaria los sellos.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

LOCK TABLE public.historialauditoria, public.hu15_cabeza_cadena,
           public.hu15_sello_auditoria IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.hu15_cabeza_cadena RENAME TO cabeza_cadena_auditoria;
ALTER TABLE public.hu15_sello_auditoria RENAME TO sello_auditoria;
ALTER TABLE public.cabeza_cadena_auditoria RENAME CONSTRAINT hu15_cabeza_cadena_pkey TO cabeza_cadena_auditoria_pkey;
ALTER TABLE public.sello_auditoria RENAME CONSTRAINT hu15_sello_auditoria_pkey TO sello_auditoria_pkey;
ALTER TABLE public.sello_auditoria RENAME CONSTRAINT hu15_sello_auditoria_idauditoria_key TO sello_auditoria_idauditoria_key;
ALTER TABLE public.sello_auditoria RENAME CONSTRAINT hu15_sello_auditoria_idauditoria_fkey TO sello_auditoria_idauditoria_fkey;
ALTER TABLE public.cabeza_cadena_auditoria RENAME CONSTRAINT hu15_cabeza_cadena_singleton_check TO cabeza_cadena_auditoria_singleton_check;
ALTER TABLE public.sello_auditoria RENAME CONSTRAINT hu15_sello_auditoria_version_canonica_check TO sello_auditoria_version_canonica_check;

ALTER FUNCTION public.hu15_hash_evento(bigint, text, integer, integer, timestamp without time zone, text) RENAME TO calcular_hash_evento_auditoria;
ALTER FUNCTION public.hu15_sellado_nuevo_evento() RENAME TO sellar_nuevo_evento_auditoria;
ALTER FUNCTION public.hu15_impedir_cambios() RENAME TO impedir_cambios_auditoria;
ALTER TRIGGER hu15_sellar_evento ON public.historialauditoria RENAME TO sellar_evento_auditoria;
ALTER TRIGGER hu15_no_alterar_historial ON public.historialauditoria RENAME TO impedir_cambios_historial_auditoria;
ALTER TRIGGER hu15_no_alterar_sellos ON public.sello_auditoria RENAME TO impedir_cambios_sello_auditoria;

-- La funcion PL/pgSQL contiene nombres como texto y debe actualizarse en la
-- misma transaccion; CREATE OR REPLACE conserva propietario y permisos.
CREATE OR REPLACE FUNCTION public.sellar_nuevo_evento_auditoria() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    v_secuencia bigint;
    v_anterior text;
    v_actual text;
BEGIN
    UPDATE public.cabeza_cadena_auditoria SET secuencia = secuencia + 1
     WHERE singleton = true RETURNING secuencia, hash_actual INTO STRICT v_secuencia, v_anterior;
    v_actual := public.calcular_hash_evento_auditoria(v_secuencia, v_anterior, NEW.idauditoria,
                                                     NEW.idusuario, NEW.fechaaccion, NEW.accion);
    INSERT INTO public.sello_auditoria (secuencia, idauditoria, hash_anterior, hash_actual)
    VALUES (v_secuencia, NEW.idauditoria, v_anterior, v_actual);
    UPDATE public.cabeza_cadena_auditoria SET hash_actual = v_actual WHERE singleton = true;
    RETURN NEW;
END;
$$;

-- En el momento de la migracion la fecha oficial existia solo en la base local.
DO $$
BEGIN
    IF to_regprocedure('public.hu15_fijar_fecha_servidor()') IS NOT NULL THEN
        ALTER FUNCTION public.hu15_fijar_fecha_servidor() RENAME TO fijar_fecha_auditoria_servidor;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.historialauditoria'::regclass
               AND tgname = 'hu15_fecha_servidor' AND NOT tgisinternal) THEN
        ALTER TRIGGER hu15_fecha_servidor ON public.historialauditoria RENAME TO fijar_fecha_auditoria_servidor;
    END IF;
END;
$$;
COMMIT;
