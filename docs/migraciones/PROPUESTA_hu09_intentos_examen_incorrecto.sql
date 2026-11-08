-- REGISTRO HU09: aplicada por el equipo en Supabase el 2026-11-07 y probada en PostgreSQL local.
-- No volver a ejecutar en una base donde ya existan los objetos HU09.
-- Conserva los intentos existentes; no inventa metodo, destino ni solicitudes.
-- Requiere respaldo, revision de permisos y ventana coordinada con el equipo.
BEGIN;

ALTER TABLE public.intentosnoautorizados
    ADD COLUMN hu09_solicitud uuid,
    ADD COLUMN hu09_metodo varchar(8),
    ADD COLUMN hu09_asignatura_destino integer,
    ADD COLUMN hu09_examen_destino integer,
    ADD COLUMN hu09_ambiente_destino integer;

-- Mantiene los tres motivos usados por HU10 y agrega el nuevo motivo HU09.
ALTER TABLE public.intentosnoautorizados DROP CONSTRAINT ck_intento_motivo;
ALTER TABLE public.intentosnoautorizados ADD CONSTRAINT ck_intento_motivo
    CHECK (motivointento IN ('DUPLICADO', 'AMBIENTE_DIFERENTE', 'INHABILITADO', 'EXAMEN_INCORRECTO'));

ALTER TABLE public.intentosnoautorizados
    ADD CONSTRAINT ck_hu09_destino_completo CHECK (
        (hu09_asignatura_destino IS NULL AND hu09_examen_destino IS NULL AND hu09_ambiente_destino IS NULL)
        OR (hu09_asignatura_destino IS NOT NULL AND hu09_examen_destino IS NOT NULL)
    ),
    ADD CONSTRAINT ck_hu09_datos_minimos CHECK (
        motivointento <> 'EXAMEN_INCORRECTO' OR
        (hu09_solicitud IS NOT NULL AND hu09_metodo IS NOT NULL AND hu09_metodo IN ('QR', 'SIS', 'CI'))
    ),
    ADD CONSTRAINT fk_hu09_examen_destino FOREIGN KEY (hu09_asignatura_destino, hu09_examen_destino)
        REFERENCES public.examen (idasignatura, idexamen),
    ADD CONSTRAINT fk_hu09_ambiente_destino FOREIGN KEY (hu09_ambiente_destino)
        REFERENCES public.ambiente (idambiente);

-- Las verificaciones independientes usan UUID distintos; los reintentos de la
-- misma peticion comparten UUID. Los registros anteriores mantienen NULL.
CREATE UNIQUE INDEX ux_hu09_solicitud ON public.intentosnoautorizados (hu09_solicitud)
    WHERE hu09_solicitud IS NOT NULL;

COMMIT;
