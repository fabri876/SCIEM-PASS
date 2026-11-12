-- HU: cambio obligatorio de contraseña inicial.
-- La comparación CI/hash NO se realiza aquí: Argon2id usa sal aleatoria y PostgreSQL
-- no debe conocer ni recalcular el hash. El endpoint administrativo realiza esa
-- identificación una sola vez mediante PasswordEncoder.matches(...).
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN usuario.debe_cambiar_contrasena IS
    'TRUE solo mientras la cuenta conserva el CI como contraseña inicial.';
