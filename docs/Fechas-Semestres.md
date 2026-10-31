# Fechas de inicio y fin del semestre

El administrador puede configurar las fechas en Historial de Semestres. Se
agregan `fecha_inicio`, `fecha_fin` y `archivado_en` a la tabla `semestre`.
Para el actual 2-2026 se acordaron fechas provisionales del 01/08/2026 al
13/12/2026, editables desde el panel mientras no este archivado. Los historicos
anteriores conservan sus datos; no se inventan fechas para ellos.

La fecha final incluye todo ese dia en America/La_Paz. Una tarea comprueba el
vencimiento cada cinco minutos y tambien al arrancar el backend. Cuando vence,
guarda las filas, identidades docentes y PDF; lo marca como archivado una sola
vez. Si el servidor estuvo apagado, recupera el cierre al volver a arrancar.
No abre por si sola otro semestre ni borra cuentas, inscripciones o examenes.

El ultimo semestre sigue siendo el contexto seleccionado hasta que el admin
abra el siguiente; la interfaz indica que esta archivado. Su PDF se descarga
desde la copia guardada, sin regenerarlo con datos posteriores. Las asignaciones
academicas del semestre vencido quedan protegidas por triggers de PostgreSQL.
Los usuarios conservan su acceso; esto no es una fecha de expiracion de cuentas.
Se permite preparar catalogos antes del inicio; las fechas no definen una ventana
de matriculacion adicional.

No se aceptan fechas invertidas, periodos solapados ni abrir otro semestre antes
del fin del actual. Al abrir el nuevo se exigen sus fechas y la confirmacion de
vista previa incluye esas fechas. Cambiarlas exige revisar nuevamente. El cierre
manual del semestre anterior conserva el PDF ya archivado. Los estudiantes,
ayudantes y examenes no se copian al nuevo semestre, igual que antes.

## Instalacion

La migracion revisada es
`persistencia/migraciones/2026-10-31_fechas_semestres.sql`.
Debe aplicarse dentro de una transaccion antes de usar la nueva version del
backend; no se ejecuta implicitamente al arrancar. No cambia claves ni elimina
personas o grupos. Ejecute el archivo desde el SQL Editor de Supabase o mediante
`psql`, dentro de una transaccion. Las herramientas locales de mantenimiento no
forman parte del despliegue.

Pruebas locales cubren fechas, limite de dia boliviano, archivo unico, descarga
inmutable y token de confirmacion. La prueba PostgreSQL utiliza tablas y funcion
`pg_temp` con rollback; no aplica la migracion permanente.
