-- HU22: ejecutar manualmente en PostgreSQL/Supabase ANTES de desplegar el backend.
-- No ejecutar desde la aplicación.
BEGIN;

CREATE TABLE IF NOT EXISTS public.face_consentimiento (
    idconsentimiento SERIAL PRIMARY KEY,
    idusuario INTEGER NOT NULL REFERENCES public.usuario(idusuario),
    aceptado_en TIMESTAMP NOT NULL,
    version_terminos VARCHAR(40) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_face_consentimiento_usuario_fecha
    ON public.face_consentimiento (idusuario, aceptado_en DESC);

CREATE TABLE IF NOT EXISTS public.face_verificacion_estudiante (
    idverificacion SERIAL PRIMARY KEY,
    idusuario INTEGER NOT NULL REFERENCES public.usuario(idusuario),
    idexamen INTEGER NOT NULL REFERENCES public.examen(idexamen),
    resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('AUTORIZADO', 'RECHAZADO')),
    score DOUBLE PRECISION,
    liveness_score DOUBLE PRECISION,
    verificado_en TIMESTAMP NOT NULL,
    vence_en TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS ix_face_verificacion_estudiante_examen
    ON public.face_verificacion_estudiante (idusuario, idexamen, resultado, verificado_en DESC);

-- El flujo de re-enrolamiento usa un estado intermedio. Las instalaciones que
-- ya tenian una restriccion solo para activo/bloqueado deben actualizarla.
-- Se eliminan exclusivamente los CHECK de la columna estado de esta tabla,
-- sin tocar datos ni otras restricciones.
ALTER TABLE public.face_enrollment
    ALTER COLUMN estado TYPE VARCHAR(30);

DO $$
DECLARE
    restriccion RECORD;
BEGIN
    FOR restriccion IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.face_enrollment'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%estado%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.face_enrollment DROP CONSTRAINT %I',
            restriccion.conname
        );
    END LOOP;
END $$;

ALTER TABLE public.face_enrollment
    ADD CONSTRAINT ck_face_enrollment_estado
    CHECK (estado IN ('activo', 'bloqueado', 'pendiente_reenrolamiento'));

COMMIT;
