-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin (
  idusuario integer NOT NULL,
  idadmin integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT admin_pkey PRIMARY KEY (idusuario, idadmin),
  CONSTRAINT fk_admin_puede_ser_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.ambiente (
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  nombreambiente text,
  ubicacionambiente text,
  capacidadambiente integer,
  idhorarioregular integer,
  idaula integer NOT NULL,
  horainicio time without time zone NOT NULL,
  horafin time without time zone NOT NULL,
  tipohorario character varying NOT NULL CHECK (tipohorario::text = ANY (ARRAY['REGULAR'::character varying, 'EVENTUAL'::character varying]::text[])),
  idambiente integer NOT NULL DEFAULT nextval('ambiente_idambiente_seq'::regclass),
  CONSTRAINT ambiente_pkey PRIMARY KEY (idambiente),
  CONSTRAINT fk_ambiente_aula FOREIGN KEY (idaula) REFERENCES public.aula(idaula),
  CONSTRAINT fk_ambiente_horarioregular FOREIGN KEY (idhorarioregular) REFERENCES public.horarioregular(idhorarioregular),
  CONSTRAINT fk_ambiente_examen FOREIGN KEY (idasignatura) REFERENCES public.examen(idasignatura),
  CONSTRAINT fk_ambiente_examen FOREIGN KEY (idexamen) REFERENCES public.examen(idexamen)
);
CREATE TABLE public.asignatura (
  idasignatura integer NOT NULL,
  idinscripcion integer NOT NULL,
  nombreasignatura text,
  siglaasignatura text,
  CONSTRAINT asignatura_pkey PRIMARY KEY (idasignatura),
  CONSTRAINT fk_asignatu_tiene4_inscrito FOREIGN KEY (idinscripcion) REFERENCES public.inscrito(idinscripcion)
);
CREATE TABLE public.ayudante (
  idusuario integer NOT NULL,
  idayudante integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT ayudante_pkey PRIMARY KEY (idusuario, idayudante),
  CONSTRAINT fk_ayudante_puede_ser_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.cambioambiente (
  idcambio integer NOT NULL,
  idambiente integer NOT NULL,
  idusuario integer,
  codsisestudiante integer,
  motivocambio text,
  fechacambio date,
  CONSTRAINT cambioambiente_pkey PRIMARY KEY (idcambio),
  CONSTRAINT fk_cambioam_designado_estudian FOREIGN KEY (idusuario) REFERENCES public.estudiante(idusuario),
  CONSTRAINT fk_cambioam_designado_estudian FOREIGN KEY (codsisestudiante) REFERENCES public.estudiante(codsisestudiante),
  CONSTRAINT fk_cambioam_puede_cam_ambiente FOREIGN KEY (idambiente) REFERENCES public.ambiente(idambiente)
);
CREATE TABLE public.carrera (
  idfacultad integer NOT NULL,
  idcarrera integer NOT NULL,
  idusuario integer,
  codsisestudiante integer,
  nombrecarrera text,
  CONSTRAINT carrera_pkey PRIMARY KEY (idfacultad, idcarrera),
  CONSTRAINT fk_carrera_pertenece_estudian FOREIGN KEY (idusuario) REFERENCES public.estudiante(idusuario),
  CONSTRAINT fk_carrera_pertenece_estudian FOREIGN KEY (codsisestudiante) REFERENCES public.estudiante(codsisestudiante),
  CONSTRAINT fk_carrera_tiene2_facultad FOREIGN KEY (idfacultad) REFERENCES public.facultad(idfacultad)
);
CREATE TABLE public.credencial (
  idcredencial integer NOT NULL,
  idusuario integer NOT NULL,
  codigoqr text,
  fechacreacioncredencial date,
  CONSTRAINT credencial_pkey PRIMARY KEY (idcredencial),
  CONSTRAINT fk_credenci_debe_tene_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.docente (
  idusuario integer NOT NULL,
  codsisdocente integer NOT NULL,
  CONSTRAINT docente_pkey PRIMARY KEY (idusuario, codsisdocente),
  CONSTRAINT fk_docente_puede_ser_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.docenteasignatura (
  idusuario integer NOT NULL,
  codsisdocente integer NOT NULL,
  idasignatura integer NOT NULL,
  CONSTRAINT docenteasignatura_pkey PRIMARY KEY (idusuario, codsisdocente, idasignatura),
  CONSTRAINT fk_docentea_docenteas_asignatu FOREIGN KEY (idasignatura) REFERENCES public.asignatura(idasignatura),
  CONSTRAINT fk_docentea_docenteas_docente FOREIGN KEY (idusuario) REFERENCES public.docente(idusuario),
  CONSTRAINT fk_docentea_docenteas_docente FOREIGN KEY (codsisdocente) REFERENCES public.docente(codsisdocente)
);
CREATE TABLE public.estudiante (
  idusuario integer NOT NULL,
  codsisestudiante integer NOT NULL,
  idcambio integer,
  CONSTRAINT estudiante_pkey PRIMARY KEY (idusuario, codsisestudiante),
  CONSTRAINT fk_estudian_designado_cambioam FOREIGN KEY (idcambio) REFERENCES public.cambioambiente(idcambio),
  CONSTRAINT fk_estudian_puede_ser_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.examen (
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  fechaexamen date,
  duracionexamen time without time zone,
  fechacreacionexamen date,
  normasexamen text,
  estadoexamen boolean,
  CONSTRAINT examen_pkey PRIMARY KEY (idasignatura, idexamen),
  CONSTRAINT fk_examen_tiene_asignatu FOREIGN KEY (idasignatura) REFERENCES public.asignatura(idasignatura)
);
CREATE TABLE public.expulsion (
  idexpulsion integer NOT NULL,
  idingreso integer NOT NULL,
  idusuario integer NOT NULL,
  motivoexpulsion text,
  fechaexpulsion date,
  CONSTRAINT expulsion_pkey PRIMARY KEY (idexpulsion),
  CONSTRAINT fk_expulsio_podria_te_ingreso FOREIGN KEY (idingreso) REFERENCES public.ingreso(idingreso),
  CONSTRAINT fk_expulsio_puede_ser_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.facultad (
  idfacultad integer NOT NULL,
  nombrefacultad text,
  CONSTRAINT facultad_pkey PRIMARY KEY (idfacultad)
);
CREATE TABLE public.habilitacion (
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  idhabilitacion integer NOT NULL,
  idusuario integer NOT NULL,
  codsisestudiante integer NOT NULL,
  estadohabilitacion boolean,
  observacionhabilitacion text,
  fecharegistro date,
  CONSTRAINT habilitacion_pkey PRIMARY KEY (idasignatura, idexamen, idhabilitacion),
  CONSTRAINT fk_habilita_debe_tene_examen FOREIGN KEY (idasignatura) REFERENCES public.examen(idasignatura),
  CONSTRAINT fk_habilita_debe_tene_examen FOREIGN KEY (idexamen) REFERENCES public.examen(idexamen),
  CONSTRAINT fk_habilita_puede_ten_estudian FOREIGN KEY (idusuario) REFERENCES public.estudiante(idusuario),
  CONSTRAINT fk_habilita_puede_ten_estudian FOREIGN KEY (codsisestudiante) REFERENCES public.estudiante(codsisestudiante)
);
CREATE TABLE public.historialauditoria (
  idusuario integer,
  accion text,
  fechaaccion timestamp without time zone,
  idauditoria integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT historialauditoria_pkey PRIMARY KEY (idauditoria),
  CONSTRAINT fk_historia_puede_ten_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.ingreso (
  idingreso integer NOT NULL,
  est_idusuario integer NOT NULL,
  codsisestudiante integer NOT NULL,
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  idambiente integer NOT NULL,
  idusuario integer NOT NULL,
  idexpulsion integer,
  fechaingreso date,
  observacioningreso text,
  CONSTRAINT ingreso_pkey PRIMARY KEY (idingreso),
  CONSTRAINT fk_ingreso_podria_te_expulsio FOREIGN KEY (idexpulsion) REFERENCES public.expulsion(idexpulsion),
  CONSTRAINT fk_ingreso_puede_ten_estudian FOREIGN KEY (est_idusuario) REFERENCES public.estudiante(idusuario),
  CONSTRAINT fk_ingreso_puede_ten_estudian FOREIGN KEY (codsisestudiante) REFERENCES public.estudiante(codsisestudiante),
  CONSTRAINT fk_ingreso_puede_ten_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario),
  CONSTRAINT fk_ingreso_tiene6_examen FOREIGN KEY (idasignatura) REFERENCES public.examen(idasignatura),
  CONSTRAINT fk_ingreso_tiene6_examen FOREIGN KEY (idexamen) REFERENCES public.examen(idexamen),
  CONSTRAINT fk_ingreso_tiene7_ambiente FOREIGN KEY (idambiente) REFERENCES public.ambiente(idambiente)
);
CREATE TABLE public.inscrito (
  idinscripcion integer NOT NULL,
  idusuario integer NOT NULL,
  codsisestudiante integer NOT NULL,
  gestioninscripcion text,
  CONSTRAINT inscrito_pkey PRIMARY KEY (idinscripcion),
  CONSTRAINT fk_inscrito_puede_est_estudian FOREIGN KEY (idusuario) REFERENCES public.estudiante(idusuario),
  CONSTRAINT fk_inscrito_puede_est_estudian FOREIGN KEY (codsisestudiante) REFERENCES public.estudiante(codsisestudiante)
);
CREATE TABLE public.intentosnoautorizados (
  idintento integer NOT NULL,
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  idusuario integer NOT NULL,
  est_idusuario integer NOT NULL,
  codsisestudiante integer NOT NULL,
  fechaintento date,
  CONSTRAINT intentosnoautorizados_pkey PRIMARY KEY (idintento),
  CONSTRAINT fk_intentos_puede_ten_examen FOREIGN KEY (idasignatura) REFERENCES public.examen(idasignatura),
  CONSTRAINT fk_intentos_puede_ten_examen FOREIGN KEY (idexamen) REFERENCES public.examen(idexamen),
  CONSTRAINT fk_intentos_puede_ten_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario),
  CONSTRAINT fk_intentos_puede_ten_estudian FOREIGN KEY (est_idusuario) REFERENCES public.estudiante(idusuario),
  CONSTRAINT fk_intentos_puede_ten_estudian FOREIGN KEY (codsisestudiante) REFERENCES public.estudiante(codsisestudiante)
);
CREATE TABLE public.motivoinhabilitacion (
  idmotivo integer NOT NULL UNIQUE,
  nombremotivo text,
  descripcionhabilitacion text
);
CREATE TABLE public.tiene3 (
  idasignatura integer NOT NULL,
  idfacultad integer NOT NULL,
  idcarrera integer NOT NULL,
  CONSTRAINT tiene3_pkey PRIMARY KEY (idasignatura, idfacultad, idcarrera),
  CONSTRAINT fk_tiene3_tiene3_asignatu FOREIGN KEY (idasignatura) REFERENCES public.asignatura(idasignatura),
  CONSTRAINT fk_tiene3_tiene8_carrera FOREIGN KEY (idfacultad) REFERENCES public.carrera(idfacultad),
  CONSTRAINT fk_tiene3_tiene8_carrera FOREIGN KEY (idcarrera) REFERENCES public.carrera(idcarrera)
);
CREATE TABLE public.tiene5 (
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  idhabilitacion integer NOT NULL,
  CONSTRAINT tiene5_pkey PRIMARY KEY (idasignatura, idexamen, idhabilitacion),
  CONSTRAINT fk_tiene5_tiene5_motivoin FOREIGN KEY (idhabilitacion) REFERENCES public.motivoinhabilitacion(idmotivo),
  CONSTRAINT fk_tiene5_tiene9_habilita FOREIGN KEY (idasignatura) REFERENCES public.habilitacion(idasignatura),
  CONSTRAINT fk_tiene5_tiene9_habilita FOREIGN KEY (idexamen) REFERENCES public.habilitacion(idexamen),
  CONSTRAINT fk_tiene5_tiene9_habilita FOREIGN KEY (idhabilitacion) REFERENCES public.habilitacion(idhabilitacion)
);
CREATE TABLE public.usuario (
  idusuario integer NOT NULL,
  idcredencial integer,
  ciusuario text,
  nombreusuario text,
  apellidousuario text,
  telefonousuario integer,
  correousuario text,
  contraseniausuario text,
  estadousuario boolean,
  intentos_fallidos integer NOT NULL DEFAULT 0,
  fecha_bloqueo timestamp with time zone,
  CONSTRAINT usuario_pkey PRIMARY KEY (idusuario),
  CONSTRAINT fk_usuario_debe_tene_credenci FOREIGN KEY (idcredencial) REFERENCES public.credencial(idcredencial)
);
CREATE TABLE public.aula (
  nombreaula text NOT NULL,
  ubicacionaula text,
  capacidadaula integer,
  idaula integer NOT NULL DEFAULT nextval('aula_idaula_seq'::regclass),
  estadoaula boolean NOT NULL DEFAULT true,
  CONSTRAINT aula_pkey PRIMARY KEY (idaula)
);
CREATE TABLE public.horarioregular (
  idusuario integer NOT NULL,
  codsisdocente integer NOT NULL,
  idasignatura integer NOT NULL,
  idaula integer NOT NULL,
  diasemana smallint NOT NULL CHECK (diasemana >= 1 AND diasemana <= 7),
  horainicio time without time zone NOT NULL,
  horafin time without time zone NOT NULL,
  idhorarioregular integer NOT NULL DEFAULT nextval('horarioregular_idhorarioregular_seq'::regclass),
  estadohorario boolean NOT NULL DEFAULT true,
  CONSTRAINT horarioregular_pkey PRIMARY KEY (idhorarioregular),
  CONSTRAINT fk_horarioregular_docenteasignatura FOREIGN KEY (idusuario) REFERENCES public.docenteasignatura(idusuario),
  CONSTRAINT fk_horarioregular_docenteasignatura FOREIGN KEY (codsisdocente) REFERENCES public.docenteasignatura(codsisdocente),
  CONSTRAINT fk_horarioregular_docenteasignatura FOREIGN KEY (idasignatura) REFERENCES public.docenteasignatura(idasignatura),
  CONSTRAINT fk_horarioregular_aula FOREIGN KEY (idaula) REFERENCES public.aula(idaula)
);
CREATE TABLE public.normageneral (
  descripcionnorma text NOT NULL,
  idnormageneral integer NOT NULL DEFAULT nextval('normageneral_idnormageneral_seq'::regclass),
  estadonorma boolean NOT NULL DEFAULT true,
  CONSTRAINT normageneral_pkey PRIMARY KEY (idnormageneral)
);
CREATE TABLE public.examennormageneral (
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  idnormageneral integer NOT NULL,
  CONSTRAINT examennormageneral_pkey PRIMARY KEY (idasignatura, idexamen, idnormageneral),
  CONSTRAINT fk_examennormageneral_examen FOREIGN KEY (idasignatura) REFERENCES public.examen(idasignatura),
  CONSTRAINT fk_examennormageneral_examen FOREIGN KEY (idexamen) REFERENCES public.examen(idexamen),
  CONSTRAINT fk_examennormageneral_norma FOREIGN KEY (idnormageneral) REFERENCES public.normageneral(idnormageneral)
);
CREATE TABLE public.normaespecifica (
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  descripcionnorma text NOT NULL,
  idnormaespecifica integer NOT NULL DEFAULT nextval('normaespecifica_idnormaespecifica_seq'::regclass),
  fechacreacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT normaespecifica_pkey PRIMARY KEY (idnormaespecifica),
  CONSTRAINT fk_normaespecifica_examen FOREIGN KEY (idasignatura) REFERENCES public.examen(idasignatura),
  CONSTRAINT fk_normaespecifica_examen FOREIGN KEY (idexamen) REFERENCES public.examen(idexamen)
);