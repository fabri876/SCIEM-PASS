# Avisos de cancelación y filtros del administrador

Se integró `testing` en `isma` antes de implementar los cambios.

## Cancelación

Aplicar después de la migración que añade las columnas de cancelación:
`control-ingreso-backend/src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-11-14_notificar_cancelacion_examen.sql`.

El trigger registra un evento `CANCELACION` al pasar `cancelado` a verdadero.
La notificación incluye el motivo y se confirma o revierte con la transacción
del examen. Actualizar repetidamente un examen ya cancelado no duplica el aviso.
La migración también incorpora las cancelaciones anteriores que tengan fecha
y aún no tengan aviso, sin modificar los exámenes.

Se conservan los permisos actuales: administrador, docente relacionado,
estudiantes del grupo y ayudantes con asignación activa al examen. Otro grupo
o un ayudante no asignado no reciben el aviso. La cancelación se mantiene visible
aunque el examen quede inactivo. Los eventos corresponden al semestre actual y
conservan la ventana histórica de 30 días; el listado público de próximos
exámenes continúa mostrando hoy y los dos días siguientes.

## Filtros

Dentro de la campana del administrador se puede seleccionar carrera, nivel y
asignatura. Cambiar una selección limpia las dependientes. “Limpiar filtros”
vuelve a mostrar todos los avisos del semestre. Las asignaturas compartidas
pueden aparecer en cualquiera de sus carreras sin duplicar eventos.

`GET /api/notificaciones?carrera=...&nivel=...&asignatura=...` filtra en PostgreSQL
antes de ordenar y limitar a 100 resultados. El backend rechaza estos filtros
para otros roles, cuyos destinatarios siguen determinados por la sesión.
Marcar como leídos los resultados filtrados conserva los avisos ya leídos de
otras carreras. Los estados de lectura siguen siendo locales al navegador.

## Verificación

- Backend: `./mvnw.cmd -Dtest=NotificacionesServiceTest,NotificacionEventoPostgresTest -Djdbc.batch.integration=true test`.
  El segundo test usa tablas temporales y rollback. Cubre destinatarios,
  cancelación, repetición, reversión y clasificación por carrera/nivel/semestre.
- Frontend: `node scripts/check-notificaciones.mjs` y `npm run build`.
  Cubre filtros exclusivos del administrador, limpieza de selecciones dependientes,
  conservación de lectura y parámetros de la petición.

## Arranque tras integrar testing

La integración de testing del 15/11/2026 ya incluye las correcciones de la
anotación `EnableScheduling` duplicada y los imports de Jackson del cliente
de backups (el proyecto utiliza `tools.jackson`). No forman parte del cambio
de notificaciones.

El módulo de backups queda desactivado por defecto en la configuración actual
de testing, por lo que no impide el arranque cuando faltan sus credenciales.
Para habilitarlo, consultar `docs/BACKUPS.md` y completar las propiedades
`backup.db.*`, `backup.storage.*` y `backup.retention.max` únicamente en el
entorno o en `application-local.yaml`, nunca con secretos versionados.
