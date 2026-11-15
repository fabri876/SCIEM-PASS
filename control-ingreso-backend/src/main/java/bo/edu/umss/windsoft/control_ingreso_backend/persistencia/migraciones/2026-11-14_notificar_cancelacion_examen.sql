-- Aplicar después de 2026-11-14_cancelacion_examen.sql.
-- El evento se confirma o revierte junto con la cancelación del examen.
CREATE OR REPLACE FUNCTION notificar_cancelacion_examen() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.cancelado IS TRUE AND OLD.cancelado IS DISTINCT FROM TRUE THEN
   INSERT INTO notificacion_evento(idexamen,tipo,titulo,descripcion,clave)
   VALUES (NEW.idexamen,'CANCELACION','Examen cancelado',
     'Se canceló el examen. Motivo: '||coalesce(nullif(trim(NEW.motivocancelacion),''),'Consulte con su docente.'),
     'cancelacion:'||NEW.idexamen||':'||txid_current())
   ON CONFLICT(clave) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notificar_cancelacion ON examen;
CREATE TRIGGER notificar_cancelacion AFTER UPDATE OF cancelado ON examen
FOR EACH ROW EXECUTE FUNCTION notificar_cancelacion_examen();

-- Incorporar cancelaciones previas sin modificar exámenes ni inventar su fecha.
INSERT INTO notificacion_evento(idexamen,tipo,titulo,descripcion,fecha,clave)
SELECT e.idexamen,'CANCELACION','Examen cancelado',
 'Se canceló el examen. Motivo: '||coalesce(nullif(trim(e.motivocancelacion),''),'Consulte con su docente.'),
 e.fechacancelacion AT TIME ZONE 'America/La_Paz','cancelacion-previa:'||e.idexamen||':'||e.fechacancelacion::text
FROM examen e WHERE e.cancelado IS TRUE AND e.fechacancelacion IS NOT NULL
AND NOT EXISTS(SELECT 1 FROM notificacion_evento n WHERE n.idexamen=e.idexamen AND n.tipo='CANCELACION')
ON CONFLICT(clave) DO NOTHING;
