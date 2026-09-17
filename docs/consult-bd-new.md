-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin (
  idusuario integer NOT NULL,
  idadmin integer NOT NULL,
  idcredencial integer,
  ciusuario text,
  nombreusuario text,
  apellidousuario text,
  telefonousuario integer,
  correousuario text,
  contraseniausuario text,
  estadousuario boolean,
  CONSTRAINT admin_pkey PRIMARY KEY (idusuario, idadmin),
  CONSTRAINT fk_admin_puede_ser_usuario FOREIGN KEY (idusuario) REFERENCES public.usuario(idusuario)
);
CREATE TABLE public.ambiente (
  idambiente integer NOT NULL,
  idasignatura integer NOT NULL,
  idexamen integer NOT NULL,
  nombreambiente text,
  ubicacionambiente text,
  capacidadambiente integer,
  CONSTRAINT ambiente_pkey PRIMARY KEY (idambiente),
  CONSTRAINT fk_ambiente_examenamb_examen FOREIGN KEY (idasignatura) REFERENCES public.examen(idasignatura),
  CONSTRAINT fk_ambiente_examenamb_examen FOREIGN KEY (idexamen) REFERENCES public.examen(idexamen)
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
  idayudante integer NOT NULL,
  idcredencial integer,
  ciusuario text,
  nombreusuario text,
  apellidousuario text,
  telefonousuario integer,
  correousuario text,
  contraseniausuario text,
  estadousuario boolean,
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
  idcredencial integer,
  ciusuario text,
  nombreusuario text,
  apellidousuario text,
  telefonousuario integer,
  correousuario text,
  contraseniausuario text,
  estadousuario boolean,
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
  idcredencial integer,
  ciusuario text,
  nombreusuario text,
  apellidousuario text,
  telefonousuario integer,
  correousuario text,
  contraseniausuario text,
  estadousuario boolean,
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
  idauditoria integer NOT NULL,
  idusuario integer,
  accion text,
  fechaaccion date,
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
  CONSTRAINT usuario_pkey PRIMARY KEY (idusuario),
  CONSTRAINT fk_usuario_debe_tene_credenci FOREIGN KEY (idcredencial) REFERENCES public.credencial(idcredencial)
);