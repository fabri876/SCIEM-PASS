-- =============================================================================
-- Migración: ampliar historialauditoria.accion de varchar(255) a TEXT
-- Fecha: 2026-10-18 · BUG-030
--
-- Por qué: al rechazar un ingreso excepcional (duplicado, aula llena, ingreso
-- cerrado), el texto de auditoría incluye el correo del ejecutor, el correo
-- del estudiante, la asignatura, el examen, el aula, el motivo y la IP.
-- Todo eso concatenado supera fácilmente los 255 caracteres, y PostgreSQL
-- rechaza el INSERT con "value too long for type character varying(255)".
-- Como la auditoría se registra en la misma transacción (o en una REQUIRES_NEW
-- que ya marcó rollback-only), toda la operación falla y el intento no queda
-- registrado ni en la auditoría ni como error legible para el usuario.
--
-- Solución: cambiar la columna a TEXT (sin límite fijo). PostgreSQL no
-- necesita reescribir la tabla para este cambio; solo actualiza el catálogo.
--
-- Cómo ejecutar: Supabase > SQL Editor, pegar y ejecutar UNA vez.
-- Hacerlo ANTES de levantar el backend con el código corregido.
-- =============================================================================

-- PASO 1 · Diagnóstico (solo lectura)
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'historialauditoria'
  AND column_name  = 'accion';

-- PASO 2 · Migración
ALTER TABLE public.historialauditoria
    ALTER COLUMN accion TYPE TEXT;

-- PASO 3 · Verificación (solo lectura)
-- Esperado: data_type = 'text', character_maximum_length = NULL
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'historialauditoria'
  AND column_name  = 'accion';
