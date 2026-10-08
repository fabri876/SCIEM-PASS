# PROMPT 1: Backend HU5 – Ayudante_Examen, Delegados, Jornada Activa y Base para Control

## 1. Objetivo General

Desarrolla ÚNICAMENTE la **PARTE 1** de HU5: "Control y Registro Multirol de Ingreso al Examen en Tiempo Real".

El objetivo es que, al loguearse un usuario con rol `OPERADOR`, el frontend pueda mostrar **automáticamente las asignaturas/exámenes/aulas** que ese operador está gestionando (`ayudante_examen` con `estado_asignacion = 'ACTIVO'`).

También dejar preparada la estructura mínima para, en la siguiente parte, registrar el ingreso por **ESCANEO (QR)** o **MANUAL (SIS/CI)** usando principalmente `codsisestudiante`.

**NO** implementes aún `POST /control/ingresos` completo con todas las validaciones. Solo crea lo estrictamente necesario para esta parte.

## 2. Contexto del Proyecto

- **Proyecto:** SCIEM-PASS
- **Backend:** Spring Boot 4.1.1 (Java)
- **Arquitectura por capas:** `dominio`, `persistencia`, `aplicacion`, `presentacion`, `dto`, `excepcion`, `config`, `seguridad`
- **Base de datos:** PostgreSQL (Supabase)
- **Zona horaria:** `America/La_Paz`
- **Rol autorizado para esta parte:** `OPERADOR`

> **Nota:** Aunque la tabla se llame `ayudante_examen`, para este módulo solo se autorizará con el rol `OPERADOR`. El concepto "ayudante" equivale a "operador" en control de ingreso.

## 3. Punto clave sobre tabla `ingreso`

Toma en cuenta lo siguiente: **en la tabla `ingreso` YA NO existe la restricción UNIQUE `(est_idusuario, codsisestudiante, idasignatura, idexamen)`**. Se consideró redundante.

Cuando más adelante implementemos el registro, para detectar **ingreso duplicado** debemos buscar si ya existe un registro en `ingreso` con:

`(est_idusuario, idasignatura, idexamen)`

**NO** vuelvas a añadir esa UNIQUE. NO la mapees ni la generes en código.

## 4. Explorar Código Existente

Antes de crear archivos, lee el proyecto para mantener coherencia con convenciones.

Revisa:

- `dominio/Usuario.java`, `Examen.java`, `Asignatura.java`, `Ambiente.java`, `Rol.java`
- `dominio/Estudiante.java`, `Matricula.java`, `ListaOficial.java`, `Credencial.java`
- `persistencia/` (patrón de repositorios)
- `seguridad/` (cómo obtener usuario autenticado: `@AuthenticationPrincipal`, `UserDetails`, `SecurityContextHolder` o JWT)
- `presentacion/` (prefijo `/api/v1`, `@PreAuthorize`, nombres de controladores)
- `dto/`, `excepcion/`, `@RestControllerAdvice` global (si existe)

## 5. Tabla `ayudante_examen`

Crear el mapeo JPA para esta tabla con la siguiente estructura:

| Columna | Tipo | Nulo | Default | Restricciones |
|---|---|---|---|---|
| `idayudante` | BIGINT | NO | — | FK → `usuario(idusuario)` |
| `idasignatura` | BIGINT | NO | — | FK → `asignatura(idasignatura)` |
| `idexamen` | BIGINT | NO | — | FK → `examen(idexamen)` |
| `idambiente` | BIGINT | NO | — | FK → `ambiente(idambiente)` |
| `estado_asignacion` | VARCHAR(20) | NO | `'ACTIVO'` | CHECK (`estado_asignacion` IN ('ACTIVO','INACTIVO')) |

- **Clave Primaria Compuesta:** `(idayudante, idasignatura, idexamen, idambiente)`

## 6. Requerimientos Funcionales – PROMPT 1

### A) Múltiples asignaciones
- **Varios operadores por examen:** Debe permitirse. Se crean distintas filas con distinto `idayudante` para el mismo `(idasignatura,idexamen,idambiente)`.
- **Un operador con varios exámenes (fechas distintas):** Debe permitirse. Puede tener varias filas `ACTIVO`.
- **Solapamiento:** Si un mismo `idayudante` tiene **dos asignaciones ACTIVAS** con la **misma fecha** de examen y sus **horarios se superponen** (`(horaInicio1 <= horaFin2) AND (horaInicio2 <= horaFin1)`), **detectarlo**. No es obligatorio lanzar excepción en estos GETs, pero añade un método privado `tieneSolapamiento(...)` con **log de advertencia** para tenerlo listo.

### B) Mostrar materias que gestiona el operador al loguearse

#### Endpoint 1: `GET /api/v1/examenes/delegados`
- **Rol:** `OPERADOR`
- **Descripción:** Retorna **TODAS** las asignaciones con `estado_asignacion = 'ACTIVO'` del usuario autenticado.
- **Uso:** Mostrar en pantalla "Mis exámenes asignados" (materia, examen, grupo, aula, fecha, hora). El operador debe poder **seleccionar** cualquiera de esas asignaciones para iniciar el control (escaneo QR o ingreso por SIS/CI).

#### Endpoint 2: `GET /api/v1/control/jornada-activa`
- **Rol:** `OPERADOR`
- **Descripción:** Retorna **UNA** asignación activa representativa para pre-seleccionar automáticamente.
- **Lógica:**
  - Solo considerar `estado_asignacion = 'ACTIVO'`
  - Si **1 sola** asignación → devolverla
  - Si **varias** asignaciones:
    1. Buscar aquella cuyo examen esté **EN CURSO** según `fechaexamen`, `horainicio`, `horafin` con hora actual `America/La_Paz` (`LocalDateTime.now(ZoneId.of("America/La_Paz"))`)
    2. Si hay **una** en curso → esa
    3. Si hay **varias** en curso → tomar la de **menor horaInicio**
    4. Si **ninguna** en curso → tomar la **más próxima a iniciar** (menor diferencia entre ahora y `(fechaExamen + horaInicio)`)
    5. Si persiste empate → ordenar por `fechaExamen`, `horaInicio` y tomar la primera
  - Si **no tiene ninguna asignación ACTIVA** → lanzar `AsignacionNoActivaException`

**Importante:** Ambos endpoints deben funcionar aunque haya **múltiples operadores** asignados al mismo examen. NO filtrar por apellido.

### C) Preparar base para registro (mínimo)
Aunque NO vayas a implementar `POST /control/ingresos` ahora, deja preparado lo siguiente para la Parte 2:

- Se registrará con `metodo_ingreso = 'ESCANEO'` o `'MANUAL'`
- Se guardará `idusuario` = **ID del usuario autenticado** que realiza el ingreso (auditoría)
- Se identificará al estudiante por **`codsisestudiante`** (tal como se pide: "por cod SIS")
- Detección de duplicado será por `(est_idusuario, idasignatura, idexamen)`
- El **operador** podrá registrar ingresos sin restricción entre "ayudante/operador"

## 7. Entidades (Dominio)

### 7.1 `AyudanteExamen.java`
Crear entidad mapeada a `ayudante_examen`.

Usa **clave primaria compuesta**. Prefiere `@EmbeddedId` con `AyudanteExamenId` si ese patrón aparece en otras entidades compuestas del proyecto. Si el proyecto usa `@IdClass`, también es válido. **Adapta al estilo existente**.

Mapeo:

- `@EmbeddedId` `id` (o los 4 @Id)
- `@Column(name = "estado_asignacion", nullable = false, length = 20)`
- `@ManyToOne(fetch = FetchType.LAZY)`
  - `@JoinColumn(name = "idayudante", insertable = false, updatable = false)`
- `@ManyToOne(fetch = FetchType.LAZY)`
  - `@JoinColumn(name = "idasignatura", insertable = false, updatable = false)`
- `@ManyToOne(fetch = FetchType.LAZY)`
  - `@JoinColumn(name = "idexamen", insertable = false, updatable = false)`
- `@ManyToOne(fetch = FetchType.LAZY)`
  - `@JoinColumn(name = "idambiente", insertable = false, updatable = false)`

Apunta correctamente a `Usuario`, `Asignatura`, `Examen`, `Ambiente`.

### 7.2 `AyudanteExamenId.java`
Si usas `@EmbeddedId`:

```java
@Embeddable
public class AyudanteExamenId implements Serializable {
  private Long idayudante;
  private Long idasignatura;
  private Long idexamen;
  private Long idambiente;
  // equals() y hashCode()
}
8. Repositorio
Crear AyudanteExamenRepository extendiendo JpaRepository<AyudanteExamen, AyudanteExamenId>.

Añade estos métodos:

List<AyudanteExamen> findByIdIdayudanteAndEstadoAsignacion(Long idayudante, String estadoAsignacion)
List<AyudanteExamen> findByIdIdayudanteAndEstadoAsignacionOrderById(Long idayudante, String estadoAsignacion)
List<AyudanteExamen> findByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(Long idasignatura, Long idexamen, Long idambiente, String estadoAsignacion)
boolean existsByIdIdayudanteAndEstadoAsignacion(Long idayudante, String estadoAsignacion)
Ajusta la sintaxis a lo que realmente quede con tu mapeo (id.idayudante vs idayudante). Usa Spring Data correctamente.

9. DTOs
Crear en dto/:

DelegadoExamenDTO.java
Campos:

idayudante (Long)
idasignatura (Long)
nombreAsignatura (String)
idexamen (Long)
nombreExamen (String)
idambiente (Long)
nombreAmbiente (String)
fechaExamen (LocalDate)
horaInicio (LocalTime)
horaFin (LocalTime)
grupo (String)
estadoAsignacion (String)
JornadaActivaDTO.java
Campos:

idasignatura (Long)
nombreAsignatura (String)
idexamen (Long)
nombreExamen (String)
idambiente (Long)
nombreAmbiente (String)
fechaExamen (LocalDate)
horaInicio (LocalTime)
horaFin (LocalTime)
grupo (String)
cantidadAyudantesDelegados (Integer) // contar cuántos operadores asignados ACTIVOS hay para ese mismo (idasignatura,idexamen,idambiente)
Usa Lombok si existe en el proyecto (@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor). Si no, genera manualmente.

10. Excepción
Crear excepcion/AsignacionNoActivaException.java:

public class AsignacionNoActivaException extends RuntimeException {
  public AsignacionNoActivaException(String mensaje) {
    super(mensaje);
  }
}
Si existe @RestControllerAdvice, mapea a HttpStatus.NOT_FOUND con mensaje claro. Si no existe, NO crees uno nuevo.

11. Servicio
Crear aplicacion/ControlIngresoAyudanteService.java

Anotar con @Service y @Transactional(readOnly = true) a nivel clase o por método.

Métodos:

List<DelegadoExamenDTO> obtenerDelegadosActivos(Long usuarioId)
Traer asignaciones ACTIVAS del usuario (idayudante = usuarioId)
Mapear a DTO con datos de Asignatura, Examen, Ambiente
Ordenar por fechaExamen asc, horaInicio asc
JornadaActivaDTO obtenerJornadaActiva(Long usuarioId)
Obtener lista activa
Si vacía → throw new AsignacionNoActivaException("No tiene asignaciones ACTIVAS para control de ingreso.")
Si 1 → mapear
Si > 1 → aplicar lógica de "en curso" > "más próxima"
Calcular cantidadAyudantesDelegados con findByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(...)
Método privado boolean seSuperponen(LocalTime ini1, LocalTime fin1, LocalTime ini2, LocalTime fin2) y void validarSolapamientoAsignaciones(List<AyudanteExamen> activas) con comentario explicando la intención.

NO implementes registrarIngreso aquí.

12. Controlador
Crear presentacion/AyudanteExamenController.java

@RestController
@RequestMapping("/api/v1")
public class AyudanteExamenController { ... }
Respetar CORS si ya existe.

Endpoints:

@GetMapping("/examenes/delegados")
@PreAuthorize("hasRole('OPERADOR')")
public ResponseEntity<List<DelegadoExamenDTO>> obtenerDelegados(
        @AuthenticationPrincipal Object principal
) { ... }

@GetMapping("/control/jornada-activa")
@PreAuthorize("hasRole('OPERADOR')")
public ResponseEntity<JornadaActivaDTO> obtenerJornadaActiva(
        @AuthenticationPrincipal Object principal
) { ... }
Obtén usuarioId desde el principal tal como lo hacen otros controladores.

ÚNICAMENTE el rol OPERADOR puede acceder a estos endpoints.

13. Archivos a Crear
Genera ÚNICAMENTE estos archivos:

dominio/
├── AyudanteExamen.java
└── AyudanteExamenId.java

persistencia/
└── AyudanteExamenRepository.java

aplicacion/
└── ControlIngresoAyudanteService.java

presentacion/
└── AyudanteExamenController.java

dto/
├── DelegadoExamenDTO.java
└── JornadaActivaDTO.java

excepcion/
└── AsignacionNoActivaException.java
NO modifiques Ingreso.java. NO crees ControlIngresoService completo. NO añadas metodo_ingreso todavía.

14. Criterios de Aceptación
AyudanteExamen con PK compuesta (idayudante, idasignatura, idexamen, idambiente)
AyudanteExamenRepository con métodos correctos
GET /examenes/delegados devuelve solo asignaciones ACTIVO del usuario autenticado con rol OPERADOR
GET /control/jornada-activa devuelve asignación con lógica "en curso > más próxima"
Soporta múltiples operadores para el mismo examen
Soporta un mismo operador con varios exámenes en fechas distintas
Usa idambiente correctamente
Solo OPERADOR puede acceder a estos endpoints
Nunca retorna entidades JPA, solo DTOs
@Transactional(readOnly = true)
Código coherente con arquitectura, nombres y seguridad existentes
Compila sin errores
15. Pasos
Explorar proyecto
Crear AyudanteExamen + AyudanteExamenId
Crear AyudanteExamenRepository
Crear DTOs
Crear excepción
Crear servicio con lógica de delegados/jornada-activa + detección de solapamiento
Crear controlador con los 2 endpoints
Compilar y revisar coherencia
OBJETIVO: Tener funcional la consulta de "materias que gestiona el operador" para mostrar al loguearse en el módulo de Control de Ingreso. Listo para pasar al PROMPT 2 con el registro por QR/SIS-CI.