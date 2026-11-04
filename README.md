# SCIEM-PASS
Este repositorio está destinado un Sistema de Control de Ingreso a Exámenes Masivos (SCIEM), para la Universidad Mayor de San Simón, desarrollado por la Grupo-Empresa: WindSoft.

## Ejecutar el proyecto en desarrollo

Requisitos: **JDK 21**, **Node.js 20.19.0** y la configuración privada del backend
en `control-ingreso-backend/src/main/resources/application-local.yaml`.

Abre **dos terminales**, partiendo desde la raíz del repositorio.

**Terminal 1 — backend en Git Bash:**

```bash
cd control-ingreso-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

El backend normalmente escucha en `http://localhost:8080`. La terminal debe
permanecer abierta. Para detenerlo, pulsa `Ctrl+C`.

**Terminal 2 — frontend:**

```bash
cd control-ingreso-frontend
npm ci
npm run dev
```

`npm ci` se necesita la primera vez y cuando cambian las dependencias. Para los
siguientes arranques basta con `npm run dev`. Abre la dirección que indique Vite.

**[Guía de ejecución y actualización del proyecto](docs/Guia-Ejecucion.md):**
primera instalación, comandos para PowerShell/CMD, qué hacer al traer cambios de
`testing`, migraciones de BD y cómo resolver problemas habituales del editor.
## Catálogo por carrera y nivel

La importación de horarios y los filtros carrera → nivel → asignatura se describen
en [Carreras, niveles y notificaciones](docs/Carreras-Niveles-Notificaciones.md).
Antes de ejecutar esta versión sobre otra BD, aplique la migración
`2026-10-31_carreras_niveles.sql` de `persistencia/migraciones` después de las
migraciones de semestres. Los Excel de docentes se cargan por separado del horario.
