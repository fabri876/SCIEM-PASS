-- =============================================================================
-- Migración: registrar la acción aplicada en una incidencia (HU06 / HU19)
-- Fecha: 2026-11-14
--
-- Por qué: la incidencia antes solo guardaba tipo y severidad. Ahora también
-- registra la ACCIÓN disciplinaria aplicada (advertencia verbal/escrita, cambio
-- de asiento, retiro de material, descuento de puntaje, anulación de pregunta o
-- de examen, otro), el puntaje descontado y dos textos libres para cuando el
-- tipo o la acción elegidos son "OTRO".
--
-- Estado: YA APLICADA en Supabase el 2026-11-14. El script es idempotente, así
-- que puede ejecutarse de nuevo sin efectos secundarios, y sirve para recrear
-- la base desde cero (por ejemplo, en el servidor del Laboratorio DIS).
--
-- Cómo ejecutar: Supabase > SQL Editor (o psql), pegar y ejecutar.
-- Hacerlo ANTES de levantar el backend con este código: la aplicación usa
-- spring.jpa.hibernate.ddl-auto=validate y no arranca si falta una columna.
-- =============================================================================

BEGIN;

-- 1 · Acción aplicada. Se guarda el nombre del enum AccionIncidencia como texto.
--     NOT NULL con DEFAULT para que las filas históricas queden como 'REGISTRO'.
ALTER TABLE public.incidencia
    ADD COLUMN IF NOT EXISTS accion VARCHAR(50) NOT NULL DEFAULT 'REGISTRO';

-- 2 · Puntaje descontado por la incidencia. double precision = Double en Java.
--     (No usar numeric: el entity mapea Double y Hibernate valida el tipo.)
ALTER TABLE public.incidencia
    ADD COLUMN IF NOT EXISTS puntaje_reducir DOUBLE PRECISION;

-- 3 · Texto libre cuando el tipo de incidencia es OTRO.
ALTER TABLE public.incidencia
    ADD COLUMN IF NOT EXISTS detalletipootro VARCHAR(255);

-- 4 · Texto libre cuando la acción aplicada es OTRO.
ALTER TABLE public.incidencia
    ADD COLUMN IF NOT EXISTS detalleaccionotro VARCHAR(255);

-- 5 · Restricción de valores válidos para accion, alineada con AccionIncidencia.
--     PostgreSQL no soporta "ADD CONSTRAINT IF NOT EXISTS", de ahí el bloque DO.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_incidencia_accion'
          AND conrelid = 'public.incidencia'::regclass
    ) THEN
        ALTER TABLE public.incidencia
            ADD CONSTRAINT ck_incidencia_accion CHECK (accion IN (
                'REGISTRO',
                'ADVERTENCIA_VERBAL',
                'ADVERTENCIA_ESCRITA',
                'CAMBIO_ASIENTO',
                'RETIRO_MATERIAL',
                'DESCUENTO_PUNTAJE',
                'ANULACION_PREGUNTA',
                'ANULACION_EXAMEN',
                'OTRO'
            ));
    END IF;
END
$$;

COMMIT;

-- =============================================================================
-- Verificación (solo lectura). Esperado: las 4 columnas presentes; accion con
-- is_nullable = NO y column_default = 'REGISTRO'.
-- =============================================================================
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'incidencia'
  AND column_name IN ('accion', 'puntaje_reducir', 'detalletipootro', 'detalleaccionotro')
ORDER BY column_name;
