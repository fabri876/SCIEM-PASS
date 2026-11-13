# Contrato de API REST — HU06: Gestión de Incidencias e Ingreso Excepcional

**Módulo:** Control de Ingreso a Exámenes Masivos (SCIEM-PASS / WindSoft)
**Destinatarios:** Frontend de la HU06 (José Carlos) y, para la integración con el punto de control, HU05 (Diego y Paola)
**URL Base en Desarrollo:** `http://localhost:8080` (`strApiBaseUrl` en `src/services/apiConfig.js`)
**Autenticación:** todas las rutas exigen `Authorization: Bearer <token>`.

---

## 1. Quién puede usar qué

| Acción | ADMINISTRADOR | DOCENTE | OPERADOR | ESTUDIANTE |
| :--- | :---: | :---: | :---: | :---: |
| Autorizar ingreso excepcional | ✅ | ✅ exámenes asignados | ❌ | ❌ |
| Registrar incidencia | ✅ | ✅ exámenes asignados | ❌ | ❌ |
| Ver / revisar / cerrar incidencias | ✅ | ✅ exámenes asignados | ❌ | ❌ |
| Ver ingresos excepcionales | ✅ | ✅ exámenes asignados | ❌ | ❌ |

**Actualización 09/10/2026 (recomendación de la ingeniera):** todo se registra sobre un examen **ya asignado** a quien lo registra.
- **DOCENTE:** exámenes de los que es responsable (`examen.idusuario`).
- **Incidencias:** se pueden registrar **el día del examen o después**, nunca antes. El ingreso excepcional sigue siendo solo durante el examen.

**Actualización 12/11/2026:** el **operador (ayudante) ya no registra ni gestiona incidencias**. Su alcance es el control del ingreso del aula: marcar ingresos, autorizar el ingreso excepcional en los casos faciales y reportar intentos de examen incorrecto. Registrar una incidencia —y más aún expulsar a un estudiante— es del **docente responsable** y del **administrador**. El operador recibe `403` en todos los endpoints de `/api/incidencias` y en `POST /api/sync/incidencias`.

- Rol sin permiso → `403` con `"Acceso denegado: su rol no tiene permiso para esta acción."`
- Docente de otra materia → `403` con `"No es docente de esta materia."`
- Docente de la materia que no es el asignado al examen → `403` con `"No es el docente asignado a este examen."`
- Incidencia de un examen futuro → `409` con `"El examen es el dd/MM/yyyy; todavía no se pueden registrar incidencias."`
- Sin token o token vencido → `401`. El frontend muestra **"Tu sesión expiró, vuelve a iniciar sesión"** y no reintenta.
- Todo acceso negado, ingreso excepcional (aceptado o rechazado), incidencia, retiro y cambio de estado queda en el **Historial de Auditoría**. El frontend no tiene que hacer nada para eso.

---

## 2. Resumen de Endpoints

| Método | Endpoint | Roles | Uso |
| :--- | :--- | :--- | :--- |
| GET | `/api/incidencias/catalogos` | A, D | Tipos, severidades, estados y motivos de excepción |
| GET | `/api/incidencias/ambientes?fecha=` | A, D | Aulas asignadas de un día (por defecto hoy): selector del **ingreso excepcional** |
| GET | `/api/incidencias/aulas-asignadas` | A, D | Aulas asignadas de **todas las fechas hasta hoy** (más recientes primero): selector de **incidencias**. Mismo formato que `/ambientes` |
| GET | `/api/incidencias/estudiante?idAmbiente=&q=` | A, D | Estudiante involucrado en una incidencia |
| POST | `/api/incidencias` *(multipart)* | A, D | Registrar incidencia |
| GET | `/api/incidencias?idExamen=&idAmbiente=&idAsignatura=&tipo=&estado=` | A, D | Lista + totales |
| GET | `/api/incidencias/exportar?...&idAsignatura=` | A, D | Excel del filtro activo |
| GET | `/api/incidencias/abiertas/total` | A, D | Número para el menú lateral |
| GET | `/api/incidencias/{id}` | A, D | Detalle + línea de tiempo |
| PATCH | `/api/incidencias/{id}/revision` | A, D | ABIERTA → EN_REVISION |
| PATCH | `/api/incidencias/{id}/cierre` | A, D | → CERRADA (con resolución) |
| POST | `/api/sync/incidencias` | A, D | Lote idempotente de incidencias registradas sin conexión (HU21) |
| GET | `/api/ingresos-excepcionales/consulta?idAmbiente=&q=` | A, D | Buscar estudiante y saber qué botones mostrar |
| POST | `/api/ingresos-excepcionales` *(multipart)* | A, D | Autorizar ingreso excepcional |
| GET | `/api/ingresos-excepcionales?idExamen=&idAmbiente=` | A, D | Pestaña "Ingresos excepcionales" |

A = ADMINISTRADOR, D = DOCENTE.

---

## 3. Formato de errores

Todos los errores de esta HU usan el formato que ya existe:

```json
{
  "codigo": 409,
  "error": "Conflict",
  "mensaje": "El estudiante ya registró su ingreso a las 07:41 en Aula 601.",
  "detalles": null,
  "timestamp": "2026-10-04T08:21:10"
}
```

| Código | Cuándo | Qué mostrar |
| :--- | :--- | :--- |
| 400 | Validación (motivo vacío, observación corta, imagen inválida, resolución vacía…) | `mensaje` junto al campo |
| 401 | Sesión vencida | "Tu sesión expiró, vuelve a iniciar sesión" |
| 403 | Rol o materia sin permiso | `mensaje` |
| 404 | Aula, incidencia o estudiante inexistente | `mensaje` |
| 409 | Estado que no lo permite (duplicado, retirado, aula llena, ingreso cerrado, incidencia cerrada) | `mensaje` |
| 500 | Falla del servidor o al subir la imagen | `mensaje`; **no se guardó nada** |

Mostrar siempre el `mensaje` del backend: ya está redactado para el usuario.

---

## 4. Detalle de Endpoints

### 4.1. Catálogos
`GET /api/incidencias/catalogos`

```json
{
  "tiposIncidencia": [
    { "codigo": "SUPLANTACION", "etiqueta": "Suplantación de identidad" },
    { "codigo": "OBJETO_PROHIBIDO", "etiqueta": "Objeto prohibido" },
    { "codigo": "CONDUCTA_INAPROPIADA", "etiqueta": "Conducta inapropiada" },
    { "codigo": "FALLA_TECNICA", "etiqueta": "Falla técnica" },
    { "codigo": "PROBLEMA_AULA", "etiqueta": "Problema del aula" },
    { "codigo": "OTRO", "etiqueta": "Otro" }
  ],
  "severidades": [
    { "codigo": "BAJA", "etiqueta": "Baja" },
    { "codigo": "MEDIA", "etiqueta": "Media" },
    { "codigo": "ALTA", "etiqueta": "Alta" }
  ],
  "estados": [
    { "codigo": "ABIERTA", "etiqueta": "Abierta" },
    { "codigo": "EN_REVISION", "etiqueta": "En revisión" },
    { "codigo": "CERRADA", "etiqueta": "Cerrada" }
  ],
  "motivosExcepcion": [
    { "codigo": "SIN_CARNET_QR", "etiqueta": "Sin carnet o QR" },
    { "codigo": "NO_FIGURA_EN_LISTA", "etiqueta": "No figura en la lista" },
    { "codigo": "LLEGADA_TARDIA", "etiqueta": "Llegada tardía" },
    { "codigo": "TRASLADO_AULA", "etiqueta": "Traslado desde otra aula" }
  ]
}
```
Al backend se envía siempre el `codigo`; en pantalla se muestra la `etiqueta`.

### 4.2. Aulas del día
`GET /api/incidencias/ambientes` (hoy) o `?fecha=2026-10-04`

Devuelve solo las aulas que el usuario puede operar (el docente, las de sus materias).

```json
[
  {
    "idAmbiente": 7,
    "idAsignatura": 1,
    "asignatura": "Cálculo I",
    "idExamen": 3,
    "fechaExamen": "2026-10-04",
    "aula": "Aula 601",
    "horaInicio": "08:00:00",
    "horaFin": "10:00:00",
    "aforo": { "ocupados": 56, "capacidad": 60, "disponibles": 4 },
    "ingresoCerrado": false,
    "motivoCierre": null
  }
]
```
`capacidad` y `disponibles` vienen `null` si el aula no tiene capacidad cargada.

### 4.3. Consultar estudiante (botones del resultado)
`GET /api/ingresos-excepcionales/consulta?idAmbiente=7&q=9988776` (docente/admin)
`GET /api/incidencias/estudiante?idAmbiente=7&q=1234567` (docente/admin)

`q` acepta **Código SIS o CI**. Mismo formato de respuesta:

```json
{
  "estado": "NO_EN_LISTA",
  "mensaje": "No figura en la lista de habilitados de este examen.",
  "codSis": 202409112,
  "ci": "9988776",
  "nombreCompleto": "Carlos Ramos Mamani",
  "horaIngresoPrevio": null,
  "aulaIngresoPrevio": null,
  "puedeAutorizarExcepcional": true,
  "puedeRegistrarIncidencia": true,
  "puedeRetirar": false,
  "aforo": { "ocupados": 56, "capacidad": 60, "disponibles": 4 },
  "ingresoCerrado": false
}
```

| `estado` | Significado | Botones (ya calculados en `puede...`) |
| :--- | :--- | :--- |
| `INHABILITADO` | Habilitación en falso | Autorizar ingreso excepcional · Registrar incidencia · Rechazar y continuar |
| `NO_EN_LISTA` | Sin habilitación para ese examen | Igual que el anterior |
| `NO_ENCONTRADO` | No existe en el sistema | Solo Registrar incidencia (no se puede ingresar a alguien que no existe) |
| `DUPLICADO` | Ya ingresó (`horaIngresoPrevio`, `aulaIngresoPrevio`) | Solo Registrar incidencia |
| `RETIRADO` | Fue retirado de este examen | Solo Registrar incidencia |
| `HABILITADO` | Puede entrar por el control normal (HU05) | Ninguno de esta HU |

- `puedeAutorizarExcepcional` ya es `false` para el operador, con el aula llena o con el ingreso cerrado.
- Para incidencias: `DUPLICADO` → mostrar "Juan Pérez García · ingresó 07:41"; `NO_ENCONTRADO` → "Estudiante no encontrado".
- `puedeRetirar` habilita el interruptor "Retirar al estudiante del examen" (solo `DUPLICADO`, es decir, ya ingresó).
- "Rechazar y continuar" es solo de frontend: limpia el resultado y no llama al backend.

### 4.4. Autorizar ingreso excepcional
`POST /api/ingresos-excepcionales` — `multipart/form-data`

| Campo | Tipo | Obligatorio | Regla |
| :--- | :--- | :---: | :--- |
| `idAmbiente` | número | ✅ | |
| `codSis` | número | ✅ | El `codSis` que devolvió la consulta |
| `motivo` | texto | ✅ | Un `codigo` de `motivosExcepcion` |
| `observacion` | texto | ✅ | 20 a 500 caracteres |
| `respaldo` | archivo | ❌ | JPG o PNG, máx. 5 MB |

El campo "Docente que autoriza" es solo informativo: el backend usa siempre al usuario de la sesión.

```js
const formData = new FormData();
formData.append("idAmbiente", 7);
formData.append("codSis", 202409112);
formData.append("motivo", "NO_FIGURA_EN_LISTA");
formData.append("observacion", "Presenta boleta de inscripción 2/2026 sellada.");
if (archivo) formData.append("respaldo", archivo);
// NO poner "Content-Type": el navegador arma el boundary del multipart.
fetch(`${strApiBaseUrl}/api/ingresos-excepcionales`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**201 Created:**
```json
{
  "idIngreso": 1287,
  "codSis": 202409112,
  "estudiante": "Carlos Ramos Mamani",
  "motivo": "NO_FIGURA_EN_LISTA",
  "motivoEtiqueta": "No figura en la lista",
  "observacion": "Presenta boleta de inscripción 2/2026 sellada.",
  "horaIngreso": "2026-10-04T08:21:57",
  "idAmbiente": 7,
  "aula": "Aula 601",
  "asignatura": "Cálculo I",
  "idExamen": 3,
  "autorizadoPor": "Ana Rocha Villarroel",
  "evidenciaUrl": "https://res.cloudinary.com/...",
  "aforo": { "ocupados": 57, "capacidad": 60, "disponibles": 3 }
}
```
Usar `aforo` de la respuesta para actualizar "57/60 · quedan 3".

**Errores típicos:** `400` (motivo, observación, imagen), `403` (rol/materia), `404` (estudiante), `409`:
- `"El estudiante ya registró su ingreso a las 07:41 en Aula 601."`
- `"El estudiante fue retirado de este examen y no puede volver a ingresar."`
- `"Aula llena (60/60). Solicite al Administrador reasignar el aula."`
- `"El ingreso a este examen ya cerró (fin: 10:00)."`

**Doble clic / recarga:** si el mismo usuario repite la misma autorización dentro de 2 minutos, el backend devuelve el ingreso ya creado (no duplica). Igual conviene deshabilitar el botón mientras se envía.

### 4.5. Registrar incidencia
`POST /api/incidencias` — `multipart/form-data`

| Campo | Tipo | Obligatorio | Regla |
| :--- | :--- | :---: | :--- |
| `claveSolicitud` | UUID | ✅ | Generarla **al abrir** el formulario: `crypto.randomUUID()` |
| `idAmbiente` | número | ✅ | |
| `tipo` | texto | ✅ | `codigo` de `tiposIncidencia` |
| `severidad` | texto | ✅ | `codigo` de `severidades` |
| `descripcion` | texto | ✅ | 15 a 500 caracteres |
| `codSisEstudiante` | número | ❌ | Del estudiante involucrado |
| `retirarEstudiante` | `true`/`false` | ❌ | **No se usa** (09/10: la ingeniera pidió quitar el retiro de la interfaz). El frontend manda siempre `false` |
| `evidencia` | archivo | ❌ | JPG o PNG, máx. 5 MB |

`claveSolicitud` evita duplicados: si el usuario presiona dos veces, las dos peticiones llevan la misma clave y el backend devuelve la misma incidencia. Generar una clave nueva solo al abrir otra vez el formulario.

**201 Created:** el detalle de la incidencia (ver 4.8), con `codigo` `"INC-014"` y `estado` `"ABIERTA"`.

**Errores típicos:** `400` (tipo, severidad, descripción, imagen, clave), `404` (estudiante), `409`:
- `"El estudiante no ingresó a este examen; no se puede retirar."`
- `"El estudiante ya fue retirado de este examen."`

### 4.6. Lista de incidencias
`GET /api/incidencias?idExamen=3&idAmbiente=&idAsignatura=&tipo=OBJETO_PROHIBIDO&estado=ABIERTA` (todos opcionales)

```json
{
  "totales": { "abiertas": 3, "enRevision": 1, "cerradas": 2 },
  "incidencias": [
    {
      "idIncidencia": 14,
      "codigo": "INC-014",
      "fechaHora": "2026-10-04T08:19:30",
      "idAmbiente": 9,
      "aula": "Aula 690A",
      "asignatura": "Cálculo I",
      "idExamen": 3,
      "tipo": "SUPLANTACION",
      "tipoEtiqueta": "Suplantación de identidad",
      "severidad": "ALTA",
      "severidadEtiqueta": "Alta",
      "estado": "ABIERTA",
      "estadoEtiqueta": "Abierta",
      "reportadoPor": "Marco Salazar",
      "estudiante": "Rodrigo Saavedra Paz"
    }
  ]
}
```
- `totales` respeta los filtros de examen, aula, materia y tipo, pero **no** el de estado (para mostrar siempre los tres números).
- `idAsignatura` filtra por materia. El listado en pantalla y el **export a Excel usan el mismo filtro**, así que lo que se descarga es exactamente lo que se ve.
- Lista vacía → mostrar "No hay incidencias con esos filtros".
- El docente siempre recibe solo sus materias (no hay filtro "Solo mis materias").

### 4.6b. Sincronización de incidencias sin conexión (HU21)
`POST /api/sync/incidencias` — el lote viaja en JSON. Cada ítem lleva su `clientUuid`, que es la **clave de solicitud**: si esa clave ya existe en el servidor, no se crea otra incidencia.

Respuesta por ítem:

| `estado` | Significado | Campos extra |
| :--- | :--- | :--- |
| `PROCESADO` | La incidencia se acaba de crear | `idIncidencia` |
| `DUPLICADO` | Ya existía una incidencia con esa clave | `idIncidencia` |
| `ERROR_VALIDACION` | El dato está mal: reintentar no cambiaría el resultado | `mensaje` |
| `ERROR` | Fallo transitorio (red, servidor): el dispositivo reintenta | `mensaje` |

- **`DUPLICADO` siempre trae `idIncidencia`.** El dispositivo lo necesita para subir la evidencia (foto) que quedó guardada en su cola local; sin ese id la foto se perdería en silencio.
- `advertencia` puede venir junto a `PROCESADO`: la incidencia se registró pero no se pudo cerrar (por ejemplo, una expulsión que quedó ABIERTA).

### 4.7. Contador del menú
`GET /api/incidencias/abiertas/total` → `{ "total": 3 }`

### 4.8. Detalle
`GET /api/incidencias/14`

```json
{
  "idIncidencia": 14,
  "codigo": "INC-014",
  "fechaHora": "2026-10-04T08:19:30",
  "idAmbiente": 9,
  "aula": "Aula 690A",
  "asignatura": "Cálculo I",
  "idExamen": 3,
  "tipo": "SUPLANTACION",
  "tipoEtiqueta": "Suplantación de identidad",
  "severidad": "ALTA",
  "severidadEtiqueta": "Alta",
  "estado": "ABIERTA",
  "estadoEtiqueta": "Abierta",
  "reportadoPor": "Marco Salazar",
  "codSisEstudiante": 202110987,
  "estudiante": "Rodrigo Saavedra Paz",
  "estudianteRetirado": true,
  "descripcion": "La foto del carnet no coincide con la persona...",
  "evidenciaUrl": "https://res.cloudinary.com/...",
  "resolucion": null,
  "lineaTiempo": [
    { "fechaHora": "2026-10-04T08:19:30", "accion": "Registrada", "usuario": "Marco Salazar", "detalle": "Suplantación de identidad · severidad Alta" },
    { "fechaHora": "2026-10-04T08:19:30", "accion": "Estudiante retirado del examen", "usuario": "Marco Salazar", "detalle": null }
  ]
}
```

### 4.9. Marcar en revisión
`PATCH /api/incidencias/14/revision` (sin body) → `200` con el detalle actualizado.
`409` si ya está en revisión o cerrada.

### 4.10. Cerrar
`PATCH /api/incidencias/14/cierre`
```json
{ "resolucion": "Se verificó con el CI físico: era otra persona. Se informó a la carrera." }
```
→ `200` con el detalle. `400` si la resolución está vacía; `409` si ya estaba cerrada.
Una incidencia `CERRADA` no muestra botones de cambio de estado.

### 4.11. Ingresos excepcionales (pestaña)
`GET /api/ingresos-excepcionales?idExamen=3&idAmbiente=` (opcionales) → lista con el mismo formato que la respuesta de 4.4 (`aforo` viene `null` en la lista).

---

## 5. Notas para el frontend
- **No hay editar ni borrar** para incidencias ni ingresos excepcionales (criterio de QA).
- **Horas:** vienen en hora de Bolivia, sin zona (`"2026-10-04T08:21:57"`). Mostrarlas tal cual (`HH:mm`), sin convertir.
- **Archivos:** validar en el navegador (JPG/PNG, ≤ 5 MB) para avisar rápido; el backend vuelve a validar el contenido real.
- **Contadores de caracteres:** `maxLength={500}` en observación y descripción.

---

## 6. Integración con el punto de control (HU05)

Los criterios de QA piden los botones "Autorizar ingreso excepcional", "Registrar incidencia" y "Rechazar y continuar" en el resultado del punto de control (pantallas de la HU05). Los modales de la HU06 ya están listos para usarse desde ahí:

```jsx
import ModalIncidencia from "../../../../components/incidencias/ModalIncidencia";
import ModalIngresoExcepcional from "../../../../components/incidencias/ModalIngresoExcepcional";

// aula = { idAmbiente, idExamen, asignatura, aula, fechaExamen, aforo } (formato de /api/incidencias/ambientes)
<ModalIncidencia
  boolAbierto={abrirIncidencia}
  onCerrar={() => setAbrirIncidencia(false)}
  aulasDisponibles={[aula]}
  aulaPreseleccionada={aula}
  estudianteInicial={{ nombreCompleto, ci, codSis, estado, horaIngresoPrevio, puedeRetirar }} // opcional
/>
<ModalIngresoExcepcional
  boolAbierto={abrirExcepcional}
  onCerrar={() => setAbrirExcepcional(false)}
  aulasDisponibles={[aula]}
  aulaPreseleccionada={aula}
/>
```

- **"Autorizar ingreso excepcional":** mostrarlo solo a DOCENTE y ADMINISTRADOR. El operador nunca lo ve.
- **"Registrar incidencia":** solo DOCENTE y ADMINISTRADOR. En el frontend el botón se dibuja solo si hay a quién abrir el formulario de incidencia (`onAbrirIncidenciaConEstudiante`): el operador no lo recibe, así que no le aparece.
- **"Rechazar y continuar":** es solo del punto de control; limpia el resultado y no llama a la HU06.
- **El "intento no autorizado" automático** lo guarda la HU05 al mostrar un rechazo (tabla `intentosnoautorizados`).
