-- REGISTRO: ejecutada por el usuario en Supabase tras un ensayo local.
-- Revisar permisos e integraciones antes de aplicar en cualquier otra base.
-- Elimina acceso directo de anon y authenticated SOLO a historialauditoria.
-- Puede romper clientes o integraciones que consulten esa tabla mediante
-- Data API o usen esos roles de PostgreSQL. No modifica service_role, las
-- demas tablas, los usuarios, RLS ni la cuenta actual del backend.
-- No separa la cuenta propietaria y no establece un punto de control externo.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.historialauditoria') IS NULL THEN
        RAISE EXCEPTION 'No existe public.historialauditoria';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        RAISE EXCEPTION 'Falta alguno de los roles de API esperados';
    END IF;
END;
$$;

REVOKE ALL PRIVILEGES ON TABLE public.historialauditoria FROM anon, authenticated;

-- Comprueba permisos efectivos, incluidos PUBLIC y membresias. Si quedan
-- privilegios de tabla o columna, aborta la transaccion en lugar de prometer
-- una restriccion incompleta. No altera las concesiones que los causen.
DO $$
DECLARE rol text; privilegio text;
BEGIN
    FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        FOREACH privilegio IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
            IF has_table_privilege(rol, 'public.historialauditoria', privilegio) THEN
                RAISE EXCEPTION 'El rol % conserva el privilegio efectivo %; revisar herencias', rol, privilegio;
            END IF;
        END LOOP;
        FOREACH privilegio IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
            IF has_any_column_privilege(rol, 'public.historialauditoria', privilegio) THEN
                RAISE EXCEPTION 'El rol % conserva el privilegio de columna %; revisar concesiones', rol, privilegio;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;
COMMIT;
