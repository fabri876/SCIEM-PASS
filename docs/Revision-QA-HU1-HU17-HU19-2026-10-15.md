# Revisión QA — HU1, HU17 y HU19

Fecha: 15/10/2026. Alcance confirmado: cartelera y avisos globales; exámenes pasados fuera del alcance actual; Ayudante es el nombre funcional de OPERADOR.

La revisión actualiza el documento de QA en Google Docs sin borrar reportes, capturas ni resultados de retest. Corregido en código no significa desplegado ni aprobado por QA.

## Resultado por hallazgo

### BUG-001 — Corregido en código; pendiente QA

El lector de tablas PDF numera desde 2 para contar el encabezado; la segunda fila de datos se reporta como fila 3. Verificado con PDF de prueba.

### BUG-002 — Corregido en código; pendiente QA

Se reemplazó la separación por comas por lectura de columnas según coordenadas del PDF. Se conservan APELLIDOS, NOMBRES y TELEFONO. Los PDF sin encabezados/columnas identificables se rechazan con orientación para usar Excel.

### BUG-003 — Corregido en código; pendiente QA

Al seleccionar un archivo de estudiantes sin grupo se muestra «Seleccione la asignatura y el grupo del lote.». El botón permanece deshabilitado hasta completar ambos.

### BUG-004 — Corregido en código; pendiente QA

La carga masiva valida CI de 6 a 8 dígitos y permite el complemento boliviano previsto por el equipo (normalizado, por ejemplo 8765432-1E). No se aceptan solo letras, cinco ni nueve dígitos sin complemento.

### BUG-005 — Corregido en código; pendiente QA

Se conservan los valores originales del SIS para validar exactamente nueve dígitos. No se eliminan letras para convertir un valor inválido en válido.

### BUG-006 — Corregido en código; pendiente QA

Se valida correo con dominio y extensión y teléfono opcional de siete u ocho dígitos cuando viene informado. No se borran letras del teléfono para guardar los números restantes.

### BUG-007 — Corregido en código; pendiente QA

Antes de consultar, el servicio comprueba la sesión y que el docente solicite su propio idUsuario. Manipular el id devuelve acceso denegado; el administrador conserva la consulta por docente.

### BUG-008 — Corregido en código; pendiente QA

Se añadió confirmación «Usuario registrado correctamente» en el panel administrador y docente. El formulario se sigue cerrando y limpiando tras un registro exitoso.

### BUG-009 — Corrección parcial

Ajuste de alcance: OPERADOR es la clave técnica; «Ayudante» es el nombre funcional acordado, por lo que no se reemplaza globalmente por «Operador». Se corrigieron los plurales en la columna de personas. Se retiró el acceso público /registro (redirige a login) y se bloquearon POST /api/auth/registro y /registro-personal; las cuentas se crean por los flujos autorizados.

### BUG-010 — Corregido en código; pendiente QA

Los errores 500 dejan de concatenar mensajes internos en el manejador del backend. Los servicios de carga/gestión muestran mensajes comprensibles de servidor o conexión, sin «Failed to fetch» ni nombres de clases.

### BUG-011 — Corrección parcial

Corregida la causa del agotamiento de conexiones: la auditoría de operaciones exitosas de usuarios y carga masiva participa en la transacción actual, sin REQUIRES_NEW. Se conserva auditoría independiente para login/acceso denegado. Pendiente repetir la prueba de 10 registros simultáneos en el entorno QA y medir el objetivo de dos segundos; no se afirma ese SLA.

### BUG-012 — Carryover

Hallazgo válido de rendimiento, todavía no resuelto. No se afirma que 500 registros terminen en menos de diez segundos. Se mantienen BCrypt y sus garantías; no se reduce el costo del hash ni se reutilizan contraseñas cifradas para aparentar velocidad. Requiere optimización y medición específica antes del cierre.

### BUG-013 — Corregido en código; pendiente QA

Se hace explícito el máximo operativo de 2000 filas y 10 MB en la interfaz y en los mensajes del backend. Se rechazan listas mayores con indicación de dividirlas; los errores por expansión de Excel ya no se atribuyen solo a columnas incorrectas. No se procesa una lista de cientos de miles de personas como si fuera un lote pequeño.

### BUG-014 — Corrección parcial

Se aplicaron en Supabase cuatro índices únicos: CI normalizado, correo normalizado, SIS de estudiante y SIS de docente. La revisión previa encontró cero duplicados; no se borraron cuentas. La BD impide duplicados incluso ante concurrencia y el API devuelve 409 comprensible. Pendiente retest concurrente de QA; no se implementó el desglose por filas de una colisión concurrente (una transacción en conflicto revierte).

### BUG-040 — Corregido en código; pendiente QA

Se incorporó «Mi Cuenta» al menú compartido: abre los datos de la sesión (nombre, correo y rol) y acceso al cambio de contraseña. Los cambios de datos personales siguen a cargo del administrador; no se agregó autoedición de roles o grupos.

### BUG-041 — No aplica al alcance acordado

No aplica al alcance confirmado por el responsable: Exámenes próximos y avisos de cambios forman una cartelera global, común a usuarios y visitantes. No se solicitó filtrado personal por asignaciones. No se muestran identidades de estudiantes ni mensajes privados.

### BUG-042–EXP — Corregido en código; pendiente QA

El menú de cuenta se despliega dentro del flujo en móvil, con ancho disponible, evitando quedar recortado bajo el panel con overflow. Mantiene el desplegable posicionado en escritorio. Pendiente comprobación visual de QA a 414×896.

### BUG-043 — Corregido en código; pendiente QA

Se limitó el ancho del bloque de nombre, se añadió min-width:0 y truncado con elipsis y se redujeron espacios del header en pantallas intermedias. Pendiente retest visual en los tamaños reportados.

### BUG-044 — No aplica al alcance acordado

No aplica a la cartelera pública según alcance confirmado: las rutas públicas y sus endpoints de datos generales deben seguir sin exigir login. Exámenes pasados NO forma parte de lo implementado; se retiró la ruta que mostraba mocks y ahora redirige a próximos. La ruta /notificaciones no expone mensajes privados (el menú usa avisos globales).

### BUG-045 — Corregido en código; pendiente QA

Al seleccionar horario se rechaza extensión distinta a PDF o tamaño mayor de 10 MB, se limpia el input y se muestra el límite. Se aclaró el mensaje multipart, se reservó margen para el formulario y se configuró drenaje Tomcat acotado. El frontend evita enviar el archivo excesivo.

### BUG-046 — Corregido en código; pendiente QA

Escape utiliza la misma limpieza que «Quitar archivo» y «Volver y quitar archivo»: cierra la vista previa y elimina el archivo seleccionado si no hay guardado en curso.

### BUG-047 — Corregido en código; pendiente QA

El servicio devuelve un mensaje distinto cuando la asignación docente-grupo ya existe; el frontend muestra el mensaje devuelto en lugar de inventar un éxito de nueva asignación. Se mantienen las relaciones anteriores.

## Verificación y despliegue

- Pruebas de registro, PDF, autorización y grupos: 40 casos, 39 aprobados y uno omitido por requerir un archivo externo opcional.
- Frontend: renderizado de administrador y compilación aprobados. Las comprobaciones visuales en móvil deben repetirse en QA; el navegador de esta sesión no pudo acceder al servidor local de prueba.
- Supabase: cero identidades duplicadas antes de la migración. Aplicada `2026-10-15_identidades_unicas.sql`, en persistencia/migraciones; crea índices únicos de CI/correo normalizados y SIS de estudiantes/docentes, sin borrar personas. Ejecutarla también en las demás bases antes del retest concurrente.
- La auditoría de operaciones exitosas comparte la transacción de usuarios para evitar que el pool se agote esperando una segunda conexión. Los intentos fallidos de autenticación conservan su auditoría independiente.
- Archivos: máximo explícito de 10 MB y 2000 filas. Se conserva BCrypt y no se afirma el objetivo de 500 registros en diez segundos.
- Los registros de profesor y estudiante existentes no se modificaron para probar cargas. No se hicieron commits ni pushes.
