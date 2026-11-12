-- Pertenencia explícita; nunca se deduce la carrera de una materia compartida.
CREATE TABLE IF NOT EXISTS estudiante_carrera_plan (
    idusuario integer NOT NULL,
    codsisestudiante integer NOT NULL,
    idcarrera integer NOT NULL REFERENCES carrera_plan(idcarrera),
    PRIMARY KEY (idusuario, codsisestudiante, idcarrera),
    FOREIGN KEY (idusuario, codsisestudiante)
        REFERENCES estudiante(idusuario, codsisestudiante) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_estudiante_carrera_plan_carrera
    ON estudiante_carrera_plan(idcarrera);

-- Solo migra nombres antiguos cuando existe una coincidencia inequívoca.
INSERT INTO estudiante_carrera_plan(idusuario, codsisestudiante, idcarrera)
SELECT c.idusuario, c.codsisestudiante, min(p.idcarrera)
FROM carrera c JOIN carrera_plan p
    ON lower(trim(c.nombrecarrera)) = lower(trim(p.nombre))
JOIN estudiante e ON e.idusuario=c.idusuario AND e.codsisestudiante=c.codsisestudiante
GROUP BY c.idusuario, c.codsisestudiante, lower(trim(c.nombrecarrera))
HAVING count(DISTINCT p.idcarrera)=1
ON CONFLICT DO NOTHING;
