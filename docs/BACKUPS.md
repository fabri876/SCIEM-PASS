# Módulo de copias de seguridad (Backups)

## 1. Qué implementé
Yo implementé un módulo para que el administrador pueda, desde su panel:

- **Generar** una copia de seguridad de la base de datos (manual).
- **Descargar** cualquier copia generada.
- **Restaurar** el sistema a una copia anterior.
- Ver una **bitácora independiente** (`bitacora_backups`) con quién hizo qué y cuándo.
- Además, dejé una **copia automática cada 3 días** a las 23:55 (hora de La Paz).

## Activación local

El módulo permanece desactivado si no existe `backup.enabled=true`. Así, los
desarrolladores que no tienen credenciales de Supabase Storage pueden ejecutar
el backend normalmente.

Para habilitarlo, cada responsable debe agregar a su
`src/main/resources/application-local.yaml` (archivo no versionado):

```yaml
backup:
  enabled: true
```

Además debe configurar las variables privadas descritas en la sección 4 y
tener `pg_dump` y `psql` disponibles en el `PATH`.

En produccion, `BACKUP_ENABLED=true` se configura solamente en Render. El Web
Service mantiene `BACKUP_AUTO_ENABLED=false`; el respaldo automatico se ejecuta
en un Cron Job separado con `BACKUP_RUN_ONCE=true`. El Cron Job puede correr a
diario y la aplicacion solo genera una copia cuando ya transcurrieron tres dias.

Antes de habilitarlo en Render, el responsable debe ejecutar el script
`docs/sql/2026-11-15-bitacora-backups-admin-id-text.sql` en el SQL Editor de
Supabase. No contiene secretos y conserva los valores UUID ya registrados.

## 2. Arquitectura
| Pieza | Qué hace |
|---|---|
| `pg_dump` / `psql` | Herramientas nativas de PostgreSQL ejecutadas desde el backend |
| Supabase Storage (bucket privado `backups`) | Guarda los `.sql` para que no se pierdan si el servidor se reinicia |
| Tabla `bitacora_backups` | Auditoría separada del CRUD normal |
| `BackupService` | Lógica de generar, restaurar, retención y bitácora |
| `BackupController` | Endpoints REST solo para ADMIN |
| `BackupSchedulerService` | Backup automático cada 3 días |
| `MantenimientoFilter` | Bloquea el sistema (503) mientras se restaura |
| `BackupsPanel.jsx` | Pantalla del administrador |

## 3. Decisiones importantes
1. **Solo respaldo el esquema `public`.** Los esquemas internos de Supabase (`auth`, `storage`, etc.) no se tocan para evitar conflictos de permisos.
2. **La tabla `bitacora_backups` queda fuera del dump.** Así, al restaurar un backup viejo, la bitácora no se pierde ni se sobrescribe.
3. **Restauración en una sola transacción** (`--single-transaction` + `ON_ERROR_STOP=1`). Si algo falla, la base queda como estaba.
4. **Antes de restaurar genero un respaldo de seguridad automático** (`PRE_RESTAURACION`), por si me equivoco de punto de restauración.
5. **Un solo candado** (`ocupado`) impide dos operaciones de backup/restauración a la vez.
6. **Retención:** se conservan las últimas N copias (por defecto 10) por el límite de espacio del plan gratuito.
7. **Conexión por el pooler en modo sesión (puerto 5432)**, con usuario `postgres.<project-ref>`. El puerto 6543 (modo transacción) no sirve para `pg_dump`.

## 4. Variables de entorno
`BACKUP_DB_HOST`, `BACKUP_DB_PORT`, `BACKUP_DB_USER`, `BACKUP_DB_NAME`, `BACKUP_DB_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `BACKUP_BUCKET`, `BACKUP_MAX`.

> La `SUPABASE_SERVICE_KEY` es secreta: solo vive en el backend, nunca en el frontend ni en el repositorio.

## 5. Endpoints
| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/admin/backups` | Lista los backups |
| POST | `/api/admin/backups` | Genera un backup manual |
| GET | `/api/admin/backups/{nombre}/descarga` | Devuelve URL firmada (60 s) y registra `DESCARGAR` |
| POST | `/api/admin/backups/{nombre}/restaurar` | Restaura |
| GET | `/api/admin/backups/bitacora` | Últimos 100 registros de la bitácora |
| GET | `/api/admin/backups/estado` | Indica si hay restauración en curso |

## 6. Pruebas que recomiendo hacer
1. Generar un backup y verificar que aparece en el bucket y en la bitácora.
2. Cambiar un dato, restaurar, y comprobar que el dato volvió al valor anterior.
3. Verificar que la bitácora conserva todos los registros después de restaurar.
4. Probar la restauración primero en un proyecto Supabase de pruebas.

## 7. Limitaciones conocidas
- Plan gratuito de Supabase: 1 GB de Storage y 50 MB por archivo.
- Si el servidor duerme o está apagado a las 23:55, ese día no corre el automático (el siguiente día se revisa y se recupera).
- La restauración vuelve también las cuentas de usuario a ese momento.

## 8. Integración en el panel administrativo (frontend)
Yo conecté el módulo al `AdminDashboard` y al `AdminSidebar` ya existentes.

### Archivos y ubicación
| Archivo | Dónde lo puse | Qué cambió |
|---|---|---|
| `AdminSidebar.jsx` | `src/pages/admin/components/` | Agregué el ítem **Copias de Seguridad** (ícono `Database`) al final del menú |
| `AdminDashboard.jsx` | `src/pages/admin/` | Importé `BackupsPanel` y lo rendericé cuando `activeMenu === "Copias de Seguridad"` |
| `BackupsPanel.jsx` | `src/pages/admin/components/` | Pantalla nueva, con los mismos tokens de diseño y la misma nomenclatura (`fn`, `str`, `bool`, `arr`, `obj`) |
| `backupService.js` | `src/services/` | Llamadas a los endpoints `/api/admin/backups` |

### Cómo funciona la conexión
- El ítem del sidebar usa el `id` **"Copias de Seguridad"**, que es el mismo texto que compara el dashboard. Si cambio uno, debo cambiar el otro.
- Como el menú móvil reutiliza `AdminSidebar`, la opción también aparece en celular sin trabajo extra.
- `BackupsPanel` recibe la prop `onRestaurado`. Después de una restauración, el dashboard recarga la lista de usuarios y aumenta `revisionAcademica`, para que ninguna pantalla muestre datos anteriores a la restauración.
- Los dos paneles de historial son distintos: **Historial Inmodificable** sigue siendo la bitácora normal; la bitácora de backups se muestra dentro de este nuevo apartado.

### Pendiente de ajustar
- En `backupService.js`, la URL base y el token deben salir igual que en `adminService.js`.
- En el backend, el rol `ADMIN` y la obtención del UUID del administrador (`adminId`) deben coincidir con mi seguridad actual.
