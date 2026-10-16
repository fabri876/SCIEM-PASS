-- No elimina ni fusiona personas. Si hay duplicados, toda la migración revierte.
CREATE UNIQUE INDEX IF NOT EXISTS usuario_ci_normalizado_uq ON usuario (upper(regexp_replace(btrim(ciusuario), '[.[:space:]-]', '', 'g')));
CREATE UNIQUE INDEX IF NOT EXISTS usuario_correo_normalizado_uq ON usuario (lower(btrim(correousuario)));
CREATE UNIQUE INDEX IF NOT EXISTS estudiante_codsis_unico_uq ON estudiante (codsisestudiante);
CREATE UNIQUE INDEX IF NOT EXISTS docente_codsis_unico_uq ON docente (codsisdocente);
