# Revisión de catálogo y pertenencia a carrera — 11/11/2026

## Estado final

La consulta de ingreso utiliza exclusivamente `usuario_carrera_plan` y
`carrera_plan`. Se retiraron las tablas vacías `carrera`, `tiene3` y
`estudiante_carrera_plan` mediante una migración con comprobación de ausencia
de datos y DROP RESTRICT. Se adaptó también la eliminación de usuarios.
Los apartados históricos siguientes describen la transición, no el estado final.

Todas las cuentas actuales de estudiantes (177), docentes (302) y ayudantes
(11) tienen carrera. Por autorización del responsable, se completaron 136
estudiantes ambiguos con la carrera compatible con más materias y, en empate,
el menor ID: origen `PROVISIONAL_PRUEBA`. Otros 3 estudiantes y 2 docentes sin
clasificación utilizable recibieron una carrera existente como dato de prueba:
origen `PROVISIONAL_SIN_DATOS`. Estas pertenencias deben confirmarse antes de
utilizar los datos como información académica oficial.

Prueba final: consulta de ingreso sin tabla antigua, aislamiento entre
estudiantes y vinculación idempotente; PostgreSQL temporal con rollback.

## Actualización: pertenencia de todos los roles

La fuente utilizada ahora es `usuario_carrera_plan`, con claves foráneas a
usuario y carrera_plan. Incluye docentes, estudiantes y ayudantes; los
administradores no requieren carrera. Conserva el origen de cada vínculo.
La relación inicial `estudiante_carrera_plan` se conserva como dato de migración;
el control de ingreso y las nuevas altas consultan/escriben la relación general.

La carrera seleccionada al buscar materias no se aplica a toda una lista mixta.
La carga de estudiantes permite confirmar explícitamente que el lote es de una
misma carrera. Si no se confirma, Excel admite `ID_CARRERA` por fila; una cuenta
existente conserva su carrera y una cuenta sin pertenencia confirmada devuelve
un error de fila que solicita ese dato. PDF admite lotes de una sola carrera.
El formato de estudiantes conserva sus seis columnas habituales; ID_CARRERA es
la columna adicional para listas mixtas o pertenencias pendientes. Se usan IDs
del catálogo, no códigos SIS de estudiantes ni códigos de asignatura.

Los registros individuales guardan la carrera de los grupos seleccionados en
el contexto de su selector. Docentes y ayudantes sin selección explícita usan
las carreras del catálogo donde se ofrecen sus materias. Los estudiantes nuevos
deben indicar pertenencia, validada en backend. Las escrituras masivas de
pertenencia se agrupan con JDBC en la transacción de la carga.

La migración de cuentas actuales relacionó 300/302 docentes, 11/11 ayudantes y
38/177 estudiantes. Quedan 2 docentes sin clasificación utilizable y 139
estudiantes sin una carrera compatible única; requieren confirmación. No se
asignó una carrera arbitraria para completar esos casos.

Los apartados siguientes documentan la revisión inicial y su compatibilidad.

El catálogo académico es `carrera_plan` → `nivel_carrera` →
`asignatura_carrera_nivel` → `asignatura`. Una asignatura y sus grupos pueden
ser compartidos por varias carreras. No se puede deducir la carrera propia de
un estudiante a partir de sus grupos.

## Corrección

`estudiante_carrera_plan` relaciona explícitamente la clave del estudiante
(`idusuario`, `codsisestudiante`) con `carrera_plan.idcarrera`. Sus claves
foráneas impiden relaciones huérfanas y su clave primaria evita duplicados.
El borrado de un estudiante limpia exclusivamente sus relaciones de carrera.

El control de ingreso consulta esta relación y conserva como compatibilidad
los nombres de la tabla antigua `carrera`. La migración traslada únicamente
coincidencias inequívocas por nombre; no asigna carreras por materias.

El administrador puede vincular una carrera mediante
`PUT /api/admin/estudiantes/{idUsuario}/carreras/{idCarrera}` (token de
administrador requerido). Es idempotente y verifica ambas entidades.
Este cambio no incorpora todavía un selector de pertenencia en el frontend.
El selector de carrera usado para buscar materias es un filtro y no equivale
a declarar la carrera del estudiante.

## Auditoría realizada

- 493 usuarios: 302 docentes, 177 estudiantes, 11 ayudantes y 3 administradores.
- Ninguna fila de rol sin usuario; ningún usuario sin rol o con varios roles.
- Todos los docentes tienen grupos; los grupos tienen asignatura.
- 472 asignaturas y 826 clasificaciones carrera/nivel/semestre.
- 20 entradas de catálogo en `carrera_plan`; tabla antigua `carrera` vacía.
- Se inspeccionaron claves foráneas, vista de perfil y funciones públicas.

No se eliminó ninguna tabla: no se acreditó que fuera prescindible.
`carrera` todavía tiene consumidores y la referencia de `tiene3`;
`facultad` tiene referencias de `carrera`; `horarioregular` está mapeada y es
consultada por el control de eliminaciones; `inscrito` participa en ese mismo
control; `semestre_persona` se llena al archivar semestres;
`configuracion_usuario` se utiliza para PIN. Las tablas de sellado de auditoría
son utilizadas por funciones y triggers aunque no aparezcan en entidades JPA.
Una tabla vacía o sin entidad JPA no se considera obsoleta por ese hecho.

La auditoría verifica los vínculos indicados, no certifica todas las reglas de
negocio ni la equivalencia de cada registro con los PDFs originales.

## Verificación

`CarreraEstudiantePostgresTest`: tablas temporales con rollback; comprueba
aislamiento entre estudiantes, compatibilidad de datos antiguos, ausencia de
asignación implícita e idempotencia. La migración debe aplicarse antes de usar
el backend actualizado.
