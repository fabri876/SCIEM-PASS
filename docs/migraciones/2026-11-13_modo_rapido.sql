-- Modo rápido: el CHECK debe cubrir todos los motivos que usa el enum Java.
-- Ejecutar una vez en PostgreSQL/Supabase antes de desplegar el backend.
-- No borra ni modifica filas. La transacción garantiza que, si una fila
-- histórica tuviera un valor no permitido, se conserva el CHECK anterior.
BEGIN;

-- Algunas bases antiguas crearon el CHECK sin nombre explícito
-- (por ejemplo, ingreso_motivoexcepcion_check). Se elimina únicamente el
-- CHECK que menciona motivoexcepcion; no afecta datos ni otras restricciones.
DO $$
DECLARE
    restriccion RECORD;
BEGIN
    FOR restriccion IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.ingreso'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%motivoexcepcion%'
    LOOP
        EXECUTE format('ALTER TABLE public.ingreso DROP CONSTRAINT %I', restriccion.conname);
    END LOOP;
END $$;

ALTER TABLE public.ingreso ADD CONSTRAINT ck_ingreso_motivo CHECK (
    motivoexcepcion IS NULL OR motivoexcepcion IN (
        'SIN_CARNET_QR',
        'NO_FIGURA_EN_LISTA',
        'LLEGADA_TARDIA',
        'TRASLADO_AULA',
        'FALLO_FACIAL',
        'SIN_ENROLAMIENTO_FACIAL',
        'MODO_RAPIDO'
    )
);

COMMIT;
