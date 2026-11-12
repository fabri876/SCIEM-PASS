-- Aplicar después de las dos migraciones de pertenencia del mismo día.
-- Aborta si aparecen datos antiguos: jamás borra registros sin migrarlos.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM carrera) OR EXISTS(SELECT 1 FROM tiene3)
    OR EXISTS(SELECT 1 FROM estudiante_carrera_plan) THEN
   RAISE EXCEPTION 'Existen datos legacy de carrera; revisar y migrar antes de retirar las tablas.';
 END IF;
END $$;
-- RESTRICT por defecto: cualquier dependencia inesperada impide la limpieza.
DROP TABLE tiene3;
DROP TABLE carrera;
DROP TABLE estudiante_carrera_plan;
