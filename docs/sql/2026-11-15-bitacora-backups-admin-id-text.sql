BEGIN;

ALTER TABLE public.bitacora_backups
  ALTER COLUMN admin_id TYPE text
  USING admin_id::text;

COMMIT;
