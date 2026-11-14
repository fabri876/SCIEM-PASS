# Correcciones QA Sprint 3 — Ismael y Fabricio

Fuente: [documentación QA del Sprint 3](https://docs.google.com/document/d/1PgYuPI2Hyhgq1fRibUYGz5XSuKKosjLQ_xpJl8VK0aQ/edit).
Rama de trabajo: `isma`. Correcciones integradas en `testing` mediante la
[PR #201](https://github.com/fabri876/SCIEM-PASS/pull/201).

Los IDs BUG están vacíos o repetidos en la fuente; se identifican los reportes
por área y test cases. «Implementado» no equivale a aprobación manual de QA.

| Área / casos | Corrección implementada |
|---|---|
| Notificaciones TC-035, TC-191 | Eventos persistentes con fecha/hora del servidor; orden descendente por generación y desempate por ID. La UI distingue la fecha del evento de la fecha del examen. |
| Notificaciones TC-096 | Aviso de examen programado desde su creación, aunque falten más de dos días. La página pública de próximos exámenes mantiene su ventana de dos días. |
| Notificaciones TC-100 | Sin IDs internos de aulas; fechas dd/MM/yyyy; títulos «Cambio de aula/horario». Presentación legible de nombres SAGA y acentos de términos habituales, conservando el catálogo original en BD. |
| Notificaciones TC-101 | Asignación de ayudante genera un evento dirigido al usuario. Los ayudantes solo consultan avisos de sus asignaciones activas, no por pertenencia al grupo. |
| Notificaciones TC-103 | Retiro genera un evento dirigido y deja de mostrar avisos de la asignación anterior. Un retiro no se muestra como vigente si se vuelve a asignar al ayudante. |
| Notificaciones TC-104 | Inhabilitación genera evento dirigido con su motivo; se oculta el recordatorio genérico de ese examen para el afectado. |
| Notificaciones TC-103/104 (incidencias) | Una incidencia genera evento visible para administradores y docentes responsables del examen, excluyendo estudiantes y ayudantes. |
| Notificaciones TC-190 | Polling cada 15 segundos también con la campana cerrada. |
| Notificaciones TC-194 | Estado vacío «No tienes notificaciones». |
| Notificaciones TC-401 | Un evento por examen; para el estudiante se usa AsignacionAulaService, el mismo reparto utilizado por control de ingreso. No se envían todas las aulas como si estuviera asignado a todas. |
| Pasados BUG-EXP | Mensajes y validaciones en español con tildes. |
| Pasados TC-037/291 | Máximo 500 caracteres tanto en UI como DTO y servicio, con contador visible. Los documentos antiguos no se recortan. |
| Pasados TC-109/351 | Visor PDF público en modal, sin exigir sesión ni guardar el archivo en disco. Libera la URL temporal al cerrar y conserva descarga separada. |
| Pasados TC-197 | Arrastrar y soltar usa la misma validación y selección que el clic. |
| Pasados TC-202 | Errores de conexión en español para listado, descarga y visor. El listado conserva Reintentar. |
| Pasados TC-205 | Primera página vacía: «Aún no hay exámenes pasados». |
| Pasados TC-288/289 | Tipo incorrecto y exceso de 10 MB tienen mensajes distintos. Validación adicional de contenido mediante PDFBox. |

## Persistencia

Aplicar `2026-11-11_notificaciones_eventos.sql` antes de ejecutar el backend
actualizado. Añade `notificacion_evento` e índices y triggers de examen,
asignación, habilitación, incidencia y cambio de examen. Los eventos se guardan
en la transacción que produce el cambio; si se revierte, el aviso se revierte.
La consulta usa la identidad JWT y filtra los destinatarios en el servidor.

La migración fue ensayada con rollback y posteriormente aplicada a Supabase
el 11/11/2026. En otras instalaciones debe ejecutarse antes de usar esta versión.

Los registros anteriores de exámenes/asignaciones se incorporan con la fecha
de incorporación, sin inventar su fecha original de creación. Los cambios
de aula/horario existentes conservan su fecha de evento. Se consultan hasta
100 eventos de los últimos 30 días del semestre actual. La lectura permanece
por usuario y navegador, como en el diseño anterior.

El 12/11/2026 se actualizaron a **Corregido** los 17 reportes de las secciones
2.7 y 2.8 del Google Docs (10 de notificaciones y 7 de exámenes pasados).
Se verificaron los estados contra una nueva lectura del documento y se añadió
un comentario con el alcance y la evidencia. No se modificaron los reportes
de otros pares ni los resultados históricos de sus test cases. El estado
Corregido indica implementación terminada; la aprobación del retest manual
corresponde a QA.

## Verificación

- Pruebas backend focalizadas: 19 casos aprobados (servicio de documentos,
  DTO/controlador, identidad de notificaciones, aula individual y eventos PostgreSQL).
- PostgreSQL usa tablas y funciones temporales con rollback; comprueba destinatarios,
  retiro, inhabilitación, incidencias, examen a diez días, orden y atomicidad.
- `node scripts/check-hu17-qa.mjs`: orden, fecha boliviana, formato de aula,
  traducción de errores de red y límite visible.
- `npm run check:admin`: renderizado SSR del panel y componentes compartidos.
- `npm run build`: compilación y PWA correctas; avisos existentes de tamaño de bundle.

## Revalidación después de actualizar testing — 12/11/2026

Se actualizó `isma` por fast-forward a `7034ba6` de `origin/testing`, sin
conflictos ni cambios de Docker. Las correcciones anteriores ya estaban
integradas; no se duplicó su implementación.

- Se repitieron los 19 tests backend: 0 fallos, 0 errores, 0 omitidos.
  La integración PostgreSQL utiliza tablas temporales y rollback.
- `check-hu17-qa`, `npm run check:admin` y `npm run build`: correctos.
- El backend con perfil `local` arrancó correctamente en el puerto 8080 y
  conectó con la BD. La actualización del módulo facial recibida desde
  `testing` eliminó el impedimento anterior de `face_intento.foto_path`.
  No se relajó la validación de esquema.

Queda a QA repetir el flujo visual completo con sus usuarios y casos de
prueba. Las pruebas automatizadas y el arranque no sustituyen ese retest.
