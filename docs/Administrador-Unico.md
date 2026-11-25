# Administrador unico del prototipo

## Regla

El prototipo admite **como maximo una cuenta con rol `ADMINISTRADOR`**.

El rol ya no puede asignarse desde el registro generico, el alta de usuarios del
panel, el cambio de rol ni la carga masiva. Se agregan ademas dos protecciones:

- No se puede degradar ni desactivar al unico administrador.
- La base de datos rechaza una segunda fila en la tabla `admin`.

## Defensa en capas

| Capa | Archivo | Que hace |
|---|---|---|
| Dominio | `dominio/PoliticaAdministrador.java` | Reglas puras de "existe otro" y "puede retirarse" |
| Aplicacion | `aplicacion/UsuarioService.java` | Valida antes de insertar admin, degradar o desactivar |
| Aplicacion | `aplicacion/RegistroUsuarioService.java` | Defensa adicional en el registro generico |
| Aplicacion | `aplicacion/CargaMasivaService.java` | Defensa adicional en la carga masiva |
| Base de datos | `persistencia/migraciones/2026-11-24_admin_unico.sql` | Indice unico sobre una expresion constante |

La validacion en codigo mejora el mensaje de error, pero **no garantiza** la
unicidad ante dos solicitudes concurrentes. Esa garantia la da el indice unico.

## Antes de aplicar la migracion

La migracion exige que ya exista exactamente una fila en `admin`; si hay mas,
aborta sin cambios. Para conservar una cuenta y retirar el rol a las demas:

```sql
-- Diagnostico: NO ejecutar a ciegas
SELECT u.idusuario, u.correousuario, u.estadousuario, a.idadmin
FROM usuario u
JOIN admin a ON a.idusuario = u.idusuario
ORDER BY u.idusuario;
```

Luego, en una transaccion, conservar la cuenta definitiva, desactivar las otras
(y quitarles solo su fila de `admin`). No borrar cuentas de usuario para no
romper historial ni relaciones.

## Aplicacion

```sql
-- Ejecutar en el SQL Editor, revisando el resultado antes del COMMIT
BEGIN;

DO $$
DECLARE
    n integer;
BEGIN
    SELECT count(*) INTO n FROM admin;
    IF n <> 1 THEN
        RAISE EXCEPTION 'Se esperaba exactamente 1 administrador y hay %', n;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_singleton ON admin ((true));

COMMIT;
```

## Verificacion

```sql
SELECT count(*) FROM admin; -- 1

SELECT indexname FROM pg_indexes
WHERE tablename = 'admin' AND indexname = 'uq_admin_singleton';
```

La prueba negativa (intentar insertar una segunda fila y esperar una violacion
de unicidad) debe ejecutarse dentro de `BEGIN` / `ROLLBACK`.

## Notas

- La migracion no toca `usuario`: no cambia correo, CI, contrasena ni estado de
  la cuenta que se conserva.
- No se agregan columnas ni se modifica la entidad `Admin`; `ddl-auto: validate`
  no crea indices, por eso la migracion es manual.
- Un administrador existente puede seguir iniciando sesion con su misma
  contrasena; el cambio de contrasena es independiente.
