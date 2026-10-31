-- Ejecutar dentro de una transaccion. No borra cuentas, grupos ni registros historicos.
SET LOCAL lock_timeout='8s';
ALTER TABLE semestre ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE semestre ADD COLUMN IF NOT EXISTS fecha_fin DATE;
ALTER TABLE semestre ADD COLUMN IF NOT EXISTS archivado_en TIMESTAMPTZ;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='ck_semestre_fechas' AND conrelid='semestre'::regclass) THEN
  ALTER TABLE semestre ADD CONSTRAINT ck_semestre_fechas CHECK(
   (fecha_inicio IS NULL AND fecha_fin IS NULL) OR
   (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_inicio<=fecha_fin));
 END IF;
END $$;
-- Fechas provisionales autorizadas por administracion; no reemplazar fechas ya configuradas.
UPDATE semestre SET fecha_inicio=DATE '2026-08-01',fecha_fin=DATE '2026-12-13'
 WHERE anio=2026 AND numero=2 AND estado='ACTUAL' AND fecha_inicio IS NULL AND fecha_fin IS NULL;

CREATE OR REPLACE FUNCTION validar_vigencia_semestre() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE periodo INTEGER; inicio DATE; fin DATE; archivado TIMESTAMPTZ; hoy DATE;
BEGIN
 hoy=(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::DATE;
 IF TG_TABLE_NAME IN ('grupo','examen','horarioregular') THEN
  IF TG_OP='DELETE' THEN periodo=OLD.idsemestre; ELSE periodo=NEW.idsemestre; END IF;
 ELSE
  IF TG_OP='DELETE' THEN SELECT idsemestre INTO periodo FROM grupo WHERE idgrupo=OLD.idgrupo;
  ELSE SELECT idsemestre INTO periodo FROM grupo WHERE idgrupo=NEW.idgrupo; END IF;
 END IF;
 SELECT fecha_inicio,fecha_fin,archivado_en INTO inicio,fin,archivado FROM semestre WHERE idsemestre=periodo FOR SHARE;
 IF archivado IS NOT NULL OR (fin IS NOT NULL AND hoy>fin) THEN
  RAISE EXCEPTION 'El semestre finalizo. Abra el siguiente semestre para registrar o modificar asignaciones.' USING ERRCODE='23514';
 END IF;
 -- Se permite preparar el catalogo antes del inicio; las fechas no son ventanas de matriculacion.
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['grupo','examen','horarioregular','docentegrupo','estudiantegrupo','ayudantegrupo'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS validar_vigencia ON %I',t);
  EXECUTE format('CREATE TRIGGER validar_vigencia BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION validar_vigencia_semestre()',t);
 END LOOP;
END $$;
