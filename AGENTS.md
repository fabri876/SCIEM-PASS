# AGENTS.md — Sistema de Control de Ingreso a Exámenes Masivos (WindSoft)

Este archivo da contexto permanente a cualquier agente de IA que trabaje en este repositorio. Para la explicación completa y detallada de la arquitectura, ver `docs/Explicacion-Arquitectura-Detallada.md`.

## Qué es este proyecto

Sistema web para automatizar el control de ingreso de estudiantes a exámenes masivos: verifica identidad, comprueba habilitación, registra hora de ingreso, evita duplicados, genera reportes. Proyecto académico (UMSS, materia TIS), equipo de 8 personas, 4 sprints.

## Stack tecnológico

- Backend: Java 21, Spring Boot 4.1.1, Maven (con Maven Wrapper `mvnw`)
- Frontend: React + Vite, Tailwind CSS
- Base de datos: PostgreSQL (Supabase en desarrollo, servidor del Laboratorio DIS en producción)
- Autenticación planeada: JWT (todavía no implementada)

## Arquitectura: monolito modular en 3 capas

No usar microservicios ni sobre-diseñar. El sistema corre en un solo servidor de laboratorio con un equipo pequeño — la complejidad debe justificarse.

### Estructura del backend (paquete base: `bo.edu.umss.windsoft.control_ingreso_backend`)

```
presentacion/     → Controladores REST (@RestController). Sin lógica de negocio.
aplicacion/       → Servicios de caso de uso (@Service). Coordina el flujo.
dominio/          → Entidades (@Entity) y reglas de negocio puras.
persistencia/     → Repositorios (@Repository, JpaRepository). Único lugar que habla con la BD.
infraestructura/  → Configuración transversal: CORS, seguridad, auditoría.
```

Reglas:
- Nunca escribir SQL fuera de `persistencia/`.
- Nunca poner lógica de negocio en `presentacion/`.
- Cada nueva funcionalidad (Historia de Usuario) suele tocar las 4 capas de negocio a la vez (controller → service → repository → entity).

### Estructura del frontend

```
src/
├── pages/
│   ├── admin/      → pantallas del rol Administrador
│   ├── docente/    → pantallas del rol Docente
│   ├── control/    → pantallas del rol Personal de Control (mobile-first)
│   └── Login.jsx   → login único, compartido por los 3 roles
├── components/     → UI reutilizable entre roles
├── services/       → llamadas fetch al backend, centralizadas (no hacer fetch directo en componentes)
├── hooks/          → lógica reutilizable con React Hooks
└── offline/        → Service Worker + IndexedDB (pendiente, ver ADR-6)
```

Nota: el Estudiante es el sujeto del proceso, no un usuario del sistema — no tiene pantalla ni login propio.

## Decisiones ya tomadas (no proponer alternativas sin justificar por qué la actual no sirve)

- Motor de BD: PostgreSQL (no MySQL) — mejor soporte de constraints para evitar duplicados.
- Comunicación cliente-servidor: REST + JSON (no GraphQL).
- Tiempo real del dashboard: polling simple (no WebSocket) por ahora.
- Prevención de ingresos duplicados: constraint UNIQUE en BD + transacción atómica — la validación en código sola no basta.
- Modo offline (Personal de Control): PWA con Service Worker + IndexedDB + endpoint de sincronización idempotente (`POST /api/sync/ingresos`). PostgreSQL es siempre la autoridad final.

## Seguridad — estado actual (importante, no asumir que ya está terminado)

`SecurityConfig.java` tiene actualmente `permitAll()` en `/api/**` como medida **temporal**, mientras no existe JWT real. No la tomar como diseño final. Cuando se implemente JWT (HU16):
- Login público (`/api/auth/login`), el resto exige token válido.
- Verificar rol además del token (`hasRole(...)`), no solo autenticación.
- Contraseñas siempre con hashing (BCrypt), nunca en texto plano.

## Manejo de credenciales — no romper este patrón

- `application.yaml` → se sube a Git, sin contraseñas.
- `application-local.yaml` → NO se sube a Git (está en `.gitignore`), contiene la contraseña real de la BD.
- Nunca escribir una contraseña o secreto directo en `application.yaml`, `.env` versionado, o cualquier archivo que se suba al repositorio.

## Convenciones de Git

- Rama de trabajo actual: `testing` (no comitear directo a `main` sin acuerdo del equipo).
- Mensajes de commit con prefijo tipo Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- No incluir tildes/ñ en los mensajes de commit (evita problemas de encoding en Git Bash/Windows).

## Entorno de desarrollo

- JDK 21 (el proyecto no debe usar Java 25 ni otra versión distinta a la fijada en `pom.xml`).
- Node.js 20.19.0 (versión exacta usada en el Laboratorio DIS).
- Backend se corre con: `./mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"`.
- Frontend se corre con: `npm run dev` (dentro de `control-ingreso-frontend/`).

## Antes de proponer cambios estructurales

Este proyecto sigue una guía formal de arquitectura con ADRs documentados (ver `docs/Explicacion-Arquitectura-Detallada.md`, sección 7). Si una tarea pareciera requerir apartarse de estas decisiones (por ejemplo, agregar un nuevo servicio externo, cambiar el estilo arquitectónico, o introducir una tecnología no listada aquí), señalarlo explícitamente en vez de hacerlo silenciosamente.