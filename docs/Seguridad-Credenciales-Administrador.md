# Credenciales y sesiones de administrador

Esta modificacion no requiere cambiar tablas ni actualizar credenciales mediante SQL.
Las cuentas administradoras existentes siguen siendo necesarias; la gestion
ordinaria no permite crear administradores ni asignar ese rol. La carga masiva
y el servicio de registro generico tambien rechazan ese rol.

Tras verificar la contraseña de un administrador, el backend evalua la politica
actual. Si no cumple, permite autenticar para cambiarla, pero exige el cambio
antes de acceder al resto de la API. Se conserva el bloqueo por cambio ya
pendiente. No se inspeccionan hashes ni se prueba ninguna contraseña en lote.
La politica agrega un limite de 256 caracteres y rechaza algunas cadenas comunes,
el CI y el nombre del correo; no es un detector completo de claves filtradas.

El token nuevo contiene una version de credencial derivada mediante HMAC del
hash almacenado y el identificador. No contiene la contraseña ni el hash. Si
se cambia la contraseña, los tokens emitidos con el hash anterior dejan de
autenticar; si cambia el rol, la autoridad del token se contrasta con el rol
vigente. Al actualizar el hash antiguo durante el login tambien se revocan
tokens anteriores. El frontend solicita iniciar sesion nuevamente al cambiar
la contraseña sin borrar las marcas offline pendientes.

## Despliegue y limites

- Al desplegar, los JWT antiguos, sin version de credencial, seran rechazados:
  **todas las personas con sesion activa deberan iniciar sesion de nuevo**.
- Coordinar antes con el equipo de control: la sincronizacion posterior exige
  volver a autenticarse en linea. No borrar IndexedDB ni marcas pendientes.
- Desplegar backend y frontend compatibles juntos y validar el cambio
  obligatorio con una cuenta ficticia en entorno aislado antes de produccion.
- La comprobacion del rol actual impide usar un rol que ya no esta asignado,
  pero por si sola no es una revocacion permanente si se retira y luego se
  devuelve exactamente el mismo rol antes de que venza el token. Una version
  persistente de sesion permitiria cubrir tambien ese escenario.
- La lista corta de patrones comunes no reemplaza una lista revisada de claves
  comprometidas, ni un segundo factor. MFA y su recuperacion necesitan una
  decision de seguridad y operacion del equipo.
- Las pruebas automatizadas con mocks no sustituyen la prueba integrada de
  login, cambio de contraseña, cierre de sesion y cola offline.
