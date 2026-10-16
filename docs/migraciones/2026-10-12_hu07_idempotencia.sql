-- HU07: identificador único de una marcación creada offline.
-- Ejecutar después de verificar que no existan duplicados en una eventual
-- columna client_uuid creada previamente.
ALTER TABLE ingreso
    ADD COLUMN IF NOT EXISTS client_uuid VARCHAR(100) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ingreso_client_uuid
    ON ingreso (client_uuid)
    WHERE client_uuid IS NOT NULL;
