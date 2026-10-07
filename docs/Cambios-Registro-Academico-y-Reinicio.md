# Cambios de registro académico y preparación del reinicio

## Base de datos

La modificación de estructura aplicada durante este trabajo fue agregar `asignatura.codigooficial VARCHAR(20)`, con un índice único. Permite conservar el identificador de una materia existente y guardar por separado su código oficial del horario.

Las tablas `grupo`, `docentegrupo`, `estudiantegrupo` y `ayudantegrupo` ya existían en Supabase al comenzar la revisión. Este trabajo aprovechó esas tablas; no creó otras tablas para la importación ni para el historial de semestres.

Se aplicaron estas protecciones:

- Siete claves foráneas: grupo → asignatura; docentegrupo → docente y grupo; estudiantegrupo → estudiante y grupo; ayudantegrupo → usuario y grupo.
- Tres restricciones únicas de persona y grupo, una en cada tabla de vinculaciones.
- Un índice único por asignatura y nombre normalizado del grupo.
- Valores predeterminados para el estado activo del grupo y la fecha de inscripción del estudiante.

La migración aplicada está en `control-ingreso-backend/src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-10-06_integridad_grupos.sql`. No eliminó datos ni cambió las claves primarias existentes.

## Registro y frontend

El horario PDF crea únicamente asignaturas y grupos: código, nombre de materia y nombre de grupo. Descarta nombres de docentes y auxiliares. El PDF de referencia contiene 63 materias y 168 grupos únicos; reimportarlo conserva relaciones anteriores y no duplica grupos.

El registro individual y la carga masiva vinculan las personas con sus grupos al crearlas. Para docentes y estudiantes, se exige al menos un grupo y su correspondiente asignatura. El Excel permite varias materias y grupos mediante listas separadas por punto y coma en el mismo orden. Las relaciones de docentes también actualizan `docenteasignatura`, utilizada por exámenes.

Se retiró del panel la sección «Asignar grupos a una persona ya registrada». El catálogo permanece a la izquierda, debajo de la carga masiva. Los usuarios se muestran por pestañas de rol, con filtros de estado. Las cargas presentan una vista previa superpuesta y requieren confirmación antes de guardar.

El resultado del guardado ya no espera la recarga completa de usuarios. La importación del horario consulta el catálogo de grupos una sola vez y no busca personas.

## Preparación del reinicio (alcance inicial)

Al revisar Supabase había 320 usuarios: 3 administradores, 123 registros de docente, 180 registros de estudiante y 15 registros de ayudante. Una misma cuenta puede tener más de un registro de rol; por eso los subtotales no deben sumarse para obtener cuentas únicas.

El alcance elegido es eliminar todas las cuentas no administradoras y conservar los administradores con sus datos originales. Se conservan las 64 asignaturas actuales y los 168 grupos, además de aulas, tipos de examen, normas generales, facultades y otros catálogos.

Existe una dependencia importante: hay 44 exámenes no asociados a administradores, incluidos registros antiguos sin docente. El reinicio preparado también eliminaría esos exámenes, sus 54 ambientes, 6 habilitaciones, 14 horarios regulares y las 2 inscripciones antiguas. El historial de auditoría se conserva; las referencias a actores eliminados se dejan vacías.

El ensayo completo terminó correctamente y se revirtió sin guardar eliminaciones. Comprobó que se eliminarían 317 cuentas únicas, quedarían los 3 administradores con sus datos originales y se conservarían las 64 asignaturas y los 168 grupos. Las 35 pruebas del backend pasaron; la compilación del frontend también terminó correctamente.

Se guardó y verificó una copia local comprimida de los datos de las 34 tablas públicas, con información de columnas, restricciones y secuencias. El respaldo contiene datos personales y hashes de contraseñas, por lo que está fuera del repositorio y no debe publicarse.

El SQL preparado está en `control-ingreso-backend/src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/reiniciar_usuarios_no_admin.sql`. Usa una transacción y verifica que las cuentas administradoras no cambien. No elimina tablas, no utiliza TRUNCATE CASCADE y no reinicia identificadores. Falta decidir si se autoriza eliminar también los exámenes dependientes antes de aplicarlo definitivamente.

## Reinicio aplicado el 6 de octubre de 2026

El usuario autorizó eliminar también los 44 exámenes y todas las asignaturas y grupos. Se guardó y verificó un respaldo actualizado de las 34 tablas públicas en `respaldo-supabase-reinicio-total-20261006.jsonl.gz`, fuera del repositorio. El ensayo se revirtió correctamente y luego se confirmó la transacción definitiva.

Resultado: 317 cuentas no administradoras eliminadas; 3 administradores conservados con sus datos originales; docentes, estudiantes, ayudantes, exámenes, asignaturas y grupos quedaron en cero. Se eliminaron las relaciones dependientes y se conservó el historial de auditoría. No se eliminaron tablas ni columnas, ni se reiniciaron secuencias. Para probar nuevamente, importar primero el horario y luego registrar las personas con sus grupos. No se hicieron commits.

