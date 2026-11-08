# Biblioteca de exámenes pasados

Sección de consulta independiente del control de ingreso. Un PDF es un documento;
no genera exámenes operativos, usuarios, inscripciones, notificaciones ni asignaciones.
Admite material de admisión y preuniversitario como referencia pública.

## Uso

- Administrador → **Carga de Exámenes Pasados**: seleccionar un PDF (máximo 10 MB),
  revisar título y gestión (`1-2026`, `2-2026`), y guardar.
- El formulario ocupa la columna izquierda y la lista de documentos la derecha;
  en pantallas pequeñas se apilan. La lista permite ver el PDF en un modal,
  descargarlo, actualizar y recorrer páginas. Después de guardar vuelve a la
  primera página y consulta la lista actualizada.
- El nombre del archivo propone el título y, si contiene `2026-2`, la gestión.
  Estos datos pueden corregirse antes de guardar. No se extraen asignaturas del PDF.
- Fecha exacta y descripción son opcionales. Toda la descripción será pública;
  puede utilizarse para citar la fuente. No inventar fechas si el original es ambiguo.
- En **Exámenes → Exámenes pasados**, cualquier visitante puede consultar y descargar
  los originales sin iniciar sesión. Páginas de 20, ordenadas por año, semestre,
  fecha exacta (si existe) e identificador, de más reciente a antiguo.
- Cada descarga tiene su propio estado: solo su botón muestra el indicador de
  carga. Las otras descargas permanecen habilitadas, incluso si se solicitan varias.
- Los registros históricos se clasifican por gestión documental; no necesitan un
  semestre operativo creado en la aplicación.

## Persistencia y seguridad

Aplicar una vez a cada entorno PostgreSQL, antes de utilizar la sección:

`control-ingreso-backend/src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/2026-11-04_examenes_archivados.sql`

La tabla `examen_pasado_documento` almacena título, gestión, fecha opcional,
descripción, PDF completo (`BYTEA`), fecha de carga y huella SHA-256.
No tiene llaves foráneas a usuarios, grupos, asignaturas o semestres.
RLS queda habilitado sin políticas de escritura para clientes de Supabase REST;
la aplicación accede mediante JDBC como propietario de la tabla.
El índice UNIQUE de SHA-256 impide cargar el mismo contenido dos veces, incluso
con otro nombre o con solicitudes concurrentes. La respuesta es HTTP 409.
Esta huella identifica archivos; no sustituye Argon2id para contraseñas.
Las listas no leen el contenido binario: el PDF se obtiene únicamente al descargar.
Se valida el contenido con PDFBox, tamaño, título, gestión, fecha y descripción.
No se admiten PDFs cifrados, vacíos o ilegibles, ni gestiones/fechas futuras.

## API

- `POST /api/admin/examenes-pasados`: solo ADMINISTRADOR; multipart con
  `archivoPdf`, `strNombre`, `strPeriodo`, `strFecha` opcional y
  `strObservaciones` opcional. Devuelve 201 y `{ "intId": ... }`.
- `GET /api/publico/examenes/pasados?limite=20&offset=0`: público, máximo 100 por página.
- `GET /api/publico/examenes/pasados/{id}/pdf`: descarga pública del original,
  `application/pdf`, como adjunto; 404 si no existe.

## Carga inicial de SAGA (2026)

Fuente: https://sagaa.fcyt.umss.edu.bo/admision/examenes.php

Se cargaron cinco PDFs originales: primera y tercera opción de 1-2026,
compilación PREU 1-2026, y primera y segunda opción de 2-2026.
La página muestra seis entradas de 2026, pero la segunda opción 1-2026
enlaza a un documento cuyo contenido corresponde a 1-2025: se excluyó.
La primera opción 1-2026 tiene una fecha impresa de 2024; se conserva sin
alterar, con la fecha exacta vacía y la inconsistencia documentada.
La compilación PREU contiene varias fechas y también conserva su fecha vacía.
No se dividieron sus páginas en exámenes independientes.

Carga y verificación de descarga por documento: 0,89–2,73 segundos en esta prueba.
Los cinco retornaron 201, sus descargas fueron idénticas a los originales y
una segunda carga del mismo contenido retornó 409 sin duplicarlo.

Posteriormente se agregaron 15 documentos anteriores para completar **20**:
7 de 2025, 6 de 2024 y 2 de la gestión 2-2023, conservando los cinco de 2026.
Todos se descargaron desde los enlaces de SAGA y se verificó que las descargas
desde la aplicación coincidieran byte por byte con los originales.
Esta ampliación, incluida la verificación, tomó 53,08 segundos en la prueba local.
Las compilaciones PREU se conservan completas como un solo PDF y sin una fecha
única inventada. El primer examen de la gestión 1-2024 indica diciembre de 2023:
se conserva la gestión de publicación y se explica la fecha impresa en la descripción.
