# Carga facultativa de prueba, 2-2026

Verificación realizada el 31/10/2026. Fuente: los 20 horarios públicos de
[SAGA FCyT](https://sagaa.fcyt.umss.edu.bo/horarios/HorariosFCyT.php).

## Datos registrados

- 20 carreras/planes y 167 niveles.
- 341 asignaturas y 849 grupos nuevos; se reutilizaron las coincidencias por
  código oficial, grupo y semestre.
- 200 docentes de prueba nuevos y 93 docentes existentes reutilizados.
- Los 293 docentes del Excel y sus 996 vínculos fueron comprobados en la BD:
  ningún docente ni vínculo del archivo quedó ausente.
- No se crearon estudiantes. Se conservaron los 164 estudiantes existentes.

Los nombres provienen de los horarios; CI, SIS, correos y teléfonos de los
docentes nuevos son ficticios. Las identidades existentes se conservaron.
Se excluyeron auxiliares TP y nombres “por designar” de la generación de docentes.

## Tiempos observados

| Operación | Tiempo | Resultado |
| --- | ---: | --- |
| Lectura inicial de los 20 PDF | 8,93 s | Sin errores de formato |
| Importación de catálogo y clasificación | 58,11 s | 20 planes registrados |
| Primera carga de 293 docentes | 928,52 s (15 min 29 s) | 200 nuevos, 93 existentes, 0 errores |
| Reimportación con precarga de catálogo | 98,03 s (1 min 38 s) | 0 nuevos, 293 existentes, 0 errores |

La primera carga y la reimportación **no son cargas equivalentes**: la primera
crea cuentas, hashes y asignaciones; la segunda verifica y conserva datos que ya
existen. Estos tiempos no permiten afirmar un factor de aceleración para nuevos
registros. El tiempo de arranque del backend no está incluido.

Se redujeron las consultas repetidas: catálogo y grupos se precargan una vez por
lote, los permisos usan ese catálogo manteniendo la comprobación de propiedad y
estado, y los vínculos de docentes existentes se consultan en conjunto y no se
reescriben cuando ya están asignados. No se cambió el algoritmo de contraseñas.

## Estado final y pendientes

La reimportación conservó los totales: 477 usuarios, 302 docentes, 164 estudiantes,
472 asignaturas y 1104 grupos del semestre actual.

470 asignaturas quedaron clasificadas mediante los PDF. Dos registros anteriores
no tienen correspondencia con esos documentos; pueden clasificarse manualmente
desde el catálogo, sin adivinar sus datos. Hay 91 grupos sin docente asignado; los
horarios también contienen grupos “por designar”. No se inventaron personas para
rellenar esas asignaciones.

Las pruebas específicas verificaron clasificación sin duplicados, restricciones de
registro, formatos de PDF y aislamiento de notificaciones por grupo. Se comprobó
HTTP 401 en notificaciones sin sesión. La compilación del frontend, el renderizado
del administrador y las comprobaciones del caché finalizaron correctamente.
