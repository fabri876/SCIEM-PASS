# Instrucciones para ejecutar y actualizar SCIEM-PASS

## 1. Requisitos y configuración inicial

- JDK **21**. Comprobar con `java -version`.
- Node.js **20.19.0**, versión del laboratorio. Comprobar con `node --version`.
- Git y acceso al repositorio.
- Acceso a PostgreSQL y el archivo privado
  `control-ingreso-backend/src/main/resources/application-local.yaml`, con la
  configuración del entorno. Solicitarlo al equipo por su canal privado.

No se instala Maven por separado: se utiliza el wrapper `mvnw` del repositorio.
La primera ejecución necesita internet para descargar sus dependencias.

Las credenciales van en `application-local.yaml`; no se copian a
`application.yaml`, al README ni a un archivo que se vaya a subir a Git.

## 2. Ejecutar el backend

Abrir una terminal **Git Bash** en la raíz del repositorio:

```bash
cd control-ingreso-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Esperar el mensaje `Started ControlIngresoBackendApplication`. El backend queda
ejecutándose en esa terminal, normalmente en `http://localhost:8080`.
Si el proceso termina y vuelve al prompt, revisar el error final: no quedó
corriendo. No hace falta actualizar Antigravity para ejecutar este comando.

Alternativa para **PowerShell**, dentro de `control-ingreso-backend`:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Alternativa para **CMD**, en la misma carpeta:

```cmd
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

Comprobar en el navegador:

```text
http://localhost:8080/api/v1/health
```

La respuesta esperada es `{"status":"UP"}`. Este endpoint confirma que el
servidor responde; no sustituye las pruebas de cada funcionalidad.

## 3. Ejecutar el frontend

Abrir **otra terminal** en la raíz del repositorio:

```bash
cd control-ingreso-frontend
npm ci
npm run dev
```

Abrir la dirección `Local` que imprime Vite, habitualmente
`http://localhost:5173`. Usar la que aparezca en esa terminal: si el puerto está
ocupado puede elegir otro.

En arranques posteriores, si las dependencias no cambiaron:

```bash
cd control-ingreso-frontend
npm run dev
```

El frontend usa `http://localhost:8080` por defecto. Para otro servidor se
configura `VITE_API_URL` en el entorno local del frontend y se reinicia Vite.
No introducir contraseñas, claves de BD o secretos en variables `VITE_*`, porque
son visibles en el navegador.

## 4. Antes de empezar a trabajar o traer cambios

Detener las terminales del proyecto con `Ctrl+C` antes de actualizar archivos.
Desde la raíz del repositorio:

```bash
git branch --show-current
git status
```

Comprobar que se está en la rama personal correcta. Si hay cambios locales,
guardarlos mediante un commit de los archivos correspondientes o un stash antes
de integrar otra rama. No usar «deshacer todo» para poder hacer un pull: se
perdería trabajo local.

Con el trabajo guardado, traer e integrar la rama de integración del equipo:

```bash
git fetch origin
git merge origin/testing
```

Actualmente la rama de integración es **`testing`**. No usar `main` o `develop`
como destino por suposición. Si aparecen conflictos, resolverlos y comprobar el
resultado antes de seguir; no iniciar otro merge encima del pendiente.

`Already up to date` significa que esa rama ya incluye la referencia que se
intentó integrar; no es un error.

## 5. Qué hacer después de recibir o hacer cambios

| Qué cambió | Qué hacer |
|---|---|
| Código Java o configuración del backend | Detener con `Ctrl+C` y volver a ejecutar el comando del backend con el perfil `local`. |
| `pom.xml` | Reiniciar con Maven Wrapper para resolver las dependencias y compilar. |
| Componentes del frontend | Vite suele actualizar la página automáticamente. Si no refleja el cambio, recargar el navegador y revisar su terminal. |
| `package.json` o `package-lock.json` | Detener Vite, ejecutar `npm ci` y después `npm run dev`. |
| Variables del frontend, como `VITE_API_URL` | Reiniciar `npm run dev`. |
| Estructura de la base de datos | Revisar y aplicar únicamente la migración documentada para ese cambio, en la BD correcta. Reiniciar el backend después. |

No ejecutar todos los archivos SQL del repositorio. Algunos son consultas o
herramientas de mantenimiento, no migraciones de instalación. En una BD
compartida, la migración se aplica una vez de forma coordinada; cada compañero
no necesita repetirla. No borrar ni reiniciar datos para actualizar el código.

Para las fechas de semestres, consultar [Fechas-Semestres.md](Fechas-Semestres.md).
Ese documento identifica la migración, las fechas provisionales de 2-2026 y el
funcionamiento del cierre y PDF automático.

## 6. Comprobar el cambio antes de compartirlo

Backend, desde `control-ingreso-backend`, en Git Bash:

```bash
./mvnw test
```

También puede ejecutarse la prueba específica del cambio, por ejemplo:

```bash
./mvnw -Dtest=SemestresTest,SemestreFechasTest test
```

En PowerShell se usa el wrapper de Windows:

```powershell
.\mvnw.cmd "-Dtest=SemestresTest,SemestreFechasTest" test
```

Frontend, desde `control-ingreso-frontend`:

```bash
npm run build
npm run check:admin
```

Si una prueba falla, revisar el resultado; no asumir que todo está aprobado solo
porque el servidor arranca. Las pruebas de integración contra BD que requieren
propiedades explícitas no se activan automáticamente.

Antes del commit, ejecutar `git status` y revisar los archivos seleccionados.
No incluir credenciales locales, `target/`, `node_modules/`, `dist/`, archivos de
error `hs_err_pid*`/`replay_pid*` ni datos de prueba personales. Subir la rama
personal y abrir una PR hacia `testing` según el flujo del equipo.

## 7. Problemas habituales

**«mvnw no encontrado» o «npm no encontrado».** Verificar la carpeta actual y
la instalación correspondiente. `mvnw` se ejecuta dentro del backend y los
comandos npm dentro del frontend. Para Git Bash usar `./mvnw`; para
PowerShell/CMD, `mvnw.cmd` con la sintaxis indicada arriba.

**Archivo Java en rojo en Antigravity.** Abrir el panel Problemas para conocer
el mensaje exacto. Comprobar JDK 21 y recargar/importar el proyecto Maven desde
`control-ingreso-backend/pom.xml`. Ejecutar la prueba o compilación desde la
terminal permite distinguir un error real de un diagnóstico pendiente del
editor. El color por sí solo no significa que falte un pull.

**Puerto 8080 ocupado.** Revisar si el backend ya está ejecutándose en otra
terminal y detener esa instancia antes de iniciar otra.

**Frontend abierto pero sin datos.** Comprobar que el backend responde, que la
URL de API corresponde al servidor esperado y que el perfil local conecta a la
BD correcta. Revisar las terminales y el error de la petición.

**«Ya lo ejecuté: ¿se actualizó para todos?».** El backend local atiende las
peticiones dirigidas a esa computadora. No despliega el código a otras máquinas.
Los compañeros deben actualizar su código y reiniciar su backend, o el equipo
debe desplegar/reiniciar el servidor compartido. Levantar el backend tampoco
migra por sí solo todas las contraseñas existentes.

## 8. Detener el proyecto

Pulsar `Ctrl+C` en la terminal del frontend y en la del backend. Cerrar el
navegador no detiene los servidores.
