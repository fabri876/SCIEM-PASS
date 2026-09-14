# Documentación Técnica — Servicio de Autenticación y Login (`AuthService`)

**Módulo:** Control de Ingreso a Exámenes Masivos (SCIEM-PASS / WindSoft)  
**Ubicación de la Clase:** `bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuthService`  
**Capa:** Aplicación (`@Service`)  

---

## 1. Responsabilidad del Servicio

`AuthService` coordina la lógica de negocio para la autenticación y el autorregistro de usuarios en el sistema SCIEM-PASS:

1. **Autenticación (Login)** con verificación de credenciales encriptadas con BCrypt.
2. **Control de Intentos Fallidos** y bloqueo preventivo tras 5 intentos erróneos consecutivos.
3. **Restricción de Acceso** para cuentas inactivas o pendientes de aprobación.
4. **Generación de Tokens JWT** conteniendo identificador, correo, rol resolvedor y nombre.
5. **Auto-registro de Estudiantes** con validación de correo institucional (`@umss.edu` / `@est.umss.edu`), subida de foto a Cloudinary y generación del código QR inicial.
6. **Auto-registro de Personal (Docente/Ayudante)** dejando la cuenta en estado `PENDIENTE` (`estadousuario = false`) para aprobación del Administrador.
7. **Auditoría Transversal** de todas las operaciones registradas con IP de origen.

---

## 2. Componentes e Inyección de Dependencias

```
                               ┌─────────────────────────┐
                               │     AuthController      │
                               └───────────┬─────────────┘
                                           │
                               ┌───────────▼─────────────┐
                               │       AuthService       │
                               └───────────┬─────────────┘
            ┌──────────────────────┬───────┼───────┬──────────────────────┐
            │                      │               │                      │
┌───────────▼───────────┐  ┌───────▼───────┐  ┌────▼────┐  ┌──────────────▼─────────────┐
│   UsuarioRepository   │  │PasswordEncoder│  │JwtToken-│  │      AuditoriaService       │
│ EstudianteRepository  │  └───────────────┘  │Provider │  └────────────────────────────┘
│   DocenteRepository   │                     └─────────┘
│  AyudanteRepository   │
└───────────────────────┘
```

---

## 3. Detalle Métodos Principales

### 3.1. `login(String correo, String contrasena, String ip)`

- **Entrada:** Correo, contraseña en texto plano, dirección IP del cliente.
- **Salida:** `LoginResponseDto` (token JWT, `tipoToken: "Bearer"`, expiración ms, DTO del usuario).
- **Flujo de Excepciones:**
  - `CredencialesInvalidasException` (401): Si el correo no existe en la BD.
  - `CuentaBloqueadaException` (403): Si `usuario.isBloqueado()` es `true` (5 intentos fallidos acumulados).
  - `CuentaInactivaException` (403): Si `usuario.getEstadousuario()` es `false` (pendiente de aprobación por el Admin).
  - `CredencialesInvalidasException` (401): Si la contraseña no coincide. Incrementa `intentosFallidos`. Al llegar a 5, bloquea la cuenta y registra auditoría `CUENTA_BLOQUEADA`.
- **Éxito:** Resetea `intentosFallidos` a `0`, genera el token JWT y devuelve el resultado con auditoría `LOGIN_EXITOSO`.

### 3.2. `registrarEstudiante(...)`

- Valida dominio de correo institucional mediante expresión regular `(?i)@(est\.)?umss\.edu$`.
- Verifica unicidad de CI y correo (`validarUnicidad`).
- Sube la foto del estudiante a Cloudinary (`CloudinaryService`).
- Guarda la entidad `Usuario` y genera el código QR (`EST:<CI>:<codigoSis>`).
- Guarda la entidad `Estudiante` vinculada al `Usuario`.

### 3.3. `registrarDocenteOAyudante(...)`

- Valida que el `rolSolicitado` sea `DOCENTE` u `OPERADOR`.
- Crea el `Usuario` con `estadousuario = false` (cuenta inactiva / pendiente).
- Crea la fila correspondiente en la tabla hija `docente` o `ayudante`.
- El usuario no puede hacer login hasta que el administrador ejecute `PATCH /api/admin/usuarios/{id}/estado`.

---

## 4. Clases Relacionadas en el Módulo

- **Controlador REST:** `bo.edu.umss.windsoft.control_ingreso_backend.presentacion.AuthController`
- **Filtro JWT:** `bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtAuthenticationFilter`
- **Proveedor JWT:** `bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtTokenProvider`
- **Pruebas Unitarias:** `bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuthServiceTest`
