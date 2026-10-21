-- Solo lectura: estado, documentos y reglas de aislamiento por semestre.
SELECT numero,anio,estado,simulado,octet_length(pdf) bytes_pdf,octet_length(pdf_original) bytes_original
FROM semestre ORDER BY anio DESC,numero DESC;
SELECT count(*) semestres_actuales FROM semestre WHERE estado='ACTUAL';
SELECT count(*) grupos_actuales FROM grupo WHERE idsemestre=semestre_actual_id();
SELECT count(*) inscripciones_inconsistentes FROM estudiantegrupo eg JOIN grupo g USING(idgrupo)
WHERE eg.idsemestre<>g.idsemestre OR eg.idasignatura<>g.idasignatura;
SELECT count(*) estudiantes_con_dos_grupos FROM (
 SELECT idusuario,idasignatura,idsemestre FROM estudiantegrupo GROUP BY idusuario,idasignatura,idsemestre HAVING count(*)>1
) repetidos;

SELECT count(DISTINCT dg.idusuario) docentes_vinculados_actual FROM docentegrupo dg JOIN grupo g USING(idgrupo) WHERE g.idsemestre=semestre_actual_id();
SELECT count(DISTINCT eg.idusuario) estudiantes_vinculados_actual FROM estudiantegrupo eg JOIN grupo g USING(idgrupo) WHERE g.idsemestre=semestre_actual_id();
SELECT count(*) grupos_sin_semestre FROM grupo WHERE idsemestre IS NULL;
