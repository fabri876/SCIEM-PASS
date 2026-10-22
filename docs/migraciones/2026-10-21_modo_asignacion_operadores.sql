-- Modalidad elegida para atender a los estudiantes de cada aula.
-- Ejecutar antes de desplegar el backend que incluye el campo JPA.
ALTER TABLE public.ayudante_examen
    ADD COLUMN IF NOT EXISTS modo_asignacion varchar(15) NOT NULL DEFAULT 'SUBDIVISION';

COMMENT ON COLUMN public.ayudante_examen.modo_asignacion IS
    'ONLINE: todos los operadores atienden el aula; SUBDIVISION: se divide por apellido';
