# Prueba aislada de JDBC batching

Fecha: 2026-10-30. Java 21; driver y configuracion PostgreSQL del proyecto.

## Resultados

| Modalidad | Ronda 1 (ms) | Ronda 2 (ms) | Ronda 3 (ms) | Mediana (s) |
|---|---:|---:|---:|---:|
| INSERT individual | 47651,287 | 49703,299 | 48463,749 | 48,464 |
| JDBC batch de 50 | 1248,231 | 973,849 | 975,743 | 0,976 |
| JDBC batch de 50 + rewrite | 994,409 | 1298,209 | 987,104 | 0,994 |

La prueba termino correctamente; en cada medicion se verificaron 100 filas por
tabla y sus referencias. Todas las transacciones terminaron en rollback.

El batching redujo aproximadamente 98 % el tiempo de estas inserciones aisladas.
La conexion remota hace costosos los viajes individuales. El rewrite no mostro
una ventaja adicional consistente respecto a executeBatch sin rewrite en esta
muestra: ambas variantes estuvieron alrededor de un segundo.

Estos resultados NO significan que registrar 100 usuarios desde el Excel tarde
un segundo: faltan hashing, consultas de validacion, generacion de IDs, registros
de semestre, habilitaciones, auditoria y transaccion final de la operacion real.
Las tablas temporales tampoco reproducen todos los triggers, indices, politicas
y constraints de las tablas de produccion. La prueba demuestra el potencial de
agrupar escrituras. La implementacion posterior se describe abajo.

## Objetivo y alcance

Medir el ahorro de agrupar escrituras contra la conexion PostgreSQL configurada
localmente, sin crear usuarios reales ni modificar tablas o secuencias del sistema.
No se activo batching en produccion durante esta prueba.

La prueba optativa `persistencia/JdbcBatchBenchmarkTest` crea tres tablas
temporales dentro de una transaccion, hace inserciones sinteticas y comprueba
que cada tabla tiene la cantidad esperada. Un `rollback` en `finally` revierte
los registros y la creacion de las tablas. Las referencias se califican con
`pg_temp` para no alcanzar tablas de la aplicacion. La prueba no levanta Spring
Boot ni ejecuta auditorias o tareas programadas.

## Metodo

- 100 usuarios sinteticos con tres inserciones por usuario: persona, docente,
  relacion con grupo. Claves asignadas por el test, sin consultar secuencias reales.
- Misma estructura y datos para las tres modalidades: escrituras individuales,
  lotes de 50 y lotes de 50 con `reWriteBatchedInserts=true` de pgJDBC.
- Tres rondas, rotando el orden; calentamiento previo de cinco usuarios por modalidad.
- Misma transaccion para todas las escrituras de cada medicion.
- Cronometro solo durante las inserciones, con prepared statements ya creados.
- Conexion, creacion de tablas, comprobaciones, rollback y hashing quedan fuera
  del tiempo informado. El hash es un texto sintetico de longitud representativa.
- No es una medicion del endpoint de carga masiva, de Hibernate ni de su validacion.

Para ejecutarla desde `control-ingreso-backend` con el perfil local configurado:

```powershell
.\mvnw.cmd -o "-Dtest=JdbcBatchBenchmarkTest" "-Djdbc.batch.benchmark=true" "-DargLine=-Xmx384m" test -q
```

La propiedad explicita es obligatoria; las ejecuciones normales de tests la omiten.
Las credenciales se leen del archivo local y nunca se imprimen. El test solo usa
la dependencia JDBC PostgreSQL ya incluida por el proyecto.

## Hallazgos del flujo actual

- La configuracion versionada principal no activa `hibernate.jdbc.batch_size`
  ni `reWriteBatchedInserts`.
- `Usuario` obtiene IDs de una secuencia con `allocationSize=1`: sigue requiriendo
  obtener un ID por persona, aunque se agrupen algunos INSERT.
- Las entidades `DocenteGrupo`, `EstudianteGrupo` y `AyudanteGrupo` usan IDENTITY.
  Hibernate no agrupa sus INSERT de la misma forma que entidades con IDs disponibles
  antes de insertar.
- `CargaMasivaService` guarda usuario, rol y relaciones dentro del recorrido.
  Hay consultas intercaladas para validar e inscribir: no basta con cambiar `save`
  por `saveAll` para obtener el resultado de esta prueba JDBC.

Referencias: [Hibernate ORM](https://docs.hibernate.org/orm/7.2/userguide/html_single/)
y [propiedades del driver PostgreSQL](https://jdbc.postgresql.org/documentation/use/).

Para trasladar una mejora al endpoint hay que agrupar las escrituras por fase,
mantener IDs y referencias correctos, y conservar validaciones, duplicados,
inscripcion unica por asignatura y comportamiento de errores por fila.

## Implementacion aplicada

La carga masiva ahora valida cada fila y mantiene una lista de altas nuevas antes
de escribir. Cada cuenta valida recibe un hash Argon2id independiente. Los
docentes repetidos con CI, correo y SIS coincidentes se consolidan con sus grupos;
las filas invalidas siguen apareciendo en el detalle y no se guardan.

`CargaMasivaJdbcRepository` obtiene los IDs nuevos usando la secuencia existente
en una sola consulta, sin modificar su definicion ni su allocationSize. Guarda
en fases con lotes de hasta 50: usuarios, tablas de rol, docente-asignatura,
docente-grupo, estudiante-grupo, ayudante-grupo y habilitaciones iniciales para
examenes del semestre correspondiente. Se conservan triggers, constraints y las
fechas de inscripcion. Todo comparte la transaccion del servicio: un error SQL
revierte la operacion, como antes. Las secuencias de PostgreSQL pueden dejar huecos
tras rollback, igual que con el registro JPA anterior.

Los usuarios que ya existian mantienen el servicio de vinculacion y sus bloqueos
y validaciones. No se cambian sus datos personales, passwords ni inscripciones
anteriores. El registro individual continua con su flujo existente y Argon2id.
No se habilita batching global para otras funciones ni se cambia el esquema.

### Prueba de la implementacion real

`CargaMasivaJdbcRepositoryPostgresTest`, optativa con
`-Djdbc.batch.integration=true`, ejecuta el repositorio nuevo sobre tablas y
secuencias temporales. Genero 103 hashes Argon2id distintos y guardo 100 estudiantes,
un docente con dos grupos, un ayudante y un administrador.

- Generacion de hashes: 8.318,077 ms.
- Persistencia por fases, incluida reserva de IDs: 2.840,485 ms.
- Comprobados: 103 usuarios, roles, asignaciones docentes sin duplicar materia,
  100 inscripciones con fecha/asignatura/semestre y 100 habilitaciones del semestre
  actual; ninguna habilitacion para el examen historico del fixture.
- Un estudiante en dos grupos de la misma asignatura se rechazo por constraint.
- Un SIS duplicado entre dos docentes provoco error y rollback sin usuarios sueltos.
- Todas las escrituras y secuencias eran temporales y terminaron en rollback.

Estos tiempos siguen sin medir el endpoint completo ni todos los triggers de
produccion. Las pruebas del servicio verifican aparte validaciones, permisos,
duplicados, mezcla de filas validas e invalidas y consolidacion de docentes.

## Texto para compartir con el equipo

Vamos a usar Argon2id y JDBC batching porque resuelven dos partes distintas del
registro. Argon2id protege cada contrasena con un hash individual, tanto en el
registro individual como en el masivo. En la comparacion local fue mas rapido
que BCrypt, a cambio de usar unos 19 MiB de RAM de trabajo por operacion.

JDBC batching agrupa las escrituras del registro masivo en bloques de hasta 50
para reducir viajes a PostgreSQL. Se agrupan usuarios, roles y relaciones, sin
quitar las validaciones de datos, duplicados, asignaturas o grupos. Las cuentas
antiguas conservan su clave y migran de BCrypt a Argon2id al iniciar sesion
correctamente. No hay que reiniciar usuarios ni borrar datos o ejecutar una
migracion de esquema para este cambio.
