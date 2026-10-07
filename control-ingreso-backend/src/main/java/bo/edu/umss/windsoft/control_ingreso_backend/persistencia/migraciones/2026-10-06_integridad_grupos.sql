-- Aplicar en una transacción. No elimina tablas ni datos; conservar las relaciones antiguas.
-- Las tablas creadas previamente por Hibernate no se corrigen con CREATE TABLE IF NOT EXISTS.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.asignatura ADD COLUMN IF NOT EXISTS codigooficial VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS uk_asignatura_codigooficial ON public.asignatura (codigooficial);

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('grupo', 'fk_grupo_asignatura', 'FOREIGN KEY (idasignatura) REFERENCES public.asignatura(idasignatura)'),
        ('docentegrupo', 'fk_docentegrupo_docente', 'FOREIGN KEY (idusuario, codsisdocente) REFERENCES public.docente(idusuario, codsisdocente)'),
        ('docentegrupo', 'fk_docentegrupo_grupo', 'FOREIGN KEY (idgrupo) REFERENCES public.grupo(idgrupo)'),
        ('estudiantegrupo', 'fk_estudiantegrupo_estudiante', 'FOREIGN KEY (idusuario, codsisestudiante) REFERENCES public.estudiante(idusuario, codsisestudiante)'),
        ('estudiantegrupo', 'fk_estudiantegrupo_grupo', 'FOREIGN KEY (idgrupo) REFERENCES public.grupo(idgrupo)'),
        ('ayudantegrupo', 'fk_ayudantegrupo_usuario', 'FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)'),
        ('ayudantegrupo', 'fk_ayudantegrupo_grupo', 'FOREIGN KEY (idgrupo) REFERENCES public.grupo(idgrupo)'),
        ('docentegrupo', 'uk_docente_grupo', 'UNIQUE (idusuario, idgrupo)'),
        ('estudiantegrupo', 'uk_estudiante_grupo', 'UNIQUE (idusuario, idgrupo)'),
        ('ayudantegrupo', 'uk_ayudante_grupo', 'UNIQUE (idusuario, idgrupo)')
    ) AS reglas(tabla, nombre, definicion)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = format('public.%I', r.tabla)::regclass AND conname = r.nombre) THEN
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', r.tabla, r.nombre, r.definicion);
        END IF;
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_grupo_nombre_normalizado
    ON public.grupo (idasignatura, upper(btrim(nombregrupo)));

ALTER TABLE public.grupo ALTER COLUMN estadogrupo SET DEFAULT true;
ALTER TABLE public.estudiantegrupo ALTER COLUMN fechainscripcion SET DEFAULT CURRENT_TIMESTAMP;

-- Ayudante tiene clave compuesta en el modelo heredado. La FK conserva usuario;
-- el servicio valida además que exista el rol ayudante.
-- Si existieran relaciones inválidas o duplicadas, la transacción falla sin borrarlas.
