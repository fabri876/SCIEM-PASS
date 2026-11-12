CREATE TABLE IF NOT EXISTS usuario_carrera_plan (
 idusuario integer NOT NULL REFERENCES usuario(idusuario) ON DELETE CASCADE,
 idcarrera integer NOT NULL REFERENCES carrera_plan(idcarrera),
 origen varchar(30) NOT NULL DEFAULT 'REGISTRO',
 PRIMARY KEY(idusuario,idcarrera)
);
INSERT INTO usuario_carrera_plan(idusuario,idcarrera,origen)
SELECT idusuario,idcarrera,'REGISTRO' FROM estudiante_carrera_plan ON CONFLICT DO NOTHING;

-- Docentes y ayudantes: carreras donde efectivamente tienen grupos asignados.
INSERT INTO usuario_carrera_plan(idusuario,idcarrera,origen)
SELECT DISTINCT v.idusuario,c.idcarrera,'GRUPOS'
FROM (SELECT idusuario,idgrupo FROM docentegrupo UNION SELECT idusuario,idgrupo FROM ayudantegrupo) v
JOIN grupo g USING(idgrupo)
JOIN asignatura_carrera_nivel c ON c.idasignatura=g.idasignatura AND c.idsemestre=g.idsemestre
WHERE g.idsemestre=semestre_actual_id()
AND NOT EXISTS(SELECT 1 FROM admin a WHERE a.idusuario=v.idusuario)
ON CONFLICT DO NOTHING;

-- Estudiantes: una sola carrera compatible con TODAS sus materias actuales.
WITH materias AS (
 SELECT DISTINCT e.idusuario,g.idasignatura,g.idsemestre
 FROM estudiantegrupo e JOIN grupo g USING(idgrupo)
 WHERE g.idsemestre=semestre_actual_id()
), candidatas AS (
 SELECT m.idusuario,c.idcarrera FROM materias m
 JOIN asignatura_carrera_nivel c USING(idasignatura,idsemestre)
 GROUP BY m.idusuario,c.idcarrera
 HAVING count(DISTINCT m.idasignatura)=(SELECT count(*) FROM materias x WHERE x.idusuario=m.idusuario)
), unicas AS (
 SELECT idusuario,min(idcarrera) AS idcarrera FROM candidatas GROUP BY idusuario HAVING count(*)=1
)
INSERT INTO usuario_carrera_plan(idusuario,idcarrera,origen)
SELECT idusuario,idcarrera,'INFERENCIA_UNICA' FROM unicas
WHERE NOT EXISTS(SELECT 1 FROM usuario_carrera_plan u WHERE u.idusuario=unicas.idusuario)
ON CONFLICT DO NOTHING;
