package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.*;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.CierreSemestreProgramado;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.AsignacionIngresoCompatController;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.AsignacionIngresoController;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.BatchSyncController;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignacionIngresoRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsociarEstudianteExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.BatchSyncRequestDTO;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Usa un esquema descartable en una base PostgreSQL local de pruebas. */
@EnabledIfEnvironmentVariable(named = "OBS04_TEST_JDBC_URL", matches = "jdbc:postgresql://(localhost|127[.]0[.]0[.]1):[0-9]+/[a-zA-Z0-9_]+")
@SpringBootTest(properties = {"spring.jpa.hibernate.ddl-auto=create", "backup.enabled=false",
        "storage.biometric.require-existing=false", "spring.jpa.show-sql=false",
        "jwt.secret=secret-exclusivo-del-contexto-de-pruebas-observacion-04-no-usar-en-produccion"})
class Observacion04ConcurrenciaTest {
    private static final String ESQUEMA = "obs04_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = System.getenv("OBS04_TEST_JDBC_URL");
    private static final String USUARIO = System.getenv().getOrDefault("OBS04_TEST_DB_USER", "postgres");
    private static final String CLAVE = System.getenv().getOrDefault("OBS04_TEST_DB_PASSWORD", "");

    @DynamicPropertySource
    static void configurar(DynamicPropertyRegistry propiedades) throws Exception {
        try (var conexion = DriverManager.getConnection(URL, USUARIO, CLAVE);
             var ddl = conexion.createStatement()) {
            ddl.execute("CREATE SCHEMA " + ESQUEMA);
        }
        propiedades.add("spring.datasource.url", () -> URL + "?currentSchema=" + ESQUEMA);
        propiedades.add("spring.datasource.username", () -> USUARIO);
        propiedades.add("spring.datasource.password", () -> CLAVE);
    }

    @AfterAll
    static void limpiarEsquema() throws Exception {
        try (var conexion = DriverManager.getConnection(URL, USUARIO, CLAVE);
             var ddl = conexion.createStatement()) {
            ddl.execute("DROP SCHEMA IF EXISTS " + ESQUEMA + " CASCADE");
        }
    }

    @Autowired TransactionTemplate transacciones;
    @Autowired JdbcTemplate jdbc;
    @Autowired UsuarioRepository usuarios;
    @Autowired AyudanteRepository ayudantes;
    @Autowired AyudanteExamenRepository asignaciones;
    @Autowired EstudianteRepository estudiantes;
    @Autowired ExamenRepository examenes;
    @Autowired AulaRepository aulas;
    @Autowired AmbienteRepository ambientes;
    @Autowired GrupoRepository grupos;
    @Autowired HabilitacionRepository habilitaciones;
    @Autowired ResponsableExamenRepository responsables;
    @Autowired IngresoRepository ingresos;
    @Autowired AsignacionIngresoService asignacion;
    @Autowired UsuarioService cuentas;
    @Autowired HabilitacionService habilitacion;
    @Autowired ExamenService examenService;
    @Autowired GrupoService grupoService;
    @Autowired ControlIngresoAyudanteService control;
    @MockitoBean AuditoriaService auditoria;
    @MockitoBean CierreSemestreProgramado cierreSemestre;
    @MockitoBean CarreraEstudianteRepository carreras;

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void altaAyudanteContraDesactivacion(boolean desactivacionPrimero) throws Exception {
        var datos = preparar(false);
        var operador = usuarios.save(new Usuario());
        ayudantes.save(new Ayudante(operador.getIdusuario()));
        var admin = new ContextoUsuarioService.UsuarioActual(-1, "prueba@example.test", "ADMINISTRADOR");
        var solicitud = new AsignacionIngresoRequestDTO(datos.asignatura(), List.of(
                new AsignacionIngresoRequestDTO.ItemAsignacion(datos.ambiente(), operador.getIdusuario(),
                        "A", "Z", "OPERADOR"),
                new AsignacionIngresoRequestDTO.ItemAsignacion(datos.ambiente(), datos.usuario(),
                        "A", "Z", "OPERADOR")), "SUBDIVISION");
        Runnable guardar = () -> asignacion.guardarAsignacion(datos.examen(), solicitud, admin);
        Runnable desactivar = () -> cuentas.cambiarEstado(datos.usuario(), false, admin.correo(), "local");
        if (desactivacionPrimero) {
            var error = assertThrows(ExecutionException.class, () -> cruzar(desactivar, guardar));
            assertEquals(409, assertInstanceOf(ResponseStatusException.class, error.getCause()).getStatusCode().value());
        } else {
            cruzar(guardar, desactivar);
        }

        var filas = asignaciones.findByIdIdexamenAndEstadoAsignacion(datos.examen(), "ACTIVO");
        assertEquals(desactivacionPrimero ? 0 : 2, filas.size());
        if (!desactivacionPrimero)
            assertTrue(filas.stream().anyMatch(f -> f.getId().getIdayudante().equals(datos.usuario())));
        assertFalse(usuarios.findById(datos.usuario()).orElseThrow().getEstadousuario());
    }

    @ParameterizedTest
    @CsvSource({"EXAMEN,true", "EXAMEN,false", "GRUPO,true", "GRUPO,false",
            "ASOCIAR,true", "ASOCIAR,false"})
    void generarHabilitacionContraDesactivacion(String via, boolean desactivacionPrimero) throws Exception {
        var datos = preparar(true);
        Runnable generar = switch (via) {
            case "EXAMEN" -> () -> {
                ExamenService servicio = AopTestUtils.getUltimateTargetObject(examenService);
                ReflectionTestUtils.invokeMethod(servicio, "crearHabilitacionesDelExamen",
                        examenes.findById(datos.examen()).orElseThrow());
            };
            case "GRUPO" -> () -> grupoService.inscribirEstudianteAGrupo(datos.usuario(), datos.sis(), datos.grupo());
            case "ASOCIAR" -> () -> habilitacion.asociarEstudiante(new AsociarEstudianteExamenRequest(
                    datos.sis(), datos.asignatura(), datos.examen(), true, null));
            default -> throw new IllegalArgumentException(via);
        };
        Runnable desactivar = () -> cuentas.cambiarEstado(datos.usuario(), false, "prueba@example.test", "local");
        if (desactivacionPrimero) cruzar(desactivar, generar);
        else cruzar(generar, desactivar);

        var fila = habilitaciones.findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(
                datos.asignatura(), datos.examen(), datos.sis()).orElseThrow();
        assertFalse(fila.getEstadohabilitacion());
        assertEquals("Usuario desactivado", fila.getObservacionhabilitacion());
        assertFalse(usuarios.findById(datos.usuario()).orElseThrow().getEstadousuario());
    }

    @Test
    void vistaPreviaYActualizacionUsanElMismoCorteYConservanOtrosMotivos() throws Exception {
        var datos = preparar(true);
        var anterior = preparar(true);
        var solicitud = new AsociarEstudianteExamenRequest(datos.sis(), datos.asignatura(), datos.examen(), true, null);
        var fila = habilitacion.asociarEstudiante(solicitud);
        var motivoPrevio = habilitacion.asociarEstudiante(new AsociarEstudianteExamenRequest(
                anterior.sis(), anterior.asignatura(), anterior.examen(), false, "Motivo previo"));
        // Simula cuentas inactivas anteriores al despliegue.
        jdbc.update("UPDATE usuario SET estadousuario=false WHERE idusuario IN (?,?)", datos.usuario(), anterior.usuario());
        String ruta = "src/main/java/bo/edu/umss/windsoft/control_ingreso_backend/persistencia/migraciones/"
                + "2026-11-28_observacion04_cuentas_inactivas.sql";
        String script = Files.readString(Path.of(ruta));
        String consulta = script.substring(script.indexOf("WITH inicios"), script.lastIndexOf("COMMIT;"))
                .replace(":'corte'", "?").replace(":'aplicar'", "?");
        var corte = OffsetDateTime.now(ZoneId.of("America/La_Paz")).toString();
        var previa = jdbc.queryForMap(consulta, corte, false);
        assertEquals(1L, previa.get("previstas"));
        assertEquals(0L, previa.get("modificadas"));
        var aplicada = jdbc.queryForMap(consulta, corte, true);
        assertEquals(previa.get("previstas"), aplicada.get("modificadas"));
        assertEquals(0L, jdbc.queryForMap(consulta, corte, true).get("modificadas"));
        var corregida = habilitacion.obtenerPorAsignaturaYExamen(datos.asignatura(), datos.examen()).getFirst();
        assertFalse(corregida.getEstadoHabilitacion());
        assertEquals("Usuario desactivado", corregida.getObservacionHabilitacion());
        assertEquals("Motivo previo", habilitacion.obtenerPorId(motivoPrevio.getIdHabilitacion()).getObservacionHabilitacion());

        var habilitar = new HabilitacionRequestDto(true, null);
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException.class,
                () -> habilitacion.actualizarHabilitacion(fila.getIdHabilitacion(), habilitar, "qa", "local"));
        cuentas.cambiarEstado(datos.usuario(), true, "qa", "local");
        assertFalse(habilitacion.obtenerPorId(fila.getIdHabilitacion()).getEstadoHabilitacion());
        assertTrue(habilitacion.actualizarHabilitacion(fila.getIdHabilitacion(), habilitar, "qa", "local").getEstadoHabilitacion());
    }

    @Test
    void ambasRutasBloqueanElAltaInactiva() {
        var datos = preparar(false);
        cuentas.cambiarEstado(datos.usuario(), false, "qa", "local");
        var contexto = mock(ContextoUsuarioService.class);
        when(contexto.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(-1, "qa", "ADMINISTRADOR"));
        var actual = new AsignacionIngresoController(asignacion, contexto);
        var compatible = new AsignacionIngresoCompatController(asignacion, contexto, examenes, responsables, usuarios);
        assertTrue(actual.operadoresDisponibles(datos.examen()).getBody().stream()
                .noneMatch(o -> o.idUsuario().equals(datos.usuario())));
        var item = new AsignacionIngresoRequestDTO.ItemAsignacion(datos.ambiente(), datos.usuario(), "A", "Z", "OPERADOR");
        var solicitud = new AsignacionIngresoRequestDTO(datos.asignatura(), List.of(item), "SUBDIVISION");
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> actual.guardarAsignacion(datos.examen(), solicitud)).getStatusCode().value());
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> compatible.guardar(datos.examen(),
                Map.of("responsables", List.of(Map.of("idAmbiente", datos.ambiente(), "idUsuario", datos.usuario(),
                        "rol", "OPERADOR", "apellidoDesde", "A", "apellidoHasta", "Z"))))).getStatusCode().value());
        assertTrue(asignaciones.findByIdIdexamenAndEstadoAsignacion(datos.examen(), "ACTIVO").isEmpty());
    }

    @Test
    void sincronizaUnaSolaVezLaMarcaOfflineDeUnExamenYaIniciado() {
        var datos = preparar(true);
        var operador = usuarios.save(new Usuario());
        var momento = OffsetDateTime.now(ZoneId.of("America/La_Paz"));
        jdbc.update("UPDATE examen SET fechaexamen=? WHERE idexamen=?", momento.toLocalDate().minusDays(1), datos.examen());
        assertTrue(habilitacion.asociarEstudiante(new AsociarEstudianteExamenRequest(
                datos.sis(), datos.asignatura(), datos.examen(), true, null)).getEstadoHabilitacion());
        var marca = new BatchSyncRequestDTO.ItemSyncDTO(UUID.randomUUID().toString(), datos.examen(),
                datos.asignatura(), datos.ambiente(), datos.sis().toString(), "MANUAL",
                momento.minusDays(1).withHour(9), 0L, "ADMINISTRADOR", false, null,
                0.95, 0.95, "qa", "qa", false, null);
        cuentas.cambiarEstado(datos.usuario(), false, "qa", "local");
        var contexto = mock(ContextoUsuarioService.class);
        when(contexto.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(operador.getIdusuario(), "qa", "ADMINISTRADOR"));
        var lote = new BatchSyncRequestDTO("qa", "qa", momento, List.of(marca));
        var batch = new BatchSyncController(control, contexto, ingresos);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "qa", null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
        try {
            assertEquals("PROCESADO", resultadoSync(batch, lote));
            assertEquals("DUPLICADO", resultadoSync(batch, lote));
            assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM ingreso WHERE idexamen=?", Long.class, datos.examen()));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void reactivarExamenInhabilitaAlEstudianteDesactivadoDuranteLaCancelacion() {
        var datos = preparar(true);
        var fila = habilitacion.asociarEstudiante(new AsociarEstudianteExamenRequest(
                datos.sis(), datos.asignatura(), datos.examen(), true, null));
        jdbc.update("UPDATE examen SET cancelado=true, estadoexamen=false WHERE idexamen=?", datos.examen());
        cuentas.cambiarEstado(datos.usuario(), false, "qa", "local");
        assertTrue(habilitacion.obtenerPorId(fila.getIdHabilitacion()).getEstadoHabilitacion());

        var auth = new UsernamePasswordAuthenticationToken(
                "qa", null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")));
        auth.setDetails(-1);
        SecurityContextHolder.getContext().setAuthentication(auth);
        try {
            examenService.reactivarExamen(datos.examen(), "local");
        } finally {
            SecurityContextHolder.clearContext();
        }

        var resultado = habilitacion.obtenerPorId(fila.getIdHabilitacion());
        assertFalse(resultado.getEstadoHabilitacion());
        assertEquals("Usuario desactivado", resultado.getObservacionHabilitacion());
    }

    private Object resultadoSync(BatchSyncController batch, BatchSyncRequestDTO lote) {
        var respuesta = batch.sincronizar(lote, new MockHttpServletRequest());
        var resultados = assertInstanceOf(List.class, respuesta.getBody().get("items"));
        return assertInstanceOf(Map.class, resultados.getFirst()).get("estado");
    }

    private void cruzar(Runnable primera, Runnable segunda) throws Exception {
        var primeraEscribio = new CountDownLatch(1);
        var permitirCommit = new CountDownLatch(1);
        var segundaEmpezo = new CountDownLatch(1);
        var a = CompletableFuture.runAsync(() -> transacciones.executeWithoutResult(estado -> {
            primera.run();
            primeraEscribio.countDown();
            esperar(permitirCommit);
        }));
        try {
            esperar(primeraEscribio);
            var b = CompletableFuture.runAsync(() -> transacciones.executeWithoutResult(estado -> {
                segundaEmpezo.countDown();
                segunda.run();
            }));
            esperar(segundaEmpezo);
            assertThrows(TimeoutException.class, () -> b.get(200, TimeUnit.MILLISECONDS));
            permitirCommit.countDown();
            a.get(10, TimeUnit.SECONDS);
            b.get(10, TimeUnit.SECONDS);
        } finally {
            permitirCommit.countDown();
        }
    }

    private void esperar(CountDownLatch evento) {
        try {
            assertTrue(evento.await(10, TimeUnit.SECONDS), "No avanzó la transacción");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError(e);
        }
    }

    private record Datos(Integer usuario, Integer sis, Integer asignatura, Integer examen,
                         Integer ambiente, Integer grupo) {}

    private Datos preparar(boolean estudiante) {
        return transacciones.execute(estado -> {
            jdbc.update("INSERT INTO semestre(idsemestre, estado) VALUES (1, 'ACTUAL') ON CONFLICT DO NOTHING");
            var usuario = usuarios.save(new Usuario());
            int id = usuario.getIdusuario();
            int sis = 10000 + id;
            int materia = 10000 + id;
            jdbc.update("INSERT INTO asignatura(idasignatura, nombreasignatura) VALUES (?, 'Prueba')", materia);
            var grupo = grupos.save(new Grupo(materia, "QA", null));
            jdbc.update("UPDATE grupo SET idsemestre=1 WHERE idgrupo=?", grupo.getIdGrupo());
            if (estudiante) {
                estudiantes.saveAndFlush(new Estudiante(id, sis));
                jdbc.update("INSERT INTO estudiantegrupo(idusuario, codsisestudiante, idgrupo, idasignatura) VALUES (?,?,?,?)",
                        id, sis, grupo.getIdGrupo(), materia);
            } else {
                ayudantes.save(new Ayudante(id));
            }
            var examen = new Examen();
            examen.setIdAsignatura(materia);
            examen.setIdGrupo(grupo.getIdGrupo());
            examen.setIdTipoExamen(1);
            examen.setEstadoExamen(true);
            examen.setFechaExamen(LocalDate.now(ZoneId.of("America/La_Paz")).plusDays(1));
            examenes.saveAndFlush(examen);
            jdbc.update("UPDATE examen SET idsemestre=1 WHERE idexamen=?", examen.getIdExamen());
            var aula = new Aula();
            aula.setNombreAula("QA " + id);
            aulas.save(aula);
            var ambiente = new Ambiente();
            ambiente.setIdExamen(examen.getIdExamen());
            ambiente.setIdAsignatura(materia);
            ambiente.setIdAula(aula.getIdAula());
            ambiente.setHoraInicio(LocalTime.of(8, 0));
            ambiente.setHoraFin(LocalTime.of(10, 0));
            ambiente.setTipoHorario(TipoHorario.EVENTUAL);
            ambientes.save(ambiente);
            return new Datos(id, sis, materia, examen.getIdExamen(), ambiente.getIdAmbiente(), grupo.getIdGrupo());
        });
    }
}
