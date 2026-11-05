# HU15: revision de permisos y pruebas

Estado: sellado instalado por el usuario en Supabase como despliegue parcial.
La separacion de cuentas, permisos definitivos y control externo siguen
pendientes; no se debe presentar como inmutabilidad completa.

## Situacion verificada

- La cuenta configurada para el backend es propietaria de `historialauditoria`.
- Un propietario puede alterar las protecciones de sus tablas. Los triggers de
  la propuesta por si solos no constituyen una barrera frente a esa cuenta.
- En la inspeccion de solo lectura, los privilegios por defecto de `public`
  conceden permisos amplios a `anon`, `authenticated` y `service_role` para
  tablas y funciones nuevas. La tabla existente `historialauditoria` tiene RLS
  desactivado y esos roles cuentan con privilegios de tabla. La exposicion real
  depende ademas de la configuracion de Supabase y de las credenciales usadas;
  no asumir que esos registros son publicos sin comprobarlo.
- La cuenta de backend observada tiene `BYPASSRLS`; activar RLS sin separar la
  cuenta no crea una proteccion efectiva frente a esa misma cuenta.
- Los eventos anteriores no tienen sellos persistidos y deben mostrarse como no
  verificables. El punto de control externo tambien esta pendiente.

## Separacion propuesta

Antes de desplegar, el equipo y la persona administradora de PostgreSQL deben
acordar identidades separadas:

1. Un propietario/migrador para crear y mantener los objetos de HU15, sin usarlo
   en la conexion cotidiana de la aplicacion.
2. Una cuenta de aplicacion sin propiedad ni privilegios para alterar tablas,
   funciones, triggers, roles o punto de control. Debe conservar los permisos
   estrictamente necesarios para las funcionalidades existentes del equipo.
3. La funcion que incorpora sellos debe poder actualizar la cabeza sin conceder
   escritura directa de cabeza y sellos a la cuenta de aplicacion. Si se usa
   `SECURITY DEFINER`, requiere propietario controlado, `search_path` fijo,
   nombres calificados y revision de permisos de ejecucion y privilegios por
   defecto, incluidos roles de Supabase y `PUBLIC`.

No se incluyen instrucciones para cambiar la cuenta de aplicacion ni sus
credenciales: un cambio global de permisos podria romper modulos de otras HU.
Debe diseniarse y probarse con el equipo sobre una copia o entorno aislado.

## Plan de verificacion previo al despliegue

- Probar insercion, rollback y concurrencia con la cuenta de aplicacion limitada.
- Comprobar que no puede modificar ni eliminar eventos, sellos o cabeza, ni
  desactivar triggers. Comprobar `TRUNCATE` y permisos heredados.
- Verificar que las rutas solo permiten al administrador consultar/exportar y
  que una sesion expirada se rechaza.
- Probar los flujos existentes de usuarios, examenes, habilitaciones, ingresos,
  sincronizacion offline e incidencias con sus responsables.
- Confirmar respaldo y procedimiento de recuperacion; la HU15 no transforma un
  hash en un respaldo y sin punto externo no detecta toda reescritura privilegiada.

## Resultado del ensayo local

En `sciem_pass_pruebas_v2` se probo la creacion de la cadena revisada. Un rol
temporal sin login pudo insertar un evento cuyo trigger genero su sello, pero
no pudo escribir directamente la cabeza ni los sellos, modificar o borrar el
historial, ni ejecutar TRUNCATE. El ensayo termino con ROLLBACK y las tablas
de prueba quedaron vacias. Los valores de secuencias no son transaccionales.

La misma comprobacion de auditoria paso en `sciem_pass_integracion`, con una
copia local de las 45 tablas del esquema publico sin datos ni ACL originales.
El rol temporal no pudo crear objetos en `public`. La prueba termino en
ROLLBACK y no reproduce los permisos heredados ni los roles de Supabase.

Ninguna de estas pruebas demuestra que una cuenta limitada pueda ejecutar los
demas modulos. Antes de cambiar la conexion del equipo se deben probar sus
flujos con una cuenta de aplicacion real en un entorno aislado y acordar con
los responsables los permisos necesarios. El backend usa `ddl-auto: validate`,
no necesita privilegios DDL para que Hibernate cree o modifique el esquema.

## Ensayo con backend y cuenta local

El backend inicio en el puerto 8081 conectado como `sciem_integracion_app_local`
a la copia local. Se creo un semestre y un administrador ficticios. El login
real del administrador genero un evento; la verificacion del backend informo
una cadena interna consistente con un bloque y sin punto de control externo.
Una consulta local de solo lectura confirmo un evento, un sello y cabeza 1.
El rol tiene LOGIN y no tiene SUPERUSER, CREATEDB, CREATEROLE, INHERIT ni
BYPASSRLS. El historial, verificacion, exportacion y consultas de docentes,
examenes, aulas, asignaturas y carreras respondieron HTTP 200. Sin token, el
historial respondio HTTP 401.

Las tablas de negocio estaban vacias: respuestas 200 no prueban creacion,
edicion, ingresos, incidencias ni sincronizacion. Los permisos de negocio
utilizados son amplios y provisionales, no un conjunto minimo ni una propuesta
para Supabase. Faltan datos ficticios y pruebas de escritura de esos flujos,
revisar permisos efectivos heredados en Supabase y el control externo.

Posteriormente, con catalogos ficticios y politicas RLS locales provisionales,
el backend creo mediante HTTP un docente, un estudiante y un examen. La
verificacion devolvio cadena consistente y ocho bloques; una lectura separada
confirmo ocho eventos, ocho sellos y cabeza 8. Sin las politicas, RLS ocultaba
el grupo al rol limitado y la creacion fallaba. Las politicas de prueba son
deliberadamente amplias y no deben trasladarse sin revision a Supabase.
Tambien se inhabilito y se volvio a habilitar al estudiante ficticio mediante
el backend. La verificacion informo integridad interna valida con 11 bloques;
una lectura posterior confirmo 11 eventos, 11 sellos y cabeza 11.

## Verificacion inicial en Supabase

Tras la migracion ejecutada por el usuario, se observaron 5170 eventos previos
sin sello y cabeza inicial 0. Una lectura posterior encontro seis eventos
sellados nuevos, incluidos inicios de sesion: cero hashes incorrectos, cero
enlaces incorrectos y cabeza coincidente. Los hashes fueron recalculados con
la funcion de PostgreSQL de la propia cadena; no es un control externo.
Los triggers esperados estaban activos y los roles anon, authenticated y
service_role no tenian los accesos directos comprobados sobre cabeza y sellos.
La cuenta del backend sigue siendo propietaria y falta revisar los permisos
efectivos y la exposicion de la tabla historialauditoria existente.
