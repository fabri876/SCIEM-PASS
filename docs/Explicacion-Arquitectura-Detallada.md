# Arquitectura del Sistema — Explicación Detallada
## Sistema de Control de Ingreso a Exámenes Masivos (WindSoft / UMSS)

Este documento explica **qué es cada pieza de la arquitectura y para qué sirve**, pensado para que cualquiera del equipo lo lea y entienda el panorama completo, incluso si no participó en el armado del entorno.

---

## 1. Visión general: qué problema resuelve el sistema

El sistema automatiza el **control de ingreso de estudiantes a exámenes masivos**: verifica identidad, comprueba habilitación, registra la hora de ingreso, evita duplicados y genera reportes — todo esto reemplazando un proceso manual lento y propenso a errores.

---

## 2. El estilo de arquitectura elegido

### ¿Qué es una arquitectura "cliente-servidor en 3 capas"?

Significa que el sistema se divide en tres grandes bloques que se comunican entre sí, pero que **no se mezclan**:

1. **Cliente (Presentación)** → lo que ve y usa la persona (el navegador, la app)
2. **Servidor (Aplicación + Dominio)** → donde vive la lógica de negocio (las reglas: "verificar habilitación", "no permitir duplicados")
3. **Datos (Persistencia)** → donde se guarda la información de forma permanente (la base de datos)

### ¿Por qué "monolito modular" y no microservicios?

Un **monolito** es una sola aplicación backend (un solo proyecto Java que se ejecuta como un solo proceso). Se descartaron los **microservicios** (varias aplicaciones pequeñas e independientes que se comunican por red) porque:
- El sistema va a correr en **un solo servidor** del laboratorio, no en una nube con múltiples máquinas.
- El equipo es de 8 personas sin experiencia previa operando sistemas distribuidos.
- La complejidad extra de microservicios (redes, monitoreo, despliegues separados) no aporta nada a un sistema de este tamaño — sería "complejidad porque sí".

Aun así, el backend se organiza en **capas internas bien separadas** (ver punto 3), para que si en el futuro la universidad quisiera escalarlo a más facultades, sea más fácil dividirlo.

---

## 3. Las capas del backend, explicadas una por una

Dentro del proyecto Java, el código se organiza en 5 carpetas, cada una con una responsabilidad única:

### `presentacion/`
**Qué hace:** recibe las peticiones que llegan por internet (HTTP) y decide a quién pasárselas.
**Analogía:** es como el mesero de un restaurante — recibe el pedido del cliente, pero no cocina nada él mismo.
**Ejemplo real de tu proyecto:** `PingController.java` — recibe `GET /api/ping` y responde `"pong"`.
**Regla de oro:** nunca debe tener lógica de negocio ni hablar directamente con la base de datos.

### `aplicacion/`
**Qué hace:** coordina los pasos de un caso de uso completo (ej. "registrar el ingreso de un estudiante" implica: verificar identidad → comprobar habilitación → verificar ambiente → guardar → auditar).
**Analogía:** es el cocinero que sigue la receta paso a paso.
**Por qué está vacía todavía:** aún no has construido ninguna funcionalidad de negocio real (HU1, HU2, etc.) — se va a llenar con clases como `EstudianteService.java`, `ControlIngresoService.java`.

### `dominio/`
**Qué hace:** contiene las **entidades** (clases que representan los datos reales del negocio: un Estudiante, un Examen, un Ingreso) y las reglas puras que no dependen de tecnología externa.
**Analogía:** son los "ingredientes" del negocio — lo que existe conceptualmente, sin importar si se guarda en PostgreSQL o en otro lado.
**Ejemplo futuro:** `Estudiante.java`, con anotación `@Entity`, representando la tabla de estudiantes.

### `persistencia/`
**Qué hace:** es el único lugar del proyecto que sabe hablar con la base de datos.
**Analogía:** es el encargado del almacén — el cocinero le pide ingredientes, pero no entra él mismo a buscarlos.
**Por qué importa aislarlo:** si mañana cambian de PostgreSQL a otro motor, solo se toca esta capa, nada más del sistema se entera del cambio.
**Ejemplo futuro:** `EstudianteRepository.java`, una interfaz que extiende `JpaRepository`.

### `infraestructura/`
**Qué hace:** configuración técnica transversal que no es "negocio" pero que el sistema necesita para funcionar: seguridad, CORS, auditoría.
**Ejemplos reales ya creados:**
- `CorsConfig.java` → le dice al backend qué direcciones (como `http://localhost:5173`) tienen permiso de hacerle peticiones.
- `SecurityConfig.java` → define qué rutas requieren login y cuáles no (por ahora, todo `/api/**` está abierto temporalmente, hasta que se implemente JWT).

---

## 4. La estructura del frontend, explicada

### `components/`
Piezas de interfaz reutilizables y pequeñas (un botón especial, una tarjeta, un ícono con texto) que se usan en varias pantallas distintas.

### `pages/`
Pantallas completas del sistema: la pantalla de Login, la pantalla de Control de Ingreso, el Dashboard de reportes, el panel de Administración. Cada una arma su vista combinando varios `components`.

### `services/`
Funciones que hacen las llamadas HTTP (`fetch`) hacia el backend. En vez de escribir `fetch("http://localhost:8080/...")` repetido en cada pantalla, se centraliza aquí (ej. `estudianteService.js` con una función `obtenerEstudiantes()`), así si la URL del backend cambia (de `localhost` a la del servidor real), solo se edita en un lugar.

### `hooks/`
Lógica reutilizable escrita con React Hooks (funciones especiales de React que empiezan con `use`, como `useState`). Por ejemplo, un `useAuth()` que maneje si el usuario está logueado o no, reutilizable en cualquier pantalla.

### `offline/`
Todavía vacía — aquí va a vivir, más adelante, el Service Worker y la lógica de IndexedDB para que el Personal de Control pueda seguir registrando ingresos aunque se corte la conexión a internet (ver ADR-6 más abajo).

---

## 5. Las tecnologías usadas, explicadas una por una

### Java + Spring Boot (backend)
**Qué es:** un lenguaje de programación (Java) más un framework (Spring Boot) que facilita construir el servidor sin tener que configurar manualmente cómo se conectan HTTP, lógica de negocio y base de datos.
**Analogía:** Java son los ladrillos, Spring Boot es el conjunto de herramientas y planos que te ayuda a construir la casa más rápido, siguiendo buenas prácticas ya probadas.
**Detalle importante aprendido:** Spring Boot trae su propio servidor web (Tomcat) **embebido** — no hace falta instalar Tomcat aparte para desarrollar, solo para el despliegue final en el laboratorio.

### Maven (gestor de dependencias y build del backend)
**Qué es:** la herramienta que descarga automáticamente las librerías que el backend necesita (declaradas en `pom.xml`), compila el código y lo empaqueta en un `.jar` ejecutable.
**Detalle importante aprendido:** no hace falta instalarlo globalmente — el proyecto trae su propio **Maven Wrapper** (`mvnw` / `mvnw.cmd`), que descarga la versión correcta de Maven automáticamente la primera vez que se usa.

### React + Vite (frontend)
**Qué es:** React es una biblioteca de JavaScript para construir interfaces de usuario mediante componentes reutilizables. Vite es la herramienta que arma el proyecto, lo compila y lo sirve mientras desarrollas (con recarga automática al guardar cambios).

### Tailwind CSS
**Qué es:** un framework de estilos que permite dar formato visual (colores, espaciados, tamaños) escribiendo clases directamente en el HTML/JSX (ej. `className="bg-blue-500 text-white p-4"`), sin tener que escribir archivos CSS separados para cada cosa.

### PostgreSQL
**Qué es:** el motor de base de datos relacional donde se guarda toda la información del sistema (estudiantes, exámenes, ingresos, historial). Se eligió sobre MySQL por su mejor soporte de restricciones de integridad (importante para evitar ingresos duplicados) y transacciones.

### Supabase
**Qué es:** un servicio en la nube que ofrece PostgreSQL ya instalado y listo para usar, con un panel visual de administración. Se está usando **temporalmente, solo durante el desarrollo**, para que todo el equipo trabaje contra la misma base de datos compartida sin que cada uno tenga que instalar PostgreSQL en su propia PC. **No es la base de datos final** — en el Sprint 4 se migrará al servidor del Laboratorio DIS, según exige el pliego.

### Git y GitHub
**Qué es:** Git es el sistema que registra el historial de cambios del código (quién cambió qué y cuándo). GitHub es donde se aloja ese historial en la nube, para que todo el equipo pueda compartir el mismo código.
**Comandos clave usados:**
- `git status` → ver qué archivos cambiaron
- `git add .` → marcar los cambios para subir
- `git commit -m "mensaje"` → guardar esos cambios como un punto en el historial
- `git push` → subir esos cambios a GitHub
- `git pull` → bajar los cambios que subieron los demás

### Postman
**Qué es:** una aplicación para probar los endpoints del backend enviando peticiones HTTP (GET, POST, etc.) sin necesitar todavía el frontend terminado. Útil para verificar que el backend responde correctamente antes de conectarlo con React.

---

## 6. Seguridad: los dos mecanismos, bien diferenciados

### Hashing de contraseñas
**Cuándo ocurre:** al crear o cambiar la contraseña de un usuario del sistema.
**Qué hace:** convierte la contraseña en un texto irreversible (usando un algoritmo como BCrypt) antes de guardarla en la base de datos, para que ni siquiera alguien con acceso a la base pueda ver la contraseña real.

### JWT (JSON Web Token)
**Cuándo ocurre:** después de que el usuario ya inició sesión correctamente.
**Qué hace:** el backend entrega un "token" (una credencial temporal) que el frontend debe enviar en cada petición siguiente, para no tener que volver a pedir usuario/contraseña en cada clic.
**Importante:** el JWT no bloquea que la aplicación *cargue* — cualquiera puede ver la pantalla de login. Lo que bloquea es el **acceso a los datos y funciones reales** (ver la lista de estudiantes, registrar un ingreso) sin haberse identificado antes.
**Estado actual del proyecto:** todavía no implementado. Por ahora, `SecurityConfig.java` tiene una regla temporal (`permitAll()` en `/api/**`) que deja todo abierto mientras se construye el JWT real, previsto para la Historia de Usuario HU16.

---

## 7. Decisiones arquitectónicas clave (resumen de los ADR)

| ADR | Decisión | Por qué |
|---|---|---|
| ADR-1 | Monolito modular en capas | Se ajusta al tamaño del equipo y a la infraestructura de un solo servidor |
| ADR-2 | Actualización del dashboard por *polling* (no WebSocket) | Más simple, suficiente para la frecuencia real de cambios |
| ADR-3 | PostgreSQL como motor de base de datos | Mejor soporte de restricciones e integridad para evitar duplicados |
| ADR-4 | JWT de vida corta + refresh token | Evita mantener sesiones de servidor con múltiples dispositivos móviles conectados |
| ADR-5 | Prevención de duplicados con constraint UNIQUE + transacción atómica | La validación solo en el código no alcanza bajo alta concurrencia |
| ADR-6 | Modo offline con Service Worker + IndexedDB + sincronización | Los exámenes no pueden depender de que la red nunca falle |

---

## 8. El entorno de desarrollo, en resumen

| Herramienta | Rol |
|---|---|
| Antigravity | Editor de código (IDE) donde se escribe y ejecuta todo |
| JDK 21 | Motor que ejecuta el código Java del backend |
| Node.js 20.19.0 | Motor que ejecuta las herramientas de JavaScript del frontend (Vite, npm) |
| Git Bash | Terminal usada para comandos de Git y para correr el backend |
| CMD (Símbolo del sistema) | Terminal usada para comandos de npm/Node del frontend |
| Postman | Prueba manual de endpoints del backend |
| Supabase | Base de datos PostgreSQL compartida, solo para desarrollo |

---

## 9. Manejo de credenciales (por qué se hizo así)

- `application.yaml` → se sube a Git, contiene la configuración general **sin** contraseñas.
- `application-local.yaml` → **no se sube a Git** (está en `.gitignore`), contiene la contraseña real de la base de datos.
- Cada integrante del equipo tiene su propio `application-local.yaml` en su PC, con la misma contraseña compartida (pasada por un canal privado, nunca por GitHub).

Esto evita que la contraseña de la base de datos compartida quede expuesta públicamente en el historial del repositorio.

---

## 10. Flujo completo de una petición (de punta a punta)

Para entender cómo se conecta todo, así es como viaja una petición simple (el `ping` que ya probaron):

1. El usuario abre `http://localhost:5173` → el navegador carga la página de React.
2. React ejecuta `fetch('http://localhost:8080/api/ping')`.
3. Esa petición sale del navegador y llega al backend, pasando primero por la verificación de **CORS** (¿este origen tiene permiso? Sí, `localhost:5173` está autorizado en `CorsConfig.java`).
4. Llega a `PingController.java` (capa de Presentación), que responde `"pong"` sin necesitar la base de datos.
5. React recibe la respuesta y actualiza la pantalla con `setMensaje("pong")`.

Cuando más adelante se registre un ingreso real, el flujo va a ser más largo: pasará también por `aplicacion/` (validar reglas), `dominio/` (la entidad Estudiante/Examen), y `persistencia/` (guardar en PostgreSQL vía Supabase).

---

## 11. Estado actual y próximos pasos

Todo lo descrito en este documento ya está **funcionando y verificado**: backend, frontend, base de datos, comunicación entre ellos, y el repositorio Git organizado en la rama `testing`.

Lo que sigue es empezar a construir las funcionalidades reales de negocio (Historias de Usuario del Sprint 1: HU1, HU2, HU3, HU16), llenando de contenido las capas `aplicacion/`, `dominio/` y `persistencia/` que hoy están vacías, siguiendo exactamente los mismos patrones y convenciones descritos aquí.
