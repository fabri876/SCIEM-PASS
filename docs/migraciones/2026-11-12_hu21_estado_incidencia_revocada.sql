-- =============================================================================
-- Migración: estado REVOCADA para las incidencias (HU21)
-- Fecha: 2026-11-12 · HU21 · Sprint 4
--
-- Por qué:
-- Revocar una incidencia es "cancelarla": deja de estar en vigor pero no se
-- borra ni se reabre. Hasta ahora el estado de una incidencia solo podía ser
-- ABIERTA, EN_REVISION o CERRADA, así que una revocación se guardaba como
-- CERRADA y se perdía la distinction entre "resuelta" y "cancelada".
--
-- El enum del backend (EstadoIncidencia) ya incluye REVOCADA, pero la base
-- tiene el CHECK "ck_incidencia_estado", que solo admite esos tres valores.
-- Sin esta migración, PostgreSQL rechaza el UPDATE de una incidencia
-- revocada (error de violación de constraint).
--
-- Estado real de la BD (verificado el 2026-11-12):
--   incidencia.estadoincidencia -> character varying(255), NOT NULL
--   constraint: ck_incidencia_estado CHECK (estadoincidencia IN
--                ('ABIERTA','EN_REVISION','CERRADA'))
--
-- Cómo ejecutar: Supabase > SQL Editor. Ejecutar cada consulta POR SEPARADO
-- (el editor solo muestra el resultado de la última). Hacerlo en CADA base
-- que use el backend, ANTES de levantar el backend con el código nuevo.
--
-- ESTADO: APLICADA el 2026-11-12 en la base de Supabase de desarrollo
-- (aws-0-sa-east-1). Verificado: el CHECK acepta REVOCADA y el conteo por
-- estado no cambió (8 ABIERTA, 4 EN_REVISION, 11 CERRADA). Falta aplicarla en
-- CUALQUIER otra base que use el backend (por ejemplo la del servidor del
-- Laboratorio DIS en producción).
-- =============================================================================


-- PASO 1 — Diagnóstico (solo lectura)

-- 1a. Tipo y tamaño de la columna. Esperado: character varying, 255, NOT NULL
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'incidencia'
  AND column_name  = 'estadoincidencia';

-- 1b. Restricción actual. Se espera que solo admita los tres estados viejos.
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.incidencia'::regclass
  AND contype  = 'c'
  AND conname  = 'ck_incidencia_estado';

-- 1c. Conteo por estado (para comparar antes y después).
SELECT estadoincidencia, COUNT(*) AS total
FROM public.incidencia
GROUP BY estadoincidencia
ORDER BY estadoincidencia;


-- PASO 2 — Migración (escribe)

-- 2a. Se agrega el valor REVOCADA al CHECK.
--     DROP + ADD porque en PostgreSQL no se puede ampliar un CHECK en sitio:
--     hay que reemplazarlo.
ALTER TABLE public.incidencia
  DROP CONSTRAINT IF EXISTS ck_incidencia_estado;

ALTER TABLE public.incidencia
  ADD CONSTRAINT ck_incidencia_estado
  CHECK (estadoincidencia IN ('ABIERTA', 'EN_REVISION', 'CERRADA', 'REVOCADA'));


-- PASO 3 — Verificación (solo lectura)

-- 3a. La restricción nueva debe incluir REVOCADA.
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.incidencia'::regclass
  AND contype  = 'c'
  AND conname  = 'ck_incidencia_estado';

-- 3b. Prueba de escritura: se toma una incidencia cerrada, se revoca y se
--     revierte. Si el CHECK no acepta el valor, la transacción falla y no
--     queda nada escrito (por eso va dentro de BEGIN/ROLLBACK).
BEGIN;
  UPDATE public.incidencia
     SET estadoincidencia = 'REVOCADA'
   WHERE idincidencia = (
     SELECT idincidencia FROM public.incidencia
      WHERE estadoincidencia = 'CERRADA'
      ORDER BY idincidencia DESC LIMIT 1
   );
  -- Debe devolver 1 fila.
  SELECT estadoincidencia FROM public.incidencia
   WHERE estadoincidencia = 'REVOCADA';
ROLLBACK;

-- 3c. Conteo final: la distribución debe ser la misma que en el paso 1c
--     (el paso 3b se revierte con el ROLLBACK).
SELECT estadoincidencia, COUNT(*) AS total
FROM public.incidencia
GROUP BY estadoincidencia
ORDER BY estadoincidencia;
