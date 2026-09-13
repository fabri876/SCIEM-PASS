# Contrato de API REST — HU: Gestión y Administración de Usuarios, Roles, Permisos y Auditoría

**Módulo:** Control de Ingreso a Exámenes Masivos (SCIEM-PASS / WindSoft)  
**Destinatarios:** Equipo de Desarrollo Frontend (React + Vite)  
**URL Base en Desarrollo:** `http://localhost:8080` (definida en `src/services/apiConfig.js` como `strApiBaseUrl`)  
**Seguridad:** Endpoints bajo `/api/admin/**` requieren cabecera `Authorization: Bearer <token>` de un usuario con rol `ADMINISTRADOR`.

> [!IMPORTANT]
> El "rol" de un usuario **no es una columna** de la tabla `usuario`: lo determina en qué tabla hija tiene fila (`admin`/`docente`/`ayudante`/`estudiante`), siguiendo el diseño que ya usa `RegistroUsuarioController`. Por eso **no existe un endpoint para reasignar rol**: el rol queda fijado desde el registro (self-registro o creación por el admin), y lo único que hace el administrador es **aprobar** (activar) una cuenta de Docente/Operador pendiente — ver sección 3.8.

---

## 1. Resumen de Endpoints

| Método | Endpoint | Descripción | Acceso / Rol | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Iniciar sesión y obtener token JWT (expira en 30 min) | Público | `200`, `401`, `403` |
| **POST** | `/api/auth/registro-estudiante` | Auto-registro de estudiante con foto y generación de QR (correo institucional obligatorio, cuenta activa de inmediato) | Público | `201`, `400`, `409` |
| **POST** | `/api/auth/registro-personal` | Auto-registro de Docente u Operador/Ayudante (cuenta queda `PENDIENTE`, inactiva hasta que el administrador la active) | Público | `201`, `400`, `409` |
| **GET** | `/api/admin/roles` | Catálogo de roles con sus permisos básicos | Solo `ADMINISTRADOR` | `200`, `403` |
| **GET** | `/api/admin/usuarios` | Listar y filtrar todos los usuarios registrados | Solo `ADMINISTRADOR` | `200`, `403` |
| **GET** | `/api/admin/usuarios/{id}` | Consultar detalle de un usuario específico | Solo `ADMINISTRADOR` | `200`, `403`, `404` |
| **POST** | `/api/admin/usuarios` | Crear un nuevo usuario asignándole un rol inicial | Solo `ADMINISTRADOR` | `201`, `400`, `409` |
| **PUT** | `/api/admin/usuarios/{id}` | Editar información básica de un usuario | Solo `ADMINISTRADOR` | `200`, `400`, `404` |
| **PATCH** | `/api/admin/usuarios/{id}/estado` | Activar/Desactivar usuario, o aprobar uno pendiente (`ACTIVO`/`INACTIVO`) | Solo `ADMINISTRADOR` | `200`, `400`, `404` |
| **GET** | `/api/admin/auditoria` | Listar historial auditable de operaciones | Solo `ADMINISTRADOR` | `200`, `403` |

---

## 2. Formato Estandarizado de Errores

En caso de error, el backend devuelve el siguiente formato unificado en el cuerpo de la respuesta:

```json
{
  "codigo": 400,
  "error": "Bad Request",
  "mensaje": "Datos de entrada inválidos",
  "detalles": {
    "correo": "Debe ser un correo electrónico válido",
    "ci": "El CI es obligatorio"
  },
  "timestamp": "2026-09-11T22:30:00"
}
```

---

## 3. Detalle de Endpoints

### 3.1. Iniciar Sesión (Login)
- **Ruta:** `POST /api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Cuerpo de Petición:**
```json
{
  "correo": "admin@umss.edu",
  "contrasena": "Password123*"
}
```
- **Respuesta Exitosa (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tipoToken": "Bearer",
  "expiresIn": 1800000,
  "usuario": {
    "idUsuario": 1,
    "correo": "admin@umss.edu",
    "nombre": "Juan",
    "apellido": "Perez",
    "ci": "1234567 CB",
    "rol": "ADMINISTRADOR",
    "permisos": ["GESTION_USUARIOS", "GESTION_ROLES", "VER_AUDITORIA", "CONTROL_INGRESO"]
  }
}
```
- **Error por Credenciales Inválidas (`401 Unauthorized`):**
```json
{
  "codigo": 401,
  "error": "Unauthorized",
  "mensaje": "Contraseña incorrecta. Intento 3 de 5."
}
```
- **Error por Cuenta Bloqueada tras 5 intentos (`403 Forbidden`):**
```json
{
  "codigo": 403,
  "error": "Forbidden",
  "mensaje": "Cuenta bloqueada temporalmente por 5 intentos fallidos consecutivos. Contacte al administrador."
}
```

---

### 3.2. Auto-registro de Estudiante (con Foto y Generación de QR)
- **Ruta:** `POST /api/auth/registro-estudiante`
- **Tipo:** `multipart/form-data`
- **Parámetros del Formulario:**
  - `file`: Archivo de imagen de la foto del estudiante (.png o .jpg, obligatorio).
  - `nombre`: "Maria" (string, obligatorio)
  - `apellido`: "Lopez Gomez" (string, obligatorio)
  - `ci`: "8765432 CB" (string, obligatorio, único)
  - `correo`: "202308123@est.umss.edu" (string, obligatorio, único, **debe ser institucional**: dominio `umss.edu` o `est.umss.edu`, si no se devuelve `400`)
  - `contrasena`: "MiPasswordSeguro123" (string, obligatorio)
  - `codigoSis`: 202308123 (integer, obligatorio)
  - `telefono`: 71234567 (integer, opcional)
- La cuenta queda `rol: "ESTUDIANTE"` y **activa de inmediato** (puede iniciar sesión al toque).
- **Respuesta Exitosa (`201 Created`):**
```json
{
  "mensaje": "Estudiante registrado exitosamente",
  "idUsuario": 15,
  "idEstudiante": 8,
  "nombre": "Maria",
  "apellido": "Lopez Gomez",
  "ci": "8765432 CB",
  "correo": "202308123@est.umss.edu",
  "codigoSis": 202308123,
  "rol": "ESTUDIANTE",
  "fotoUrl": "https://res.cloudinary.com/zvgaadix/image/upload/v123456/estudiantes/abc123.jpg",
  "codigoQr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAA..."
}
```
> [!TIP]
> El campo `codigoQr` viene listo en formato Base64 Data URL para incrustarlo directamente en React: `<img src={respuesta.codigoQr} alt="QR de bienvenida" />`.

---

### 3.3. Auto-registro de Docente u Operador/Ayudante (pendiente de aprobación)
- **Ruta:** `POST /api/auth/registro-personal`
> [!IMPORTANT]
> No es `/api/auth/registro` — esa ruta ya la usa el registro genérico de la rama `testing` (`RegistroUsuarioController`, que permite elegir estudiante/docente/ayudante/admin y activa la cuenta de inmediato, sin aprobación). Esta ruta (`registro-personal`) es la alternativa específica de HU16 que sí deja la cuenta pendiente de aprobación y sí la conecta al catálogo de roles/permisos (`rol`, `/api/admin/roles`).
- **Headers:** `Content-Type: application/json`
- **Cuerpo de Petición:**
```json
{
  "nombre": "Carlos",
  "apellido": "Mamani Flores",
  "ci": "8765432 CB",
  "correo": "carlos.mamani@umss.edu",
  "contrasena": "MiPasswordSeguro123",
  "telefono": 78945612,
  "rolSolicitado": "DOCENTE"
}
```
> [!NOTE]
> `rolSolicitado` solo acepta `"DOCENTE"` u `"OPERADOR"` (Operador = Ayudante/Auxiliar). Cualquier otro valor (incluido `ADMINISTRADOR` o `ESTUDIANTE`) devuelve `400`. La cuenta se crea con **estado `INACTIVO`** — el usuario **no puede iniciar sesión** hasta que un administrador la active con `PATCH /api/admin/usuarios/{id}/estado`.

- **Respuesta Exitosa (`201 Created`):**
```json
{
  "mensaje": "Solicitud registrada. Su cuenta quedará activa cuando el administrador la apruebe.",
  "idUsuario": 20,
  "correo": "carlos.mamani@umss.edu",
  "rol": "DOCENTE",
  "estado": "PENDIENTE"
}
```
- Si intenta iniciar sesión antes de ser aprobado: `403 Forbidden` con mensaje de cuenta inactiva.

---

### 3.4. Obtener Catálogo de Roles y Permisos
- **Ruta:** `GET /api/admin/roles`
- **Headers:** `Authorization: Bearer <token>`
> [!NOTE]
> Es un catálogo **fijo en el backend** (no en base de datos): los 4 tipos de usuario son fijos (dan por las tablas hijas), así que sus permisos básicos también.
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "idRol": 1,
    "nombre": "ADMINISTRADOR",
    "descripcion": "Acceso total a la administración de usuarios, roles y auditoría",
    "permisos": ["GESTION_USUARIOS", "GESTION_ROLES", "VER_AUDITORIA", "CONTROL_INGRESO"]
  },
  {
    "idRol": 2,
    "nombre": "DOCENTE",
    "descripcion": "Gestión de exámenes y visualización de habilitaciones",
    "permisos": ["GESTION_EXAMENES", "VER_PERFIL_PROPIO"]
  },
  {
    "idRol": 3,
    "nombre": "OPERADOR",
    "descripcion": "Personal de control de ingreso en accesos y escaneo de QR",
    "permisos": ["CONTROL_INGRESO", "VER_PERFIL_PROPIO"]
  },
  {
    "idRol": 4,
    "nombre": "ESTUDIANTE",
    "descripcion": "Visualización de su código QR y estado de habilitación",
    "permisos": ["VER_PERFIL_PROPIO"]
  }
]
```

---

### 3.5. Listar Usuarios (Panel de Administración)
- **Ruta:** `GET /api/admin/usuarios`
- **Headers:** `Authorization: Bearer <token>`
- **Parámetros de Búsqueda Opcionales (Query Params):**
  - `?rol=DOCENTE`
  - `?estado=true` (booleano: `true`/`false`, no el string `"ACTIVO"`)
  - `?busqueda=carlos`
- **Respuesta Exitosa (`200 OK`):**
> [!NOTE]
> `estado` e `intentosFallidos` viajan tal cual están en la entidad `Usuario`: `estado` es **booleano** (`true` = activo, `false` = inactivo/pendiente de aprobación), no el string `"ACTIVO"`. `permisos` es la lista de nombres de permisos del rol actual del usuario.
```json
[
  {
    "idUsuario": 3,
    "ci": "8765432 CB",
    "nombre": "Carlos Eduardo",
    "apellido": "Mamani Flores",
    "telefono": 78945612,
    "correo": "carlos.mamani@umss.edu",
    "estado": true,
    "rol": "DOCENTE",
    "intentosFallidos": 0,
    "permisos": ["GESTION_EXAMENES", "VER_PERFIL_PROPIO"]
  },
  {
    "idUsuario": 1,
    "ci": "14583487",
    "nombre": "Ana",
    "apellido": "Rodriguez",
    "telefono": 60712345,
    "correo": "ana.admin@umss.edu",
    "estado": true,
    "rol": "ADMINISTRADOR",
    "intentosFallidos": 0,
    "permisos": ["GESTION_USUARIOS", "GESTION_ROLES", "VER_AUDITORIA", "CONTROL_INGRESO"]
  }
]
```
- **`GET /api/admin/usuarios/{id}`** devuelve el mismo shape, un solo objeto (`404` si no existe).

---

### 3.6. Crear Usuario por el Administrador
- **Ruta:** `POST /api/admin/usuarios`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Cuerpo de Petición:**
```json
{
  "nombre": "Roberto",
  "apellido": "Vargas Siles",
  "ci": "4567890 CB",
  "correo": "roberto.operador@umss.edu",
  "contrasena": "Temporal123*",
  "telefono": 70788990,
  "rol": "OPERADOR"
}
```
> [!NOTE]
> `rol` solo acepta `"ADMINISTRADOR"`, `"DOCENTE"` u `"OPERADOR"` (400 en cualquier otro valor). No se puede crear un `"ESTUDIANTE"` por acá: los estudiantes siempre se auto-registran con foto y QR (sección 3.2).
- La cuenta creada por el administrador queda **activa de inmediato** (`estado: true`), sin pasar por aprobación.
- **Respuesta Exitosa (`201 Created`):** mismo shape de `UsuarioRespuestaDto` que la sección 3.5 (con `estado: true`).

---

### 3.7. Editar Datos Básicos de un Usuario
- **Ruta:** `PUT /api/admin/usuarios/{id}`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Cuerpo de Petición:**
```json
{
  "nombre": "Roberto",
  "apellido": "Vargas Siles",
  "correo": "roberto.operador@umss.edu",
  "telefono": 70788990
}
```
- No cambia el rol (no existe esa operación, ver nota al inicio del documento) ni el estado (para eso usar 3.8). Si el `correo` cambia y ya está en uso por otro usuario, responde `409`.
- **Respuesta Exitosa (`200 OK`):** mismo shape de `UsuarioRespuestaDto` que la sección 3.5, ya actualizado.

---

### 3.8. Desactivar / Activar Usuario (Cambio de Estado)
- **Ruta:** `PATCH /api/admin/usuarios/{id}/estado`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Cuerpo de Petición:**
```json
{
  "nuevoEstado": "INACTIVO"
}
```
- **Respuesta Exitosa (`200 OK`):**
```json
{
  "mensaje": "Estado de usuario actualizado exitosamente",
  "idUsuario": 16,
  "estado": "INACTIVO"
}
```
> [!TIP]
> Este mismo endpoint con `"nuevoEstado": "ACTIVO"` es como el administrador **aprueba** una cuenta de Docente/Operador que se autorregistró por `POST /api/auth/registro-personal` (sección 3.3) y quedó pendiente.

---

### 3.9. Consultar Historial de Auditoría
- **Ruta:** `GET /api/admin/auditoria`
- **Headers:** `Authorization: Bearer <token>`
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "idAuditoria": 105,
    "tipoOperacion": "DESACTIVACION_USUARIO",
    "usuarioEjecutor": "admin@umss.edu",
    "usuarioAfectado": "roberto.operador@umss.edu",
    "detalles": "El administrador cambió el estado del usuario de ACTIVO a INACTIVO",
    "ipOrigen": "192.168.1.15",
    "fechaHora": "2026-09-11T22:35:12"
  },
  {
    "idAuditoria": 104,
    "tipoOperacion": "LOGIN_FALLIDO",
    "usuarioEjecutor": "SISTEMA",
    "usuarioAfectado": "carlos.mamani@umss.edu",
    "detalles": "Intento fallido de inicio de sesión con contraseña incorrecta (intento 5). Cuenta bloqueada temporalmente.",
    "ipOrigen": "190.181.20.4",
    "fechaHora": "2026-09-11T22:30:45"
  }
]
```
