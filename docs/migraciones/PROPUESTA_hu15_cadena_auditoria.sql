-- REGISTRO DE LA MIGRACION HU15. Ya aplicada en la base compartida existente.
-- No volver a ejecutar sobre una base donde ya existan los objetos HU15.
-- Los eventos anteriores permanecen intactos y NO se consideran sellados.
-- El punto de control externo exigido por la HU15 sigue pendiente.
-- Requiere pgcrypto instalado y pruebas previas en una BD PostgreSQL aislada.
-- REVISION: se agrego SECURITY DEFINER y revocacion de privilegios por defecto.
-- Probada en PostgreSQL local; roles definitivos y control externo pendientes.

BEGIN;

-- Una sola fila serializa los escritores durante toda su transaccion.
CREATE TABLE public.hu15_cabeza_cadena (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    secuencia bigint NOT NULL,
    hash_actual char(64) NOT NULL
);

INSERT INTO public.hu15_cabeza_cadena (singleton, secuencia, hash_actual)
VALUES (true, 0, repeat('0', 64));

CREATE TABLE public.hu15_sello_auditoria (
    secuencia bigint PRIMARY KEY,
    idauditoria integer NOT NULL UNIQUE REFERENCES public.historialauditoria(idauditoria),
    hash_anterior char(64) NOT NULL,
    hash_actual char(64) NOT NULL,
    version_canonica integer NOT NULL DEFAULT 1 CHECK (version_canonica = 1)
);

-- Supabase puede otorgar privilegios por defecto a roles de API. Los nuevos
-- objetos de control no deben heredar acceso directo de esos roles.
-- No modifica privilegios de tablas existentes ni crea la cuenta de aplicacion.
REVOKE ALL ON TABLE public.hu15_cabeza_cadena, public.hu15_sello_auditoria FROM PUBLIC;
DO $$
DECLARE rol text;
BEGIN
    FOREACH rol IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
            EXECUTE format('REVOKE ALL ON TABLE public.hu15_cabeza_cadena, public.hu15_sello_auditoria FROM %I', rol);
        END IF;
    END LOOP;
END;
$$;

-- El formato canonico usa UTF-8 y campos en base64 para evitar ambiguedad
-- en separadores. La fecha se representa con precision fija de microsegundos.
-- Es compartido por el sellado y por el futuro verificador del backend.
CREATE FUNCTION public.hu15_hash_evento(
    p_secuencia bigint, p_anterior text, p_id integer, p_usuario integer,
    p_fecha timestamp without time zone, p_accion text
) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT encode(extensions.digest(convert_to(
        'HU15-V1|' || p_secuencia::text || '|' || p_anterior || '|' || p_id::text || '|' ||
        CASE WHEN p_usuario IS NULL THEN 'N' ELSE 'V' || p_usuario::text END || '|' ||
        CASE WHEN p_fecha IS NULL THEN 'N' ELSE 'V' || to_char(p_fecha, 'YYYY-MM-DD HH24:MI:SS.US') END || '|' ||
        CASE WHEN p_accion IS NULL THEN 'N' ELSE 'V' || replace(encode(convert_to(p_accion, 'UTF8'), 'base64'), E'\n', '') END,
        'UTF8'), 'sha256'), 'hex');
$$;

CREATE FUNCTION public.hu15_sellado_nuevo_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
    v_secuencia bigint;
    v_anterior text;
    v_actual text;
BEGIN
    -- UPDATE adquiere un bloqueo de fila hasta el fin de la transaccion.
    -- Si la operacion se revierte, tambien se revierten cabeza y sello.
    UPDATE public.hu15_cabeza_cadena
       SET secuencia = secuencia + 1
     WHERE singleton = true
     RETURNING secuencia, hash_actual INTO STRICT v_secuencia, v_anterior;

    v_actual := public.hu15_hash_evento(v_secuencia, v_anterior, NEW.idauditoria,
                                        NEW.idusuario, NEW.fechaaccion, NEW.accion);
    INSERT INTO public.hu15_sello_auditoria
        (secuencia, idauditoria, hash_anterior, hash_actual)
    VALUES (v_secuencia, NEW.idauditoria, v_anterior, v_actual);
    UPDATE public.hu15_cabeza_cadena SET hash_actual = v_actual WHERE singleton = true;
    RETURN NEW;
END;
$$;

CREATE TRIGGER hu15_sellar_evento
AFTER INSERT ON public.historialauditoria
FOR EACH ROW EXECUTE FUNCTION public.hu15_sellado_nuevo_evento();

-- Estas barreras impiden cambios ordinarios, no a propietarios o superusuarios
-- capaces de alterar funciones, triggers o permisos. Revisar la separacion de
-- roles y los permisos de INSERT/UPDATE sobre la cabeza antes de desplegar.
CREATE FUNCTION public.hu15_impedir_cambios() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'El historial de auditoria es de solo insercion';
END;
$$;

CREATE TRIGGER hu15_no_alterar_historial
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.historialauditoria
FOR EACH STATEMENT EXECUTE FUNCTION public.hu15_impedir_cambios();

CREATE TRIGGER hu15_no_alterar_sellos
BEFORE UPDATE OR DELETE OR TRUNCATE ON public.hu15_sello_auditoria
FOR EACH STATEMENT EXECUTE FUNCTION public.hu15_impedir_cambios();

COMMIT;
