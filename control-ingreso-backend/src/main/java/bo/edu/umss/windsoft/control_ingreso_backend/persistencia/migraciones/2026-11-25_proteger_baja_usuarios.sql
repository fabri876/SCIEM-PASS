-- Aplicacion manual. Revisar en una base desechable antes de instalar.
-- Requiere 2026-11-24_admin_unico.sql y exactamente un administrador activo.
-- Verificacion: DELETE de una cuenta o de admin y desactivar al administrador deben fallar.
-- Activar y desactivar una cuenta normal debe funcionar. Usar datos ficticios.
-- Los triggers cubren DELETE y los UPDATE indicados, no TRUNCATE ni cambios de DDL.
-- Para revertir en mantenimiento autorizado: retirar los tres triggers por nombre
-- de sus tablas y luego las dos funciones, en una sola transaccion.

BEGIN;

LOCK TABLE public.usuario, public.admin IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_index
        WHERE indexrelid = pg_catalog.to_regclass('public.uq_admin_singleton')
          AND indrelid = 'public.admin'::regclass AND indisunique AND indisvalid
    ) OR (SELECT count(*) FROM public.admin) <> 1 OR NOT EXISTS (
        SELECT 1 FROM public.admin a JOIN public.usuario u USING (idusuario)
        WHERE u.estadousuario IS TRUE
    ) THEN
        RAISE EXCEPTION 'Se requiere el indice de administrador unico y una cuenta administradora activa.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rechazar_borrado_cuentas()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    RAISE EXCEPTION 'No se permite eliminar cuentas ni retirar el rol del administrador por SQL.';
END;
$$;

CREATE OR REPLACE FUNCTION public.proteger_estado_administrador()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    IF NEW.estadousuario IS NOT TRUE AND EXISTS (
        SELECT 1 FROM public.admin WHERE idusuario = OLD.idusuario
    ) THEN
        RAISE EXCEPTION 'No se puede desactivar al administrador unico.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_borrado_usuario ON public.usuario;
CREATE TRIGGER proteger_borrado_usuario BEFORE DELETE ON public.usuario
FOR EACH ROW EXECUTE FUNCTION public.rechazar_borrado_cuentas();

DROP TRIGGER IF EXISTS proteger_fila_admin ON public.admin;
CREATE TRIGGER proteger_fila_admin BEFORE DELETE OR UPDATE OF idusuario ON public.admin
FOR EACH ROW EXECUTE FUNCTION public.rechazar_borrado_cuentas();

DROP TRIGGER IF EXISTS proteger_estado_admin ON public.usuario;
CREATE TRIGGER proteger_estado_admin BEFORE UPDATE OF estadousuario ON public.usuario
FOR EACH ROW WHEN (OLD.estadousuario IS DISTINCT FROM NEW.estadousuario)
EXECUTE FUNCTION public.proteger_estado_administrador();

COMMIT;
