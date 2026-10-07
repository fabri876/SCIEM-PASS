# Registro académico y carga del horario

El catálogo conserva las asignaturas existentes. Cada grupo pertenece a una asignatura; distintos docentes pueden compartir asignatura y cada docente puede tener varios grupos. Estudiantes y ayudantes se vinculan al grupo y, mediante este, a la asignatura. El número de grupo no identifica un grupo sin su asignatura.

## Uso

1. En el panel del administrador, abrir la gestión académica e importar el PDF del horario.
2. Revisar la ventana superpuesta: muestra código oficial, asignatura y grupo. Las repeticiones de un grupo en la misma materia se deduplican.
3. Confirmar la carga para crear únicamente las asignaturas y grupos faltantes.
4. Registrar docentes mediante los formularios individuales o la carga de personas existente, incluyendo sus asignaturas y grupos.
5. Para novedades posteriores, crear el grupo en la gestión académica y seleccionarlo al registrar a la persona. El registro individual permite elegir varios grupos de distintas asignaturas. Docentes y estudiantes deben tener al menos un grupo al registrarse. En la carga de docentes, las relaciones vienen en el archivo. En la carga de estudiantes, el Excel contiene seis columnas hasta TELEFONO y el administrador o docente selecciona una asignatura y un grupo para todo el lote.

El PDF no crea personas ni credenciales y no vincula docentes o ayudantes. Los nombres del personal y las marcas de auxiliar se descartan al construir el catálogo, igual que día, hora y aula. La carga conserva todas las relaciones de personas ya existentes. Los ayudantes se registran y vinculan mediante los flujos de personas; no forman parte de esta importación.

En el registro individual, marcar un grupo lo añade directamente a la selección que se guarda con la persona. En la carga de docentes, cada fila del Excel representa una persona: `ASIGNATURA` y `GRUPO` pueden contener listas separadas por punto y coma en el mismo orden. Por ejemplo, `CALCULO I; ALGEBRA I` y `2; 3`. Ambas listas deben tener igual longitud y todos los grupos deben existir previamente. Una relación inválida rechaza esa fila antes de crear a la persona. No repita una fila por cada materia: reúna las asignaciones del docente en su fila.

Para cargar docentes con sus relaciones, primero importe el PDF para crear el catálogo; después complete los datos personales y las columnas ASIGNATURA y GRUPO del Excel y cárguelo como Docentes. La sección Gestión de Asignaturas y Grupos permite asignar nuevos grupos a docentes ya registrados. Importar el horario no modifica sus relaciones.

Se ignoran día, hora y aula. Las filas repetidas del horario se deduplican. Reimportar agrega lo que falta sin borrar relaciones. El catálogo representa el estado actual; esta funcionalidad no almacena historia por semestre ni elimina automáticamente docentes del semestre anterior.

## Compatibilidad y base de datos

La asignación de docentes también mantiene `docenteasignatura`, utilizada por las funciones existentes de exámenes. El código oficial del horario se guarda en `asignatura.codigooficial`. Si una asignatura existente tiene otro identificador pero coincide por nombre normalizado único, se conserva su identificador y sus relaciones. Los códigos contradictorios se rechazan.

La migración está en `control-ingreso-backend/src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-10-06_integridad_grupos.sql`. Debe ejecutarse dentro de una transacción. Agrega claves foráneas y restricciones de unicidad sin eliminar registros. Datos inválidos o duplicados hacen fallar la transacción para permitir su revisión.

El administrador gestiona el catálogo. Un docente solamente puede vincular estudiantes y ayudantes a sus propios grupos. Las vinculaciones son aditivas: no constituyen una operación de baja o traslado.

## Validación

Pruebas de lector PDF, importación, grupos, registro y carga masiva en el backend. El PDF `411702.pdf` produce 63 asignaturas y 168 grupos únicos en la importación del catálogo. La prueba opcional `RegistroAcademicoSupabaseTest` utiliza el perfil local y transacciones revertidas; simula auditoría para impedir escrituras independientes. Las secuencias pueden avanzar durante estas pruebas.

La importación del catálogo reduce esas filas a pares únicos de código y grupo. Consulta el catálogo de grupos una sola vez por carga, sin búsquedas de docentes ni auxiliares. El frontend comunica el resultado del guardado antes de refrescar las listas, y bloquea una nueva confirmación mientras la operación está en curso.

Para ejecutar la integración, usar Maven con `-Dtest=RegistroAcademicoSupabaseTest`, `-Dsupabase.integration=true` y `-Dhorario.test.pdf=C:/Users/nesae/Downloads/411702.pdf`, después de aplicar la migración.

## Identificadores y rendimiento de la carga de personas

La columna ID_ASIGNATURA permite usar el identificador interno de la materia y GRUPO su nombre (por ejemplo 2). CODIGO_ASIGNATURA usa el código oficial del horario. Elegir una sola columna de materia; ambas admiten listas separadas por punto y coma. ASIGNATURA con nombres o siglas sigue siendo compatible. Los IDs internos se consultan en el selector del catálogo y pueden cambiar al borrar y recrear materias; el código oficial evita depender de esos IDs.

La plantilla de docentes tiene ocho columnas: CODSIS, CORREO, CI, APELLIDOS, NOMBRES, TELEFONO, ID_ASIGNATURA y GRUPO. La plantilla de estudiantes tiene las primeras seis columnas; la asignatura y el grupo se seleccionan en el panel. Los datos de ejemplo son ficticios. Para docentes, los IDs 10 y 20 deben reemplazarse por los del catálogo actual. El botón descarga la plantilla del rol seleccionado; los archivos están en `control-ingreso-frontend/public/plantillas/`.

La carga consulta los CI, correos y códigos SIS existentes mediante cuatro búsquedas por lote, en lugar de búsquedas por persona. Reutiliza las búsquedas de materias, pares materia/grupo y permisos dentro de la solicitud, incluso para relaciones inexistentes. Conserva el hashing de contraseñas y las validaciones de acceso. El guardado continúa en una transacción; cerrar su ventana no lo cancela. El panel muestra tiempo transcurrido y resultado al finalizar, sin permitir repetir la carga mientras guarda.


La gestión académica tiene su propia entrada del menú. A la izquierda permite cargar el horario, crear asignaturas y grupos y asignar un docente registrado. A la derecha muestra el catálogo con búsqueda, grupos y docentes asignados. El botón Quitar archivo o Volver y quitar archivo retira el PDF antes de guardarlo. Las consultas del catálogo para registro no calculan estadísticas de exámenes. Al crear docentes individualmente no se solicita contraseña: el backend usa el CI normalizado y lo almacena con hashing.

