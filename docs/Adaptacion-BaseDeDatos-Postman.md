# Adaptación a la Base de Datos y Guía de Pruebas Postman (SCIEM-PASS)

Este documento resume la simplificación y adaptación final del **Backend** y **Frontend** para alinearlos con la estructura oficial de la base de datos PostgreSQL 17 / Supabase, y la guía paso a paso para probar los endpoints de **Registro** e **Inicio de Sesión (Login)** desde **Postman**.

---

## 1. Resumen de Cambios Realizados

### Backend (Spring Boot / JPA)

1. **Simplificación del Mapeo de Entidades**:
   - **`Estudiante`**: Mapeado a la tabla `estudiante` con clave primaria `idusuario` y campo `codsisestudiante` e `idcambio`.
   - **`Docente`**: Mapeado a la tabla `docente` con clave primaria `idusuario` y campo `codsisdocente`.
   - **`Ayudante`**: Mapeado a la tabla `ayudante` con clave primaria `idusuario` y campo `idayudante`.
   - **`Admin`**: Mapeado a la tabla `admin` con clave primaria `idusuario` y campo `idadmin`.
   - **`Usuario`**: Mapea a la tabla `usuario` (`idusuario`, `idcredencial`, `ciusuario`, `nombreusuario`, `apellidousuario`, `telefonousuario`, `correousuario`, `contraseniausuario`, `estadousuario`). Se colocaron campos de control como `@Transient` para mayor estabilidad.
   - **`Auditoria`**: Mapeado a la tabla `historialauditoria` (`idauditoria`, `idusuario`, `accion`, `fechaaccion`).

2. **Extracción de `codigoSis`**:
   - `RegistroUsuarioService` extrae el `codigoSis` ingresado voluntariamente en el registro para estudiantes y docentes y lo inserta en `codsisestudiante` / `codsisdocente`. Si no ingresó uno, toma el `idusuario` como valor por defecto.

3. **Repositorios y Servicios**:
   - Todos los repositorios de roles (`AdminRepository`, `DocenteRepository`, `AyudanteRepository`, `EstudianteRepository`) extienden `JpaRepository<..., Integer>` directamente sobre `idusuario`, eliminando cualquier conflicto de ClassLoader en tiempo de ejecución.

### Frontend (React + Vite)

1. **Redirección de Login**:
   - Al logearse, [LoginForm.jsx](file:///c:/proyectos/SCIEM-PASS/control-ingreso-frontend/src/components/login/LoginForm.jsx) redirige automáticamente al usuario según su rol (`/admin`, `/home/docente`, `/control`, `/estudiante`) sin necesidad de recargar.

2. **Control de Inactividad de 30 Minutos**:
   - [authService.js](file:///c:/proyectos/SCIEM-PASS/control-ingreso-frontend/src/services/authService.js) y [App.jsx](file:///c:/proyectos/SCIEM-PASS/control-ingreso-frontend/src/App.jsx) monitorean eventos del usuario. Tras 30 minutos sin uso, la sesión se expira automáticamente y redirige a `/login`.

---

## 2. Guía de Pruebas en Postman (Paso a Paso)

- **URL Base**: `http://localhost:8080`

---

### Endpoint 1: Registro de Usuario

- **Método**: `POST`
- **URL**: `http://localhost:8080/api/auth/registro`
- **Headers**:
  - `Content-Type`: `application/json`

#### Body (JSON) - Estudiante con Código SIS:
```json
{
  "primerNombre": "Carlos",
  "segundoNombre": "Alberto",
  "apellidoPaterno": "Perez",
  "apellidoMaterno": "Gomez",
  "telefono": "71234567",
  "correo": "carlos.perez@est.umss.edu",
  "contrasena": "password123",
  "carnetIdentidad": "12345678",
  "codigoSis": "202301999",
  "roles": ["estudiante"]
}
```

#### Body (JSON) - Docente con Código SIS:
```json
{
  "primerNombre": "Maria",
  "segundoNombre": "Elena",
  "apellidoPaterno": "Torres",
  "apellidoMaterno": "Rojas",
  "telefono": "76543210",
  "correo": "maria.torres@umss.edu",
  "contrasena": "password123",
  "carnetIdentidad": "87654321",
  "codigoSis": "201000123",
  "roles": ["docente"]
}
```

#### Respuesta Esperada (200 OK):
```json
{
  "id": 1,
  "ci": "12345678",
  "nombre": "Carlos Alberto",
  "apellido": "Perez Gomez",
  "correo": "carlos.perez@est.umss.edu",
  "telefono": 71234567,
  "roles": ["estudiante"],
  "estado": true,
  "mensaje": "Usuario registrado exitosamente en el sistema."
}
```

---

### Endpoint 2: Inicio de Sesión (Login)

- **Método**: `POST`
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**:
  - `Content-Type`: `application/json`

#### Body (JSON):
```json
{
  "correo": "carlos.perez@est.umss.edu",
  "contrasena": "password123"
}
```

#### Respuesta Esperada (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tipoToken": "Bearer",
  "expiresIn": 86400000,
  "usuario": {
    "id": 1,
    "ci": "12345678",
    "nombre": "Carlos Alberto",
    "apellido": "Perez Gomez",
    "correo": "carlos.perez@est.umss.edu",
    "telefono": 71234567,
    "rol": "ESTUDIANTE",
    "estado": true
  }
}
```

---

### Resumen de Roles y Redirecciones

| Rol Seleccionado | Rol Devuelto en Login | Ruta Frontend |
| :--- | :--- | :--- |
| `"estudiante"` | `"ESTUDIANTE"` | `/estudiante` |
| `"docente"` | `"DOCENTE"` | `/home/docente` |
| `"ayudante"` | `"OPERADOR"` | `/control` |
| `"admin"` | `"ADMINISTRADOR"` | `/admin` |
