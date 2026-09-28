# Contrato de API REST — HU-3: Gestión de Habilitación de Estudiantes

**Módulo:** Control de Ingreso a Exámenes Masivos (SCIEM-PASS / WindSoft)  
**Destinatarios:** Equipo de Desarrollo Frontend (React + Vite)  
**URL Base en Desarrollo:** `http://localhost:8080` (definida en `src/services/apiConfig.js` como `strApiBaseUrl`)

---

## 1. Resumen de Endpoints

| Método | Endpoint | Descripción | Códigos HTTP |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/motivos-inhabilitacion` | Obtener catálogo de motivos para el desplegable | `200 OK` |
| **GET** | `/api/habilitaciones/examen/{idExamen}` | Listar estudiantes y su estado de un examen | `200 OK`, `404 Not Found` |
| **GET** | `/api/habilitaciones/{idHabilitacion}` | Consultar el detalle de una habilitación | `200 OK`, `404 Not Found` |
| **POST** | `/api/habilitaciones` | Asociar estudiante a examen con su estado | `201 Created`, `400 Bad Request`, `409 Conflict` |
| **PUT** | `/api/habilitaciones/{idHabilitacion}` | Actualizar estado, motivo u observación | `200 OK`, `400 Bad Request`, `404 Not Found` |

---

## 2. Detalle de Endpoints

### 2.1. Obtener Motivos de Inhabilitación
- **Ruta:** `GET /api/motivos-inhabilitacion`
- **Uso en Frontend:** Cargar la lista desplegable (`<select>` o combobox) que se activa cuando el usuario marca a un estudiante como **Inhabilitado**.
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "idMotivo": 1,
    "nombreMotivo": "Deuda de matrícula",
    "descripcionMotivo": "El estudiante presenta pagos pendientes en caja"
  },
  {
    "idMotivo": 2,
    "nombreMotivo": "Falta de asistencia requerida",
    "descripcionMotivo": "No cumple el 80% mínimo de asistencia reglamentaria"
  },
  {
    "idMotivo": 3,
    "nombreMotivo": "Sanción disciplinaria",
    "descripcionMotivo": "Inhabilitado por resolución del consejo de carrera"
  }
]
```

---

### 2.2. Listar Estudiantes de un Examen
- **Ruta:** `GET /api/habilitaciones/examen/{idExamen}`
- **Uso en Frontend:** Al seleccionar un examen en la vista principal, este endpoint devuelve la lista de estudiantes inscritos y su estado.
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "idHabilitacion": 101,
    "estudianteId": 15,
    "nombreEstudiante": "Juan Carlos",
    "apellidoEstudiante": "Perez Gomez",
    "ciEstudiante": "7891234 LP",
    "codSisEstudiante": 202100456,
    "examenId": 3,
    "nombreExamen": "Primer Parcial - Cálculo I",
    "fechaExamen": "2026-09-20",
    "estadoHabilitacion": true,
    "estado": "HABILITADO",
    "motivoId": null,
    "nombreMotivo": null,
    "descripcionMotivo": null,
    "observacion": null,
    "fechaRegistro": "2026-09-11T10:15:30"
  },
  {
    "idHabilitacion": 102,
    "estudianteId": 24,
    "nombreEstudiante": "Maria Elena",
    "apellidoEstudiante": "Rojas Suarez",
    "ciEstudiante": "6549871 CB",
    "codSisEstudiante": 202008712,
    "examenId": 3,
    "nombreExamen": "Primer Parcial - Cálculo I",
    "fechaExamen": "2026-09-20",
    "estadoHabilitacion": false,
    "estado": "INHABILITADO",
    "motivoId": 1,
    "nombreMotivo": "Deuda de matrícula",
    "descripcionMotivo": "El estudiante presenta pagos pendientes en caja",
    "observacion": "Tiene cuota 2 vencida",
    "fechaRegistro": "2026-09-11T10:20:00"
  }
]
```

---

### 2.3. Registrar Habilitación / Asociar Estudiante a Examen
- **Ruta:** `POST /api/habilitaciones`
- **Headers:** `Content-Type: application/json`

#### Caso A: Estudiante HABILITADO
```json
{
  "estudianteId": 15,
  "examenId": 3,
  "estadoHabilitacion": true,
  "motivoId": null,
  "observacion": null
}
```
*(Nota: también se puede enviar `"estado": "HABILITADO"` en lugar de `estadoHabilitacion: true`)*.

#### Caso B: Estudiante INHABILITADO
```json
{
  "estudianteId": 24,
  "examenId": 3,
  "estadoHabilitacion": false,
  "motivoId": 1,
  "observacion": "Tiene cuota 2 vencida"
}
```
*(Regla de negocio: Si `estadoHabilitacion` es `false`, `motivoId` es **obligatorio**).*

#### Respuestas:
- **`201 Created`**: Retorna el objeto `HabilitacionResponseDTO` recién creado.
- **`400 Bad Request`**: Si se intentó inhabilitar sin motivo o faltan campos obligatorios:
  ```json
  {
    "mensaje": "Debe seleccionar un motivo de inhabilitación cuando el estudiante no está habilitado"
  }
  ```
- **`409 Conflict`**: Si el estudiante ya estaba registrado en ese examen:
  ```json
  {
    "mensaje": "El estudiante ya se encuentra asociado a este examen"
  }
  ```

---

### 2.4. Actualizar Estado de una Habilitación Existente
- **Ruta:** `PUT /api/habilitaciones/{idHabilitacion}`
- **Headers:** `Content-Type: application/json`
- **Body de ejemplo (para cambiar a Inhabilitado):**
```json
{
  "estadoHabilitacion": false,
  "motivoId": 2,
  "observacion": "Justificó inasistencia pero fuera de plazo"
}
```
- **Body de ejemplo (para rehabilitar):**
```json
{
  "estadoHabilitacion": true,
  "motivoId": null,
  "observacion": "Presentó comprobante de pago"
}
```
- **Respuesta Exitosa (`200 OK`):** Retorna el objeto actualizado.

---

## 3. Ejemplo de Servicio Frontend (`habilitacionService.js`)

Puedes colocar este archivo en `src/services/habilitacionService.js` en el frontend:

```javascript
import { strApiBaseUrl } from "./apiConfig";

/**
 * Obtiene el catálogo de motivos de inhabilitación disponibles
 */
export async function obtenerMotivosInhabilitacion() {
  const response = await fetch(`${strApiBaseUrl}/api/motivos-inhabilitacion`);
  if (!response.ok) {
    throw new Error("Error al obtener la lista de motivos de inhabilitación");
  }
  return response.json();
}

/**
 * Obtiene la lista de estudiantes y su habilitación para un examen
 */
export async function obtenerHabilitacionesPorExamen(idExamen) {
  const response = await fetch(`${strApiBaseUrl}/api/habilitaciones/examen/${idExamen}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.mensaje || "Error al obtener las habilitaciones del examen");
  }
  return response.json();
}

/**
 * Registra o asocia un estudiante a un examen con su estado
 */
export async function registrarHabilitacion(datos) {
  const response = await fetch(`${strApiBaseUrl}/api/habilitaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al registrar la habilitación");
  }
  return data;
}

/**
 * Actualiza el estado, motivo u observación de una habilitación existente
 */
export async function actualizarHabilitacion(idHabilitacion, datos) {
  const response = await fetch(`${strApiBaseUrl}/api/habilitaciones/${idHabilitacion}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.mensaje || "Error al actualizar la habilitación");
  }
  return data;
}
```

---

## 4. Nota sobre Futuras Modificaciones a la Tabla `examen`
Si más adelante se agregan campos adicionales a `examen` (por ejemplo `hora_inicio`, `duracion_minutos`, `ambiente` o `aula`), el backend los mapeará en `Examen.java` y los propagará en `HabilitacionResponseDTO` sin romper ninguno de los endpoints actuales.
