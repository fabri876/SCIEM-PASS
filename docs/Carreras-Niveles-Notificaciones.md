# Carreras, niveles y avisos personales

La identidad de una asignatura sigue siendo su código oficial. El nombre puede
repetirse con códigos distintos. Un grupo se identifica por semestre, asignatura
y nombre normalizado del grupo. Que una materia figure en varias carreras no
crea copias de sus grupos.

## Clasificación del catálogo

La migración `2026-10-31_carreras_niveles.sql`, dentro de `persistencia/migraciones`,
añade estas tablas:

- `carrera_plan`: código de plan de SAGA y nombre de carrera. Conserva por separado
  los planes antiguo y nuevo. No modifica la tabla heredada `carrera`, cuya clave
  pertenece a otro modelo.
- `nivel_carrera`: niveles A, B, C, etc., ordenados dentro de cada carrera/plan.
- `asignatura_carrera_nivel`: relación entre asignatura, carrera, nivel y semestre.
  Una asignatura puede aparecer en más de una carrera o nivel.

El importador de horarios extrae carrera, nivel y gestión del PDF. Sigue creando
solo catálogo y grupos: no crea docentes ni auxiliares. Rechaza un horario de una
gestión distinta del semestre actual. La carga es transaccional; los nombres o
códigos contradictorios se revisan antes de confirmar. Los PDFs oficiales conservan
su nombre de seis dígitos para identificar el plan. Cuando un archivo se renombra,
se reutiliza la carrera por nombre únicamente si existe un solo plan coincidente.

La respuesta de importación incluye el detalle de asignaturas y grupos existentes,
con código, nombre y grupo. La interfaz muestra esos detalles en listas desplegables.

Los registros individuales, lotes de estudiantes y asignaciones a docentes usan
los filtros carrera, nivel y asignatura. Estos filtros no cambian la identidad del
grupo ni asignan una carrera directamente al usuario. El usuario sigue vinculado
a sus grupos, como antes. Un docente mantiene la restricción de registrar personas
solo en los grupos que tiene asignados. La nueva asignatura individual requiere
carrera y nivel. La administración del catálogo también permite filtrar la vista.
Cada asignatura del catálogo ofrece “Añadir a carrera y nivel” para clasificar
registros anteriores o incluir una materia compartida en otro plan, conservando sus
grupos y asignaciones.

La carga de usuarios precarga asignaturas, grupos y relaciones de docentes una sola
vez por lote. La validación usa ese catálogo de la solicitud y conserva los controles
de acceso y de grupos activos. Las relaciones existentes no se vuelven a escribir.

## Notificaciones

`GET /api/notificaciones` requiere sesión y obtiene la identidad del JWT validado;
no acepta el ID de otro usuario por parámetro. Devuelve exámenes y cambios de aula
u horario del semestre actual:

- Estudiante: grupos en los que está inscrito.
- Ayudante/operador: grupos en los que colabora.
- Docente: exámenes propios o de sus grupos asignados.
- Administrador: avisos de los exámenes del sistema bajo su administración.

Los exámenes antiguos sin grupo definido se relacionan por asignatura y semestre.
Los que ya tienen grupo exigen la coincidencia de ese grupo. Los avisos próximos
se muestran para los siguientes siete días; los cambios se conservan en la ventana
de siete días existente. Las marcas de lectura del navegador se guardan por usuario.

Sin sesión se muestra “Inicie sesión para ver sus notificaciones”, sin contador ni
consulta de avisos personales. El calendario público de Exámenes sigue siendo global.

## Población y pruebas

Fuentes oficiales: https://sagaa.fcyt.umss.edu.bo/horarios/HorariosFCyT.php, gestión
2-2026. Los horarios no contienen CI, SIS, teléfono ni correo. Para los Excel de
prueba se reutilizan identidades existentes solo cuando el nombre coincide sin
ambigüedad; los datos personales de docentes nuevos son ficticios y sus correos
usan el dominio `example.test`. No representan credenciales oficiales de la UMSS.

Las pruebas PostgreSQL usan tablas temporales y rollback. Comprueban la clasificación
sin duplicados, nombres iguales con códigos distintos y el aislamiento de avisos
entre grupos, incluso dentro de una misma asignatura. La carga real del catálogo
y la de usuarios son operaciones separadas; sus tiempos deben medirse por separado
y no incluyen el arranque del backend.
