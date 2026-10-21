# Historial de semestres

El administrador dispone de **Historial de Semestres** en el menú lateral. Las tarjetas muestran los últimos cinco semestres finalizados, ordenados del más reciente al más antiguo. Permiten comparar asignaturas, grupos y docentes con el semestre actual y descargar un PDF. Los días, horas y aulas no participan en esta comparación.

## Datos y documentos

La migración `2026-10-20_semestres.sql`, ubicada en `persistencia/migraciones/`, crea:

- `semestre`: período, estado, observaciones, indicador de muestra, PDF del listado y PDF original adjunto, ambos en columnas PostgreSQL `BYTEA`.
- `semestre_fila`: copia de códigos, asignaturas, grupos y nombres de docentes al finalizar o importar un período.
- `semestre_persona`: copia de los participantes y sus nombres al finalizar el semestre.
- `semestre_docente`: copia de nombre, apellido, CI, SIS, correo, telefono, asignatura y grupo del listado docente. Esta tabla se agrega con `2026-10-21_listado_semestres.sql`, despues de la migracion inicial.

Los grupos, exámenes y horarios regulares reciben `idsemestre`. Las inscripciones de estudiantes también lo reciben, derivado del grupo mediante un trigger. Las cuentas de usuario y las asignaturas siguen siendo compartidas entre semestres.

La migración inicial identifica los datos existentes como **2-2026**. No reconstruye un pasado inexistente ni elimina registros. Debe ejecutarse dentro de una transacción antes de iniciar este backend en otro entorno. Requiere las migraciones previas de integridad académica. No ejecutar nuevamente migraciones antiguas de unicidad de estudiantes después de esta: la regla ahora es un grupo por asignatura **y semestre**.

El listado de tarjetas consulta únicamente metadatos: los documentos se leen al descargarlos. Los PDFs admiten hasta 10 MB y 100 páginas, deben contener texto seleccionable y usar el formato reconocido del horario FCyT o el listado exportado por esta funcionalidad. Los formatos no reconocidos se rechazan; no hay OCR.

## Cambio de semestre

1. Elegir **Cambiar semestre** e indicar un período posterior al actual.
2. Adjuntar el nuevo horario, o dejar el archivo vacío para conservar asignaturas, grupos y docentes.
3. Revisar cambios de docentes, grupos nuevos, grupos retirados y grupos sin cambios.
4. Confirmar. Si el catálogo o los docentes cambiaron desde la vista previa, se exige revisarla nuevamente.

La operación es transaccional: guarda una copia y un PDF del semestre anterior, lo finaliza y crea grupos nuevos para el período siguiente. Incluso las asignaciones sin cambios reciben grupos del nuevo semestre. No se sobrescribe el docente del grupo anterior.

Los estudiantes, ayudantes y exámenes anteriores permanecen relacionados con los grupos históricos; no se copian al nuevo semestre. Se pueden inscribir las mismas cuentas de estudiantes mediante registro individual o carga masiva cuando coinciden CI, correo y SIS. No se reinician sus contraseñas ni se duplican cuentas. Se mantiene la prohibición de inscribir a un estudiante en dos grupos de una asignatura dentro del mismo semestre.

Los nombres de docentes del PDF solo se vinculan cuando coinciden de forma inequívoca con una cuenta activa, considerando nombre y apellido en ambos órdenes y normalizando tildes y espacios. Se avisa sobre nombres desconocidos o ambiguos; esos grupos quedan pendientes de asignación. Un PDF no crea identidades de usuario.

Los triggers impiden modificar grupos, exámenes, horarios regulares y vinculaciones de períodos finalizados. Las consultas operativas utilizan el semestre actual. Las cuentas con relaciones históricas no se pueden eliminar físicamente: se conserva la opción de desactivarlas.

## Históricos y ejemplos

El botón **+** importa un semestre anterior ya finalizado, sin modificar las cuentas ni las asignaciones actuales. Guarda el original y el listado procesado. Un histórico real tiene prioridad sobre una muestra del mismo período al mostrar las tarjetas.

Se provisionaron muestras **1-2025**, **2-2025** y **1-2026** mediante el servicio de ejemplos. Son listados amplios basados en las asignaturas y grupos del catalogo actual, con identidades, CI, SIS, correos y telefonos ficticios; sus PDFs llevan una marca visible. Si no existe catalogo, se generan 120 asignaciones de demostracion. No representan horarios oficiales ni crean docentes o estudiantes reales. El endpoint administrativo `POST /api/admin/semestres/ejemplos` permite regenerar exclusivamente las muestras en un entorno de pruebas. No reemplaza historicos reales.

## Verificación

Las pruebas `SemestresTest` comprueban las diferencias y la exportación/importación de PDF. `SemestresIntegracionTest` es optativa (`-Dsupabase.integration=true`): prueba el cambio de período, la conservación del pasado, la reinscripción de una cuenta, la unicidad por asignatura y semestre y el rechazo de modificaciones históricas. Todas sus escrituras se revierten; las secuencias pueden avanzar.

## Listado docente y visor

El panel muestra un listado filtrable por semestre. Cada fila identifica docente, CI, SIS, asignatura y grupo; tambien permite consultar correo y telefono. El semestre actual tiene botones para ver y descargar su PDF, sin necesidad de finalizarlo. Los historicos ofrecen el mismo visor integrado y su descarga. El PDF es una tabla paginada con encabezados repetidos. No incluye contrasenas ni estudiantes.

El actual se consulta desde las cuentas y vinculaciones vigentes. Al cerrar el semestre, se guardan los datos personales en `semestre_docente` para que un cambio posterior de CI, correo o nombre no altere el listado historico. Al importar un PDF anterior sin identidades, se conservan los nombres disponibles y se muestran los otros datos como ausentes: no se inventan ni se toman retrospectivamente de una cuenta actual. Los listados exportados por SCIEM-PASS incluyen una copia estructurada dentro del PDF para su reimportacion sin perder filas por los saltos de pagina.
