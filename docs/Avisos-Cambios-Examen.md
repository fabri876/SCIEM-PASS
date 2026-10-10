# Avisos de cambios de examen

Aplicar antes de ejecutar el backend en cada base de datos:
`control-ingreso-backend/src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-10-10_avisos_cambios_examen.sql`.
La migración crea `cambio_examen` y su índice; ya fue aplicada en Supabase de desarrollo.

Al actualizar un examen, se comparan sus aulas y su fecha/horas. Cada cambio real genera un aviso con el valor anterior, el nuevo y la fecha de edición. Se guarda en la misma transacción: una edición fallida no deja avisos. Los identificadores de ambiente y el orden de las aulas no generan cambios.

`GET /api/publico/examenes/cambios` devuelve hasta 100 avisos de los últimos siete días, correspondientes a exámenes activos que todavía no pasaron de fecha. Los avisos son públicos, como la cartelera, y no contienen datos de estudiantes. Se muestran junto con los recordatorios de exámenes próximos. El menú actualiza al abrirse y cada minuto mientras está abierto.

No se reconstruyen cambios anteriores a la implementación. No son mensajes personales ni tienen estado persistente de lectura. Cambiar un horario regular por separado no modifica el ambiente ya guardado de un examen: el aviso se genera al editar el examen.
