# 🎓 SCIEM-PASS — Sistema de Control de Ingreso a Exámenes Masivos

Sistema web desacoplado para el **control y validación de ingreso a exámenes masivos**. Lo empaqueté con **Docker** para que se pueda desplegar de forma autónoma en la infraestructura de los laboratorios de cómputo de la **UMSS**.

Esta guía está pensada para el **administrador** que va a desplegar el sistema: te explico paso a paso qué hacer y en qué orden.

---

## 📑 Contenido

1. [Arquitectura del proyecto](#-arquitectura-del-proyecto)
2. [Requisitos previos](#-requisitos-previos)
3. [Guía de despliegue](#-guía-de-despliegue)
4. [Verificación y operación básica](#-verificación-y-operación-básica)
5. [Advertencias importantes](#-advertencias-importantes)

---

## 🏗️ Arquitectura del proyecto

El repositorio es un **monorepositorio** con la siguiente estructura:

```text
.
├── control-ingreso-frontend/   # Cliente React + Vite (servido con Nginx)
├── control-ingreso-backend/    # API REST en Java 21 + Spring Boot
├── deploy/                     # Scripts de respaldo y restauración
├── backups/                    # (la creas tú) archivos privados de respaldo
├── docker-compose.yml          # Orquestación de servicios
└── .env.example                # Plantilla de variables de entorno
```

| Componente | Descripción |
|---|---|
| **`control-ingreso-frontend/`** | Aplicación cliente en **React + Vite**, compilada a archivos estáticos y servida con **Nginx**. Nginx también actúa como **proxy inverso**: redirige las peticiones a `/api/` hacia el backend. |
| **`control-ingreso-backend/`** | API REST en **Java 21 y Spring Boot** (perfil `docker`), con almacenamiento local persistente y cliente **PostgreSQL 17** integrado. |
| **`deploy/`** | Scripts automatizados (`sh`) para **respaldar y restaurar** la base de datos y los archivos de evidencia. |
| **`docker-compose.yml`** | Orquesta los servicios `frontend`, `backend` y `db`, la red interna y los volúmenes persistentes `postgres_data` y `evidencias_data`. |
| **`.env.example`** | Plantilla documentada con las variables de entorno necesarias para el despliegue. |

### Servicios y volúmenes

| Servicio | Función |
|---|---|
| `frontend` | Nginx: sirve la web y redirige `/api/` al backend |
| `backend` | API REST (Spring Boot) |
| `db` | Base de datos PostgreSQL |

| Volumen | Qué guarda |
|---|---|
| `postgres_data` | Datos de la base de datos |
| `evidencias_data` | Archivos de evidencia (PDFs) |

---

## ✅ Requisitos previos

Antes de empezar, verifica que tienes:

- 🐳 **Docker Engine** y **Docker Compose** (v2 o superior).
- 📦 **Archivos de respaldo inicial** (se entregan por canal privado). Si quieres desplegar el sistema con los registros vigentes (usuarios, asignaturas, exámenes y PDFs), coloca estos dos archivos dentro de una carpeta `backups/` en la raíz del proyecto:
  - `sciem-public.dump`
  - `evidencias.tar.gz`

```bash
mkdir -p backups
# copia aquí sciem-public.dump y evidencias.tar.gz
```

---

## 🚀 Guía de despliegue

> ⚠️ **Sigue los pasos en el orden indicado.** El orden importa, sobre todo en la restauración de datos.

### 1️⃣ Configurar las variables de entorno

Crea el archivo `.env` en la raíz del proyecto a partir de la plantilla incluida:

```bash
cp .env.example .env
```

Luego edita el archivo `.env` y configura estas variables:

| Variable | Qué poner |
|---|---|
| `DB_PASSWORD` | Contraseña segura para PostgreSQL. |
| `DB_ADMIN_PASSWORD` | Contraseña segura del administrador de PostgreSQL. |
| `JWT_SECRET` | Clave secreta **aleatoria** de **mínimo 64 caracteres**. |
| `PUBLIC_ORIGIN` | URL pública del sistema. Ejemplo: `http://localhost:8088` en pruebas locales, o el dominio HTTPS en producción. |
| `WEB_PORT` | Puerto expuesto del frontend/proxy Nginx. Por defecto: `8088`. |

> 💡 **Tip:** para generar un `JWT_SECRET` aleatorio de 64 caracteres puedes usar:
> ```bash
> openssl rand -hex 32
> ```

---

### 2️⃣ Construir las imágenes Docker

Desde la **raíz del monorepositorio**, construye las imágenes del backend y del frontend:

```bash
docker build -t sciem-pass-backend:local ./control-ingreso-backend
docker build -t sciem-pass-frontend:local ./control-ingreso-frontend
```

---

### 3️⃣ Levantar la base de datos y restaurar los datos iniciales

Primero inicia **únicamente** el servicio de base de datos (`db`), para hacer una carga limpia sin conflictos de esquema:

```bash
docker compose up -d --no-build db
```

Después ejecuta el script de restauración de la base de datos:

```bash
sh deploy/restaurar-bd.sh backups/sciem-public.dump
```

> ⚠️ **Requisitos de este paso:**
> - El **backend debe estar detenido**.
> - El archivo `.dump` debe estar en `backups/`.

---

### 4️⃣ Iniciar todos los servicios

Levanta el backend y el frontend junto con la base de datos:

```bash
docker compose up -d --no-build
```

Una vez que los contenedores estén arriba, restaura el volumen de evidencias locales (si aplica):

```bash
sh deploy/restaurar-evidencias.sh backups/evidencias.tar.gz
```

---

## 🔍 Verificación y operación básica

### 🌐 Acceso web

Abre en el navegador:

```text
http://localhost:8088
```

(o el dominio/puerto que configuraste en `.env`).

### 📋 Ver el estado de los contenedores

```bash
docker compose ps
```

### 📜 Consultar los registros (logs)

```bash
docker compose logs --tail 80 backend
docker compose logs --tail 80 frontend
```

### 💾 Generar un nuevo respaldo (datos y evidencias)

```bash
sh deploy/respaldar-datos.sh backups/respaldo-actual
```

### ⏹️ Detener los servicios (conservando los datos)

```bash
docker compose stop
```

---

## 🚨 Advertencias importantes

> ❌ **NO ejecutar `docker compose down -v` en producción.**
> Ese comando **elimina los volúmenes persistentes** (`postgres_data` y `evidencias_data`) y se pierde toda la base de datos y las evidencias.

- 🔐 Nunca subas el archivo `.env` ni la carpeta `backups/` a un repositorio público: contienen contraseñas y datos privados.
- 💾 Genera respaldos con `deploy/respaldar-datos.sh` de forma periódica, sobre todo antes de cualquier actualización.

---

## ⚡ Resumen rápido (para el administrador con prisa)

```bash
cp .env.example .env                      # y editar los valores
docker build -t sciem-pass-backend:local ./control-ingreso-backend
docker build -t sciem-pass-frontend:local ./control-ingreso-frontend
docker compose up -d --no-build db
sh deploy/restaurar-bd.sh backups/sciem-public.dump
docker compose up -d --no-build
sh deploy/restaurar-evidencias.sh backups/evidencias.tar.gz
docker compose ps
```