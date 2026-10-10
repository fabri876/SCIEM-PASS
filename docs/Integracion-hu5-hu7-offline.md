# PROMPT: Análisis e integración de la HU Multirol con la HU Offline-First — SCIEM-PASS

## 1. Contexto del proyecto

Estoy desarrollando SCIEM-PASS, un sistema de control de ingreso de estudiantes a exámenes.

Mi backend utiliza Java con Spring Boot y PostgreSQL. El frontend utiliza React con Vite.

Necesito integrar dos historias de usuario (HU) sin duplicar funcionalidades, romper el código existente ni modificar innecesariamente la base de datos.

### HU propia
**Control y Registro Multirol de Ingreso al Examen en Tiempo Real.**

Actualmente tengo implementado un flujo de control de ingreso que permite validar y registrar estudiantes mediante QR y mediante identificación manual por CI/SIS.

Existe el endpoint individual:

`POST /api/v1/control/ingresos`

También existe un módulo de credenciales QR con las siguientes piezas:

- Entidad `Credencial`.
- `CredencialRepository`.
- `QrGeneratorService`.
- `QrCredencialDTO`.
- `EstudianteQrService`.
- `EstudianteQrController`.
- `ControlIngresoAyudanteService`.

El flujo actual valida el token QR, el examen, la vigencia de la credencial y los datos del estudiante, y se integra con la lógica de registro de ingresos existente. Debes verificar estos comportamientos en el código real antes de asumir que siguen implementados exactamente así.

### HU de mis compañeros
**Operatividad Offline-First y Sincronización Diferida.**

Su objetivo es permitir que docentes y ayudantes registren ingresos sin conexión a Internet y que las marcaciones se sincronicen automáticamente cuando se recupere la conectividad.

El diseño propuesto utiliza IndexedDB y Dexie en el frontend.

Se contemplan los siguientes módulos:

- `db.js`: configuración de la base de datos local.
- `validationEngine.js`: validación local de QR, CI y SIS.
- `useConectividad.js`: seguimiento de la conectividad.
- `useEstadoSync.js`: seguimiento del estado de sincronización.
- Una cola `asistencias_pendientes` con identificadores `clientUuid`.
- Un sistema de lotes de sincronización con identificadores `batchId`.
- Reintentos controlados, manejo de errores y sincronización automática.

El endpoint propuesto para sincronizar las marcaciones es:

`POST /api/v1/asistencias/batch-sync`

Este endpoint es una propuesta de la HU offline y debes comprobar si ya existe antes de implementarlo.

## 2. Estructura actual de la base de datos

### Tabla `examen`

La tabla `examen` tiene como clave primaria compuesta `(idasignatura, idexamen)` y también posee una restricción única sobre `idexamen`.

Contiene los campos `idusuario` y `codsisdocente` y referencia a `docenteasignatura` mediante:

`(idusuario, codsisdocente, idasignatura)`

Esto relaciona el examen con una asignación docente-asignatura.

### Tabla `docenteasignatura`

Su clave primaria es:

`(idusuario, codsisdocente, idasignatura)`

Relaciona al docente con una asignatura y referencia a las tablas `docente` y `asignatura`.

### Tabla `ayudante_examen`

Relaciona a los ayudantes con los exámenes y contiene, según el esquema existente, los campos `idayudante`, `idasignatura`, `idexamen`, `idambiente`, `fecha_asignacion` y `estado_asignacion`.

No debes reutilizar esta tabla para docentes sin una justificación funcional y de modelo de datos.

### Tabla `credencial`

La tabla `credencial` contiene, entre otros, los campos:

- `idcredencial`.
- `idusuario`.
- `token`.
- `idexamen`.
- `validodesde`.
- `validohasta`.
- `estado`.

Tiene restricciones únicas sobre `token` y sobre `(idusuario, idexamen)`, además de sus claves foráneas existentes.

Comprueba cómo se identifica al estudiante mediante `idusuario` y cómo se relaciona con el examen antes de proponer cambios.

### Tabla `ingreso`

Esta es la tabla actual donde se registran los ingresos de los estudiantes.

Su estructura incluye:

- `idingreso SERIAL PRIMARY KEY`.
- `est_idusuario`.
- `codsisestudiante`.
- `idasignatura`.
- `idexamen`.
- `idambiente`.
- `idusuario`.
- `idexpulsion`.
- `fechaingreso`.
- `observacioningreso`.
- `horaingreso TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'America/La_Paz')`.
- `tipoingreso`, con valores `NORMAL` y `EXCEPCIONAL`.
- `motivoexcepcion`.
- `evidenciaurl`.
- `metodo_ingreso`, con valores `ESCANEO` y `MANUAL`.

La restricción más importante para evitar ingresos duplicados es:

`UNIQUE (codsisestudiante, idasignatura, idexamen)`

No elimines ni debilites esta restricción sin una justificación explícita.

## 3. Requisitos de integración

Analiza el código existente y determina cómo integrar ambas HU respetando estos requisitos:

### A. Autorización multirol

1. El docente debe poder operar únicamente en los exámenes para los que está autorizado.
2. El ayudante debe poder operar únicamente en los exámenes a los que está asignado.
3. El backend debe validar la identidad y los permisos del usuario autenticado.
4. No confíes únicamente en el rol o identificador enviado por el frontend.
5. Reutiliza la lógica de negocio de ingreso existente cuando sea viable.
6. No dupliques validaciones de QR, estudiante, examen, ambiente o excepciones en múltiples servicios.

### B. Registro online y offline

1. El registro online debe seguir funcionando como hasta ahora.
2. El registro offline debe guardarse localmente en IndexedDB y quedar pendiente de sincronización.
3. Cuando se recupere la conexión, las marcaciones deben enviarse al backend.
4. El backend debe volver a validar cada marcación y sus permisos.
5. Debe existir un resultado individual para cada elemento recibido en el lote.
6. Los errores de un registro no deben provocar que se pierda el resultado de los demás registros procesables.
7. Los estados de la cola local deben distinguir entre pendientes, sincronizados, reintentables y errores que requieren intervención, de acuerdo con el contrato que se defina.

### C. Idempotencia y duplicados

Necesito comprender e implementar correctamente el identificador `clientUuid`.

Cada marcación originada en un dispositivo debe recibir un UUID único cuando se crea. Ese UUID debe conservarse durante todos los reintentos de sincronización.

Ejemplo ilustrativo:

`clientUuid: a81f3c20-7d42-4e91-9b65-123456789abc`

El objetivo es que, si el dispositivo envía la misma marcación varias veces porque no recibió una respuesta, el servidor reconozca la misma operación y no cree ingresos adicionales.

Analiza si conviene:

- Agregar `clientUuid` a `ingreso` con una restricción única.
- Crear una tabla auxiliar de idempotencia o sincronización.
- Adoptar otra solución que se ajuste mejor al modelo existente.

Compara las alternativas antes de recomendar una.

El identificador `batchId` identifica un lote, pero no sustituye la idempotencia por marcación: el mismo `clientUuid` debe seguir siendo reconocible si se reenvía dentro de otro lote.

La restricción única actual de `ingreso` debe seguir protegiendo contra registros duplicados del mismo estudiante y examen, incluso si llegan desde dispositivos diferentes y tienen distintos UUID.

El backend debe manejar los conflictos de concurrencia de manera segura y devolver resultados controlados, sin errores internos innecesarios.

### D. Hora de marcación y hora de sincronización

Quiero conservar ambos datos:

1. **Hora de marcación:** el momento en que el docente o ayudante registró al estudiante, incluso si el dispositivo estaba sin conexión.
2. **Hora de recepción o sincronización:** el momento en que el servidor recibió y procesó la marcación.

Analiza el campo actual `horaingreso` y determina cómo mantener la compatibilidad con el flujo online.

Evalúa la incorporación de un campo como `fecha_sincronizacion` y determina si es suficiente o si se necesita distinguir también entre la hora declarada por el dispositivo y la hora efectiva registrada por el servidor.

No confíes ciegamente en el reloj del dispositivo. Documenta cómo se manejarían desfases horarios, datos inválidos y registros recibidos tarde.

No cambies todavía el esquema de la base de datos.

### E. Sincronización por lotes

Analiza la implementación del endpoint propuesto:

`POST /api/v1/asistencias/batch-sync`

Debes definir o recomendar:

- Formato de la solicitud y respuesta.
- Identificador del lote y de cada marcación.
- Validaciones por elemento.
- Tratamiento de registros ya procesados.
- Tratamiento de duplicados de negocio.
- Tratamiento de errores de autorización.
- Estrategia ante fallos parciales.
- Reintentos y estados finales.
- Transacciones y concurrencia.
- Compatibilidad con el endpoint individual existente.

No inventes contratos que ya puedan existir en el repositorio. Busca primero los DTO, controladores, servicios, repositorios y pruebas actuales.

### F. Nómina y validación offline

Analiza qué datos necesita el frontend para descargar la nómina del examen y validar localmente los ingresos.

Verifica si ya existen endpoints para consultar estudiantes inscritos, credenciales QR, ambientes y datos del examen.

Si falta algún endpoint, propón el contrato necesario, pero no lo implementes antes de que apruebe el plan.

La validación offline mejora la operación, pero el backend debe volver a comprobar las reglas de negocio al sincronizar.

### G. Vigencia de las credenciales QR

Existe una posible discrepancia que debe resolverse antes de modificar las validaciones:

- La implementación descrita actualmente calcula la vigencia desde las 00:00 del día anterior hasta las 23:59 del día del examen.
- El manual offline propone una ventana desde 24 horas antes del examen hasta 15 minutos después del inicio.

Revisa la implementación y documenta la diferencia. No elijas una regla arbitrariamente ni modifiques la vigencia sin aprobación.

## 4. Preguntas que debes responder antes de programar

Primero inspecciona el repositorio y después responde estas preguntas. Si la información no se puede obtener del código, indícalo explícitamente.

1. ¿Cómo se autentican actualmente los usuarios y cómo se identifica su rol?
2. ¿Cómo se relaciona el usuario autenticado con `docenteasignatura`?
3. ¿Cómo se verifica actualmente que un ayudante está asignado al examen?
4. ¿Existe ya algún servicio común de validación y registro de ingresos que pueda reutilizarse?
5. ¿Existe ya el endpoint `POST /api/v1/asistencias/batch-sync` o debe crearse?
6. ¿Qué endpoint permite descargar la nómina de estudiantes de un examen? Si no existe, ¿qué información debe devolver?
7. ¿Cómo se obtiene el ambiente asignado y cómo se valida que un operador pueda registrar ingresos en ese ambiente?
8. ¿Qué ocurre actualmente cuando dos peticiones intentan registrar simultáneamente al mismo estudiante en el mismo examen?
9. ¿Cómo se maneja la excepción de unicidad de `uq_ingreso_estudiante_examen`?
10. ¿Dónde se generan y conservan actualmente los tokens QR y su vigencia?
11. ¿Cómo se relaciona una credencial QR con el estudiante y el examen?
12. ¿Cuál es la estrategia más adecuada para guardar y verificar `clientUuid` sin afectar la compatibilidad con los ingresos online?
13. ¿Es necesaria una tabla auxiliar de sincronización o basta con ampliar `ingreso`? Justifica la recomendación.
14. ¿Cómo se distinguirán la hora de marcación y la hora de recepción del servidor?
15. ¿Cómo se evitará que un mismo `clientUuid` se procese dos veces, incluso si llega en lotes diferentes?
16. ¿Cómo se distinguirá un reintento técnico de un duplicado real de asistencia?
17. ¿Qué debería responder el backend cuando una marcación ya existe por la restricción única de estudiante y examen?
18. ¿Cómo se representarán los resultados parciales de un lote para que el frontend no vuelva a enviar indefinidamente registros rechazados?
19. ¿Qué cambios requiere CORS para aceptar `Authorization`, `Content-Type` e `Idempotency-Key`, si corresponde?
20. ¿Existe un endpoint de salud que pueda utilizar el monitor de conectividad? ¿Admite `HEAD` o debe adaptarse?
21. ¿Cómo se manejarán los desfases entre el reloj local y el reloj del servidor?
22. ¿Qué pruebas unitarias, de integración y de concurrencia faltan para garantizar la idempotencia?
23. ¿Qué cambios son realmente necesarios y cuáles son opcionales?
24. ¿Qué riesgos de seguridad, integridad o compatibilidad encuentras en la arquitectura propuesta?

## 5. Forma de trabajo obligatoria

Trabaja por fases y no realices cambios prematuros.

### Fase 1: inspección

- Examina la estructura del repositorio.
- Identifica los controladores, servicios, DTO, entidades, repositorios, migraciones SQL y pruebas relacionadas con ingresos, exámenes, docentes, ayudantes y credenciales.
- Identifica las partes del frontend relacionadas con el registro online y el módulo offline, si ya existen.
- No modifiques archivos ni ejecutes migraciones.

### Fase 2: diagnóstico

Entrega un informe con:

1. Estado actual verificado en el código.
2. Respuestas a las 24 preguntas anteriores.
3. Funcionalidades que ya existen.
4. Funcionalidades que faltan.
5. Conflictos entre el diseño offline y el backend actual.
6. Riesgos técnicos y de seguridad.
7. Archivos que probablemente deban modificarse.

Diferencia claramente los hechos comprobados de las suposiciones y recomendaciones.

### Fase 3: propuesta de solución

Presenta un plan que incluya:

- Cambios mínimos de base de datos.
- Contrato propuesto de sincronización.
- Estrategia de idempotencia.
- Tratamiento de horas y zonas horarias.
- Reutilización de los servicios actuales.
- Autorización multirol.
- Integración con IndexedDB.
- Pruebas necesarias.
- Riesgos y alternativas.

Incluye ejemplos de solicitudes y respuestas JSON cuando ayuden a explicar el contrato. Etiqueta los ejemplos como propuestas, no como contratos existentes.

### Fase 4: aprobación

**Detente después de presentar el diagnóstico y la propuesta. No programes, no alteres archivos, no agregues columnas y no ejecutes migraciones hasta que yo apruebe explícitamente el plan.**

Si falta información esencial, hazme preguntas concretas antes de continuar.

### Fase 5: implementación posterior

Solo después de mi aprobación:

- Implementa los cambios acordados de manera incremental.
- Conserva la compatibilidad del endpoint individual.
- Reutiliza los servicios de negocio existentes.
- Añade migraciones seguras y documentadas cuando sean necesarias.
- Agrega pruebas unitarias, de integración, de idempotencia y de concurrencia.
- Ejecuta las pruebas disponibles y comunica sus resultados reales.
- Resume los archivos modificados, decisiones tomadas, comandos ejecutados y tareas pendientes.

## 6. Restricciones

- No rehagas la arquitectura completa.
- No dupliques las tablas `examen`, `docenteasignatura`, `ayudante_examen`, `credencial` o `ingreso` sin una justificación demostrable.
- No elimines restricciones de integridad existentes para hacer funcionar la sincronización.
- No confíes en datos de autorización enviados por el frontend.
- No marques un registro como sincronizado antes de que el servidor confirme el resultado correspondiente.
- No afirmes que una funcionalidad existe sin localizarla en el código.
- No inventes endpoints, clases, campos o relaciones como si ya estuvieran implementados.
- No hagas cambios destructivos.
- Prioriza la solución más simple que garantice integridad, seguridad e idempotencia.

## Resultado esperado

Quiero recibir primero un diagnóstico claro y una propuesta de integración para ambas HU. Después de revisar y aprobar esa propuesta, implementaremos los cambios necesarios en SCIEM-PASS.