# Auditoría e integración del backend para precarga y sincronización offline de SCIEM-PASS

Actúa como un desarrollador backend senior especializado en Java, Spring Boot, Spring Security, PostgreSQL, APIs REST y sistemas Offline-First.

## Objetivo

Preparar el backend existente para soportar la precarga de nóminas y fotografías de estudiantes, así como la sincronización de marcaciones realizadas sin conexión.

## Instrucciones obligatorias

1. Inspecciona primero el código real del proyecto, las entidades, los repositorios, los servicios, los controladores, la configuración de seguridad, las migraciones y las tablas existentes.
2. No asumas que un endpoint, campo o funcionalidad existe solo porque aparece en este requerimiento.
3. No modifiques archivos, base de datos ni migraciones durante la primera fase.
4. Identifica qué funcionalidades ya existen, cuáles están incompletas y cuáles deben implementarse.
5. Conserva la compatibilidad con el registro de ingresos online existente.
6. Evita duplicar lógica de negocio entre el registro online y la sincronización offline.
7. No cambies nombres de endpoints ni contratos acordados con el frontend sin justificarlo.
8. No expongas tokens, credenciales ni datos sensibles en los registros de aplicación.

## Requerimientos funcionales

### 1. CORS y health

Revisar y, posteriormente, implementar:

- `GET /api/v1/health` público.
- CORS compatible con el origen real del frontend.
- Permitir `Authorization`, `Content-Type` e `Idempotency-Key`.
- Exponer la cabecera `Date`.
- Asegurar que las respuestas de error de Spring Security y de la aplicación incluyan las cabeceras CORS correspondientes.
- Mantener las políticas de seguridad del resto de los endpoints.

### 2. Nómina del examen

Contrato requerido:

`GET /api/v1/examenes/{id}/nomina?page=0&size=1000&updatedSince={ISO}`

El parámetro `updatedSince` es opcional.

La respuesta debe incluir:

- `items`
- `page`
- `totalPages`
- `total`
- `generadoEn`

Cada elemento debe contemplar, según los datos disponibles y las relaciones reales del modelo:

- `codigoSis`
- `ci`
- `nombres`
- `apellidoPaterno`
- `apellidos`
- `carrera`
- `estadoHabilitacion`
- `motivoBloqueo`
- `aulaAsignada`
- `normaParticular`
- `qr`
- `qrDesde`
- `qrHasta`
- `qrEstado` (`ACTIVO` o `ANULADO`)
- `marcadoEn`
- `marcadoPor`

Las fechas deben utilizar un formato ISO 8601 con zona horaria cuando representen instantes.

Definir y comprobar los permisos:

- `OPERADOR`: acceso a todos los exámenes permitidos por su rol.
- `DOCENTE`: acceso únicamente a sus propios exámenes.
- `AYUDANTE`: acceso únicamente a los exámenes en los que está asignado.

No devolver datos que no existan en el modelo sin identificar primero cómo obtenerlos correctamente.

Revisar cómo implementar `updatedSince` para que las actualizaciones, anulaciones y cambios relevantes no queden fuera de la sincronización incremental.

### 3. Fotografías

Contrato requerido:

`GET /api/v1/examenes/{id}/fotos?page=0&size=200`

Respuesta esperada:

`{ "items": [{ "codigoSis": "...", "tipo": "image/jpeg", "base64": "..." }], "totalPages": 1 }`

- Devolver miniaturas JPEG de aproximadamente 150 píxeles.
- Procurar un tamaño de 5 a 10 KB por imagen.
- Implementar paginación.
- Evitar cargar todas las fotografías originales en memoria innecesariamente.
- Revisar dónde se almacenan actualmente las fotografías y reutilizar la solución existente.
- Aplicar autorización sobre el examen y limitar el acceso a los datos personales.

### 4. Sincronización offline

Revisar e implementar, cuando corresponda:

`POST /api/v1/asistencias/batch-sync`

Antes de programar, localizar el manual o contrato de integración del frontend y verificar el formato exacto de la petición y de la respuesta.

El endpoint debe:

- Recibir las marcaciones acumuladas durante la desconexión.
- Validar cada marcación y devolver un resultado identificable para cada elemento.
- Diferenciar marcaciones procesadas, duplicados, errores de validación y problemas de autorización.
- Definir expresamente cómo responder ante un `403` de una marcación o de un lote completo.
- Distinguir errores permanentes de errores que permiten reintentar.
- Evitar que una marcación inválida impida procesar las demás, salvo que el contrato defina expresamente un comportamiento transaccional para todo el lote.
- Reutilizar la lógica de negocio del registro online cuando corresponda.
- Mantener la autenticación y autorización existentes.

### 5. Idempotencia y base de datos

Inspeccionar la tabla de ingresos y las restricciones existentes.

Si todavía no existe, evaluar agregar `client_uuid` con una restricción de unicidad apropiada.

Garantizar dos reglas distintas:

1. Una misma operación offline no debe procesarse más de una vez.
2. Un estudiante no debe generar más de un ingreso válido para el mismo examen y asignatura, respetando el modelo y las restricciones de negocio existentes.

Diferenciar entre:

- Reintento con el mismo identificador y los mismos datos.
- Reutilización del identificador con datos diferentes.
- Nueva operación que intenta registrar un ingreso ya existente.

Revisar las restricciones SQL y el manejo de concurrencia para que dos solicitudes simultáneas no generen duplicados.

### 6. Validación temporal del QR

La vigencia debe evaluarse utilizando la hora de la marcación offline, no únicamente la hora de llegada al servidor.

Inspeccionar el modelo actual de credenciales y sus fechas de vigencia.

Proponer una política para validar la hora declarada por el dispositivo, considerando posibles desfases o alteraciones del reloj. No aceptar automáticamente cualquier fecha enviada por el cliente.

Asegurar que los tipos SQL, Java y JSON manejen correctamente las zonas horarias.

## Primera fase: auditoría sin cambios

Entrega un informe que contenga:

1. Endpoints existentes y faltantes.
2. Archivos y clases relacionados con cada requerimiento.
3. Estructura real de las tablas involucradas y restricciones actuales.
4. Flujo actual de autenticación y autorización.
5. Lógica actual de registro de ingresos y validación del QR.
6. Cambios necesarios en backend y base de datos.
7. Riesgos de compatibilidad con el frontend.
8. Pruebas necesarias para cada endpoint.
9. Propuesta de implementación ordenada por fases.

**Detente al terminar esta auditoría. No implementes nada hasta que apruebe el informe.**