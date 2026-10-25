-- Vincula opcionalmente horarios y exámenes con un grupo.
-- La columna se deja nullable para no romper registros históricos ni
-- instalaciones que todavía no hayan asociado cada examen a un grupo.
ALTER TABLE examen
    ADD COLUMN IF NOT EXISTS idgrupo INTEGER;

ALTER TABLE horarioregular
    ADD COLUMN IF NOT EXISTS idgrupo INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_examen_grupo'
    ) THEN
        ALTER TABLE examen
            ADD CONSTRAINT fk_examen_grupo
            FOREIGN KEY (idgrupo) REFERENCES grupo(idgrupo);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_horarioregular_grupo'
    ) THEN
        ALTER TABLE horarioregular
            ADD CONSTRAINT fk_horarioregular_grupo
            FOREIGN KEY (idgrupo) REFERENCES grupo(idgrupo);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_examen_idgrupo ON examen(idgrupo);
CREATE INDEX IF NOT EXISTS idx_horarioregular_idgrupo ON horarioregular(idgrupo);
