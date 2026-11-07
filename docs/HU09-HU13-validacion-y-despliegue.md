# Intentos de examen incorrecto: validación y despliegue

## Alcance y comportamiento

La verificación en línea registra el intento y su auditoría en una transacción.
Una solicitud usa un UUID estable para sus reintentos. Los intentos independientes
usan UUID distintos. El reporte consulta los intentos reales y, cuando existe, el
destino asociado. Los datos históricos sin destino no se completan por inferencia.

Sin conexión, la aplicación necesita descargar antes la nómina del examen y los
datos mínimos de orientación de la jornada. Solo se usa una copia del día y del
operador correspondiente. Si no hay coincidencia inequívoca o la información no
está disponible, no se inventa un destino. El intento identificado se conserva en
una cola separada de las asistencias; hasta la confirmación del servidor no se
afirma que esté auditado. Los rechazos del servidor se conservan para revisión.

El dispositivo es un entorno confiado, no una prueba criptográfica de que un
operador haya escaneado físicamente una credencial. Las huellas QR y los demás
datos descargados son sensibles y requieren protección del dispositivo. Para
verificar un QR offline al sincronizar, el dispositivo conserva temporalmente la
credencial leída en la cola local: se elimina de la cola tras la confirmación del
servidor, pero se conserva en los casos pendientes o en revisión. IndexedDB no
ofrece cifrado de extremo a extremo contra quien controle el dispositivo. El acceso
a la descarga exige una sesión y asignación válidas. Las copias de otras jornadas
se purgan al descargar una nueva; los intentos pendientes no se borran por esa purga.

## Pruebas realizadas

- En PostgreSQL local aislado se probaron rechazo y orientación por SIS y QR,
  auditoría, solicitudes independientes y repetición de una misma solicitud.
- Seis solicitudes simultáneas con el mismo UUID dejaron un intento y una auditoría.
- Se probó desde la página la orientación offline, la cola y la sincronización
  posterior con SIS; se conservó la hora original de verificación.
- Se probó el escaneo QR offline con cámara y credencial ficticia, seguido de su
  sincronización. Tras reforzar la verificación de posesión de la credencial se
  repitió la prueba integrada: en la base local se comprobó un intento y una
  auditoría, sin duplicados. También se probaron los reintentos por API.
- Se comprobó la denegación de acceso sin sesión, de operadores sin asignación y
  de docentes no responsables, y el acceso del operador asignado a su control.
- Las 30 pruebas seleccionadas de control, sincronización, auditoría y reporte
  pasaron con Java 21. La compilación del frontend y las comprobaciones específicas
  de orientación y cola pasaron con una copia portable de Node 20.19.0, sin cambiar
  la instalación global del equipo.
- Una ejecución más amplia del backend mostró ocho fallos en pruebas de grupos,
  incidencias y CORS y agotó su tiempo límite. Al ejecutar esas tres clases de
  prueba sobre una copia temporal de `HEAD` sin los cambios de HU09/HU13 se
  reprodujeron los mismos ocho fallos (cuatro fallos y cuatro errores). Son
  anteriores a este trabajo, pero la suite completa no está aprobada.
- Tras aplicar la migración compartida, el backend arrancó contra Supabase y el
  usuario confirmó que el reporte de intentos cargó. No se registraron intentos
  ficticios en la base compartida durante esa comprobación.

La verificación de la cadena de auditoría demuestra consistencia interna, no
inmutabilidad completa: la separación de la cuenta propietaria y el punto de control
externo de HU15 siguen pendientes.

## Preparación antes de la migración compartida

1. Coordinar con el equipo una ventana de mantenimiento y respaldo recuperable.
2. La migración `docs/migraciones/PROPUESTA_hu09_intentos_examen_incorrecto.sql`
   fue aplicada en Supabase el 2026-11-07. Se verificaron en lectura cinco columnas,
   las cuatro restricciones nuevas, el índice único y la restricción de motivos;
   no se detectaron motivos incompatibles. No repetir el SQL en esa base.
3. Validar que los clientes y el backend anterior no permanezcan activos cuando
   empiecen a escribirse los nuevos motivos: versiones antiguas pueden no reconocer
   `EXAMEN_INCORRECTO`. El nuevo backend también requiere las nuevas columnas.
4. Solo la persona autorizada despliega el backend y el frontend coordinadamente.
   No abrir el acceso hasta verificar el estado de ambos.
5. En un entorno compartido aprobado, ejecutar una prueba controlada sin datos
   personales reales en mensajes o capturas: rechazo, destino, auditoría, reporte,
   permisos y sincronización offline. Verificar la actualización de clientes PWA.

La migración es aditiva en datos, pero cambiar de vuelta a una versión anterior
después de registrar el nuevo motivo puede romper la lectura del enum. El plan de
retroceso debe revisarse con el equipo y el respaldo: no borrar ni modificar eventos
de auditoría para forzar el retroceso.
