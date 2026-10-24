-- Modalidad elegida para atender a los estudiantes de cada aula.
-- Ejecutar antes de desplegar el backend que incluye el campo JPA.
ALTER TABLE public.ayudante_examen
    ADD COLUMN IF NOT EXISTS modo_asignacion varchar(15) NOT NULL DEFAULT 'SUBDIVISION';

ALTER TABLE public.ayudante_examen
    ADD COLUMN IF NOT EXISTS apellido_desde varchar(1),
    ADD COLUMN IF NOT EXISTS apellido_hasta varchar(1);

COMMENT ON COLUMN public.ayudante_examen.modo_asignacion IS
    'ONLINE: todos los operadores atienden el aula; SUBDIVISION: se divide por apellido';
