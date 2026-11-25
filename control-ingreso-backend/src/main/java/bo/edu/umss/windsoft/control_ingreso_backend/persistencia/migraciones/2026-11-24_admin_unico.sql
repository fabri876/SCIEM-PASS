-- Migracion: un solo administrador en el prototipo.
--
-- Garantiza a nivel de base de datos que la tabla admin tenga como maximo una
-- fila. El indice unico sobre una expresion constante evita agregar columnas y
-- tambien bloquea inserciones concurrentes. No modifica datos de usuario.
--
-- ANTES DE EJECUTAR: debe existir exactamente una fila en admin. Si el sistema
-- tiene administradores de prueba adicionales, conservar la cuenta definitiva y
-- quitar el rol a las demas en una migracion/limpieza aparte. Esta migracion
-- aborta sin cambios si encuentra cualquier otro numero de filas.

BEGIN;

DO $$
DECLARE
    n integer;
BEGIN
    SELECT count(*) INTO n FROM admin;
    IF n <> 1 THEN
        RAISE EXCEPTION
            'Se esperaba exactamente 1 administrador y hay %. Resuelva los administradores restantes antes de aplicar esta migracion.', n;
    END IF;
END $$;

-- Como maximo una fila en admin (y, por tanto, un solo usuario administrador).
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_singleton ON admin ((true));

COMMIT;
