# AGENTS.md — SCIEM-PASS (Sistema de Control de Ingreso a Exámenes Masivos - UMSS)

Este archivo da contexto permanente a cualquier agente de IA que trabaje en este repositorio. Para el detalle histórico de arquitectura y ADRs, ver `docs/Explicacion-Arquitectura-Detallada.md`; para despliegue con Docker en laboratorio, ver `READMEDEPLOY.md`.

## Qué es este proyecto

**SCIEM-PASS** es un sistema web y móvil para automatizar el control de ingreso de estudiantes a exámenes masivos en la **UMSS** (materia TIS, equipo WindSoft): verifica identidad (QR y verificación facial), comprueba habilitación, registra asistencia/ingresos evitando duplicados, gestiona incidencias, expulsiones y reportes, y soporta operación **offline** con sincronización posterior.

## Stack tecnológico actual

- **Backend**: Java 21, Spring Boot 4.1.1, Maven (`mvnw` / `mvnw.cmd`).
  - Seguridad: Spring Security + **JWT** (`jjwt` 0.12.6), hashing de contraseñas con **Argon2id** (y soporte legado `BCrypt` vía `DelegatingPasswordEncoder`).
  - Persistencia: PostgreSQL (PostgreSQL 17 en Docker / Supabase en desarrollo), Spring Data JPA (`ddl-auto: validate` en `application.yaml`, `none` en `docker`).
  - Utilidades: Apache POI (Excel), Apache PDFBox (PDF), ZXing (QR), Cloudinary + almacenamiento local en disco (`LocalDiskStorage`).
- **Frontend**: React 19, Vite 8, React Router 7, Tailwind CSS 4, `oxlint`.
  - Offline y PWA: `vite-plugin-pwa`, IndexedDB (`dexie`), Service Worker y cola de sincronización.
  - Biometría y QR: `@vladmandic/human` (verificación facial), `html5-qrcode`, `qrcode.react`.
  - Móvil Android: **Capacitor 8** (`control-ingreso-frontend/android/`), `@capacitor-community/sqlite`, `@capacitor-community/camera-preview`.
- **Despliegue**: Docker Compose (`docker-compose.yml`) con servicios `db` (`postgres:17-alpine`), `backend`, y `frontend` (Nginx como servidor estático y proxy inverso `/api/`), más scripts de respaldo/restauración en `deploy/`.

## Arquitectura: monolito modular por capas

No usar microservicios ni sobre-diseñar. El sistema corre en un solo servidor de laboratorio (o contenedor Docker) — cualquier complejidad adicional debe justificarse.

### Estructura del backend (`bo.edu.umss.windsoft.control_ingreso_backend`)

```text
presentacion/     → Controladores REST (@RestController), dto/ y validacion/. Sin lógica de negocio.
aplicacion/       → Servicios de caso de uso (@Service) y dto/. Coordina el flujo.
dominio/          → Entidades (@Entity), reglas de negocio puras y exception/.
persistencia/     → Repositorios (@Repository, JpaRepository) y migraciones/. Único lugar que habla con la BD.
infraestructura/  → Configuración transversal: SecurityConfig, security/ (JWT y filtros), storage/, CORS, excepciones, pool.
backup/           → Respaldos programados/manuales de BD y evidencias (BackupController, BackupService, etc.).
```

Reglas:
- Nunca escribir SQL fuera de `persistencia/` (las migraciones SQL documentadas están en `docs/migraciones/` y `docs/sql/`).
- Nunca poner lógica de negocio en `presentacion/`.
- Cada nueva funcionalidad suele tocar las capas `presentacion → aplicacion → dominio → persistencia`.

### Estructura del frontend (`control-ingreso-frontend/src/`)

```text
src/
├── pages/
│   ├── admin/        → Pantallas del rol Administrador
│   ├── docente/      → Pantallas del rol Docente
│   ├── control/      → Pantallas del rol Personal de Control / Operador (mobile-first)
│   ├── estudiante/   → Portal del Estudiante (QR, exámenes, enrolamiento/verificación facial)
│   ├── credencial/   → Gestión de credenciales
│   ├── examenesHome/ → Vistas públicas de próximos exámenes, cambios y biblioteca de exámenes pasados
│   └── LoginPage.jsx, HomePage.jsx, RegistroPage.jsx, RegistroExamenPage.jsx
├── components/       → UI reutilizable entre roles
├── services/         → Llamadas fetch centralizadas al backend y apiConfig.js (no hacer fetch directo en componentes)
├── hooks/            → Lógica reutilizable con React Hooks
├── offline/          → IndexedDB (Dexie), SQLite (Capacitor), cola de sincronización, motor de validación local, PIN offline y SW
├── config/           → Configuración del cliente
└── utils/            → Utilidades (CSV, contraseñas, texto, etc.)
```

## Decisiones ya tomadas (no proponer alternativas sin justificar)

- **Base de datos**: PostgreSQL — restricciones `UNIQUE` y transacciones atómicas como autoridad final para evitar ingresos duplicados.
- **API**: REST + JSON (sin GraphQL).
- **Tiempo real en monitoreo**: polling periódico (sin WebSockets).
- **Modo offline**: PWA (IndexedDB + Service Worker) y soporte Capacitor/SQLite en Android, con endpoints de sincronización idempotentes (`/api/sync/**`). PostgreSQL es siempre la fuente de verdad final.

## Seguridad — estado actual

La autenticación y autorización ya están activas en `SecurityConfig.java`:
- Sesión **stateless** con JWT (`JwtAuthenticationFilter`), más filtros `CambioContrasenaObligatorioFilter` y `ClientVersionFilter`.
- Rutas públicas acotadas (`/api/auth/**` excepto `/api/auth/cambiar-contrasena` y `/api/auth/registro*` denegado, `/api/ping`, `/api/v1/health`, `/api/publico/examenes/**`).
- Autorización por roles (`ADMINISTRADOR`, `DOCENTE`, `OPERADOR`, y rutas autenticadas compartidas) tanto en `SecurityConfig.java` como mediante `@EnableMethodSecurity`.
- Contraseñas hasheadas con **Argon2id** (`PasswordEncoderConfig.java` + `ConcurrenciaPasswordEncoder`), manteniendo compatibilidad de lectura con `BCrypt`.

## Manejo de credenciales y archivos sensibles

- `application.yaml` → se sube a Git, sin contraseñas; importa `optional:application-local.yaml`.
- `application-local.yaml` → NO se sube a Git (`.gitignore`), contiene credenciales locales.
- `.env` (raíz) → NO se sube a Git (`.gitignore`), contiene variables para Docker Compose (`DB_*`, `JWT_SECRET`, `PUBLIC_ORIGIN`, `WEB_PORT`). Usar `.env.example` como plantilla.
- `backups/`, `datos-privados/`, `*.dump`, `*.tar.gz`, `control-ingreso-backend/storage/` → ignorados en `.gitignore`.
- Nunca escribir contraseñas, tokens o secretos en archivos versionados.

## Convenciones de Git

- No comitear directo a `main` sin acuerdo del equipo (trabajar en ramas de feature / `testing`).
- Mensajes de commit estilo Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- No incluir tildes ni `ñ` en los mensajes de commit (evita problemas de encoding en Git Bash/Windows).

## Entorno de desarrollo y comandos útiles

- **JDK**: Java 21 (fijado en `pom.xml`; no usar otra versión).
- **Node.js**: `20.19.0` (definido en `control-ingreso-frontend/.nvmrc`).
- **Backend local** (desde `control-ingreso-backend/`):
  - `./mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"`
- **Frontend web** (desde `control-ingreso-frontend/`):
  - `npm run dev` (desarrollo)
  - `npm run lint` (`oxlint`)
  - `npm run build` (producción web)
  - `npm run build:apk` / `npm run build:apk:prod` (compilar y sincronizar Capacitor Android)
  - Scripts de verificación en `control-ingreso-frontend/scripts/` (`npm run check:admin`, `check:hu13`, `check:hu15`, `check:interfaz`, `check:responsive`, etc.)
- **Despliegue Docker** (desde la raíz):
  - `docker compose up -d --build` (ver detalles y restauración de datos en `READMEDEPLOY.md`).

## Antes de proponer cambios estructurales

Este proyecto cuenta con documentación de arquitectura y contratos en `docs/` (ver `docs/Explicacion-Arquitectura-Detallada.md`). Si una tarea requiere apartarse de las decisiones establecidas (nuevo servicio externo, cambio de estilo arquitectónico o nueva tecnología), señalarlo explícitamente antes de implementarlo.
