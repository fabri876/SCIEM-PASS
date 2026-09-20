# Documentación de Endpoints y Carga Masiva de Usuarios

Este documento resume los cambios implementados en el backend y frontend para la gestión de usuarios, carga masiva, permisos por rol y asignación automática de contraseñas.

---

## 1. Resumen de Reglas de Negocio Implementadas

1. **Contraseña por defecto (CI)**:
   - Tanto en el **registro individual** como en la **carga masiva**, si no se proporciona contraseña (o si el usuario se registra a través de los formularios actualizados), la contraseña inicial del usuario es automáticamente su **Carnet de Identidad (CI)** (almacenada con hashing BCrypt).
   - En el frontend (`RegistroForm.jsx` y `UsuarioFormModal.jsx`), se removió la solicitud del campo contraseña para simplificar el flujo.

2. **Matriz de Permisos por Rol**:

| Rol del Usuario Autenticado | Permiso Registro Individual | Permiso Carga Masiva |
| :--- | :--- | :--- |
| **ADMINISTRADOR** | `ADMINISTRADOR`, `DOCENTE`, `AYUDANTE`, `ESTUDIANTE` | `ADMINISTRADOR`, `DOCENTE`, `AYUDANTE`, `ESTUDIANTE` |
| **DOCENTE** | `AYUDANTE`, `ESTUDIANTE` | Exclusivamente `ESTUDIANTE` |
| **AYUDANTE (OPERADOR)** | Ninguno (HTTP 403 Forbidden) | Ninguno (HTTP 403 Forbidden) |
| **ESTUDIANTE** | Ninguno (HTTP 403 Forbidden) | Ninguno (HTTP 403 Forbidden) |

3. **Carga Masiva (Excel / PDF)**:
   - Formatos permitidos: Excel (`.xlsx`, `.xls`) y PDF (`.pdf`).
   - Tamaño máximo: 10 MB.
   - Procesamiento fila por fila:
     - Valida presencia de CI, Nombres, Apellidos, Correo y Código SIS (obligatorio para Docente y Estudiante).
     - Evita duplicados en la BD y dentro del propio archivo (CI, Correo, Código SIS).
     - Almacena en PostgreSQL los registros válidos con `idregistrador` asociado al usuario en sesión.
     - Retorna un resumen con total procesado, exitosos, fallidos y detalle explícito de errores por número de fila.

---

## 2. Endpoints Backend de Prueba

### 2.1. Inicio de Sesión (Login)
Obtiene el token JWT necesario para autenticarse en los demás endpoints.

- **Método**: `POST`
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**: `Content-Type: application/json`

**Body JSON:**
```json
{
  "correo": "admin@umss.edu",
  "contrasena": "12345678"
}
```

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@umss.edu","contrasena":"12345678"}'
```

---

### 2.2. Registro Individual de Usuario (Sin Contraseña requerida)
Permite a un Administrador o Docente registrar un usuario individual. Si no se envía contraseña, la contraseña inicial se fija automáticamente en su CI.

- **Método**: `POST`
- **URL**: `http://localhost:8080/api/usuarios/registro-individual`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <TOKEN_JWT>`

**Body JSON (Ejemplo Estudiante):**
```json
{
  "nombre": "Carlos Alberto",
  "apellido": "Gutiérrez Mendieta",
  "ci": "88776655",
  "correo": "carlos.gutierrez@est.umss.edu",
  "telefono": 71234567,
  "rol": "ESTUDIANTE",
  "codigoSis": 202600101
}
```

**Body JSON (Ejemplo Docente):**
```json
{
  "nombre": "Maria Elena",
  "apellido": "Torres Rocha",
  "ci": "55443322",
  "correo": "maria.torres@fcyt.umss.edu",
  "telefono": 76543210,
  "rol": "DOCENTE",
  "codigoSis": 20269999
}
```

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:8080/api/usuarios/registro-individual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -d '{
    "nombre": "Carlos Alberto",
    "apellido": "Gutiérrez Mendieta",
    "ci": "88776655",
    "correo": "carlos.gutierrez@est.umss.edu",
    "telefono": 71234567,
    "rol": "ESTUDIANTE",
    "codigoSis": 202600101
  }'
```

---

### 2.3. Carga Masiva de Usuarios (Excel / PDF)
Procesa un archivo en lote (`.xlsx`, `.xls` o `.pdf`).

- **Método**: `POST`
- **URL**: `http://localhost:8080/api/usuarios/carga-masiva`
- **Headers**: 
  - `Authorization: Bearer <TOKEN_JWT>`
- **Body**: `multipart/form-data`
  - `archivo`: (Archivo `.xlsx`, `.xls` o `.pdf`)
  - `rol`: `ESTUDIANTE` (Opcional, por defecto `ESTUDIANTE`)

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:8080/api/usuarios/carga-masiva \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -F "archivo=@/ruta/a/lista_estudiantes.xlsx" \
  -F "rol=ESTUDIANTE"
```

**Estructura esperada en Excel/PDF (Columnas):**
| Col. A | Col. B | Col. C | Col. D | Col. E | Col. F |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CODSIS** | **CORREO** | **CI** | **APELLIDOS** | **NOMBRES** | **TELEFONO** (Opcional) |
| 20260101 | juan.perez@est.umss.edu | 7788990 | Perez Claros | Juan | 71122334 |
| 20260102 | ana.gomez@est.umss.edu | 7788991 | Gomez Rios | Ana | 72233445 |

**Ejemplo de Respuesta JSON:**
```json
{
  "mensaje": "2 usuario(s) registrados exitosamente.",
  "totalProcesados": 2,
  "exitosos": 2,
  "fallidos": 0,
  "detallesErrores": []
}
```

Si hay filas con errores (por ejemplo correo duplicado o CI faltante):
```json
{
  "mensaje": "1 usuario(s) registrados exitosamente, 1 con errores.",
  "totalProcesados": 2,
  "exitosos": 1,
  "fallidos": 1,
  "detallesErrores": [
    {
      "fila": 3,
      "ci": "7788991",
      "correo": "ana.gomez@est.umss.edu",
      "errores": [
        "Ya existe un usuario en la BD con el correo 'ana.gomez@est.umss.edu'."
      ]
    }
  ]
}
```

---

### 2.4. Cambio de Contraseña Seguro
Permite a cualquier usuario autenticado actualizar su propia contraseña ingresando su contraseña actual y una nueva.

- **Método**: `POST`
- **URL**: `http://localhost:8080/api/auth/cambiar-contrasena`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <TOKEN_JWT>`

**Body JSON:**
```json
{
  "contrasenaActual": "88776655",
  "nuevaContrasena": "MiNuevaClaveSegura2026"
}
```

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:8080/api/auth/cambiar-contrasena \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -d '{
    "contrasenaActual": "88776655",
    "nuevaContrasena": "MiNuevaClaveSegura2026"
  }'
```

**Ejemplo de Respuesta JSON:**
```json
{
  "mensaje": "Contraseña actualizada exitosamente."
}
```

---

## 3. Pruebas de Validación de Permisos por Rol

1. **Intento de Docente registrando Administrador**:
   - Autenticarse como Docente, enviar `POST /api/usuarios/registro-individual` con `"rol": "ADMINISTRADOR"`.
   - **Resultado esperado**: HTTP `403 Forbidden` con mensaje `"Permiso insuficiente: Un docente solo puede registrar usuarios con rol Ayudante o Estudiante."`.

2. **Intento de Docente realizando Carga Masiva para Docentes**:
   - Autenticarse como Docente, enviar `POST /api/usuarios/carga-masiva` con `rol=DOCENTE`.
   - **Resultado esperado**: HTTP `403 Forbidden` con mensaje `"Permiso insuficiente: Un docente solo puede realizar carga masiva para el rol Estudiante."`.

3. **Intento de Ayudante o Estudiante**:
   - Autenticarse como Ayudante o Estudiante y llamar a cualquier endpoint de `/api/usuarios/*`.
   - **Resultado esperado**: HTTP `403 Forbidden` con mensaje `"Acceso denegado: no cuenta con los permisos necesarios para realizar esta acción."`.
