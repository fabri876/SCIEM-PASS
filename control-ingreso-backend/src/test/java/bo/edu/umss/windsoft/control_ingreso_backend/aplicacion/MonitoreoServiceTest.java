package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.CambioAmbiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CambioAmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoNoAutorizadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AlertaDesubicadoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AulaMonitoreoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReubicacionDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.TableroMonitoreoDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias del dashboard de monitoreo (HU10): reparto por aulas,
 * métricas y "Reubicar y Autorizar". No usan la base de datos.
 *
 * Escenario: examen 3 con dos aulas de capacidad 2 cada una (Aula 601 y Aula 604)
 * y 4 habilitados. Por apellido: Alba y Barrios → Aula 601; Cruz y Daza → Aula 604.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MonitoreoServiceTest {

    private static final int ID_ASIGNATURA = 1;
    private static final int ID_EXAMEN = 3;
    private static final int AMB_601 = 7;
    private static final int AMB_604 = 8;
    private static final int ID_DOCENTE = 50;

    @Mock private AmbienteRepository ambienteRepository;
    @Mock private AulaRepository aulaRepository;
    @Mock private AsignaturaRepository asignaturaRepository;
    @Mock private ExamenRepository examenRepository;
    @Mock private HabilitacionRepository habilitacionRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private CambioAmbienteRepository cambioAmbienteRepository;
    @Mock private IngresoRepository ingresoRepository;
    @Mock private IntentoNoAutorizadoRepository intentoRepository;
    @Mock private DocenteAsignaturaRepository docenteAsignaturaRepository;
    @Mock private AyudanteExamenRepository ayudanteExamenRepository;
    @Mock private AuditoriaService auditoriaService;
    @Mock private PlatformTransactionManager transactionManager;

    private MonitoreoService service;
    private AsignacionAulaService asignacion;
    private TransactionStatus estadoTransaccion;
    private final List<Ingreso> ingresos = new ArrayList<>();
    private final List<CambioAmbiente> cambios = new ArrayList<>();

    @BeforeEach
    void setUp() {
        // La reubicación corre dentro de un TransactionTemplate: se simula el manejador de transacciones
        estadoTransaccion = mock(TransactionStatus.class);
        when(transactionManager.getTransaction(any())).thenReturn(estadoTransaccion);

        ContextoUsuarioService contexto = new ContextoUsuarioService(docenteAsignaturaRepository, examenRepository,
                ayudanteExamenRepository, auditoriaService);
        AmbienteExamenService ambientes = new AmbienteExamenService(ambienteRepository, aulaRepository,
                asignaturaRepository, examenRepository, ingresoRepository, contexto);
        asignacion = new AsignacionAulaService(ambienteRepository, aulaRepository, habilitacionRepository,
                usuarioRepository, cambioAmbienteRepository);
        service = new MonitoreoService(asignacion, ambientes, contexto, ingresoRepository, intentoRepository,
                cambioAmbienteRepository, usuarioRepository, examenRepository, auditoriaService, transactionManager);

        Ambiente a601 = ambiente(AMB_601, 10);
        Ambiente a604 = ambiente(AMB_604, 11);
        when(ambienteRepository.findByIdExamen(ID_EXAMEN)).thenReturn(List.of(a604, a601));
        when(ambienteRepository.findById(AMB_601)).thenReturn(Optional.of(a601));
        when(ambienteRepository.findById(AMB_604)).thenReturn(Optional.of(a604));
        when(aulaRepository.findAllById(any())).thenReturn(List.of(aula(10, "Aula 601", 2), aula(11, "Aula 604", 2)));

        Asignatura asignatura = new Asignatura();
        asignatura.setIdAsignatura(ID_ASIGNATURA);
        asignatura.setNombreAsignatura("Cálculo I");
        when(asignaturaRepository.findAllById(any())).thenReturn(List.of(asignatura));

        Examen examen = new Examen();
        examen.setIdExamen(ID_EXAMEN);
        examen.setIdUsuario(ID_DOCENTE);
        examen.setFechaExamen(HoraOficial.hoy());
        when(examenRepository.findAllById(any())).thenReturn(List.of(examen));
        when(examenRepository.findById(ID_EXAMEN)).thenReturn(Optional.of(examen));

        // Habilitados (desordenados a propósito: el reparto los ordena por apellido)
        List<Usuario> usuarios = List.of(usuario(103, "Ana", "Cruz"), usuario(101, "Luis", "Alba"),
                usuario(104, "Eva", "Daza"), usuario(102, "Juan", "Barrios"));
        when(usuarioRepository.findAllById(any())).thenReturn(usuarios);
        usuarios.forEach(u -> when(usuarioRepository.findById(u.getIdusuario())).thenReturn(Optional.of(u)));
        List<Habilitacion> habilitaciones = usuarios.stream()
                .map(u -> new Habilitacion(new Estudiante(u.getIdusuario(), 9000 + u.getIdusuario()), true, null))
                .toList();
        when(habilitacionRepository.findHabilitadosConEstudiante(ID_ASIGNATURA, ID_EXAMEN)).thenReturn(habilitaciones);

        when(cambioAmbienteRepository.findByIdAmbienteInOrderByFechaHoraCambioAscIdCambioAsc(any())).thenReturn(cambios);
        when(ingresoRepository.findByIdAsignaturaAndIdExamenAndIdExpulsionIsNull(ID_ASIGNATURA, ID_EXAMEN)).thenReturn(ingresos);
        when(ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(anyInt(), eq(ID_ASIGNATURA), eq(ID_EXAMEN)))
                .thenAnswer(inv -> ingresos.stream().filter(i -> i.getCodsisEstudiante().equals(inv.getArgument(0))).findFirst());
        when(ingresoRepository.countByIdAmbienteAndIdExpulsionIsNull(anyInt()))
                .thenAnswer(inv -> ingresos.stream().filter(i -> i.getIdAmbiente().equals(inv.getArgument(0))).count());
        when(ingresoRepository.obtenerCapacidadAmbiente(anyInt())).thenReturn(2);
        when(ingresoRepository.saveAndFlush(any(Ingreso.class))).thenAnswer(inv -> inv.getArgument(0));

        autenticar("DOCENTE", ID_DOCENTE, "docente@umss.edu");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------------------------------------------------------------- reparto

    @Test
    @DisplayName("Reparto: por apellido y según capacidad (Alba, Barrios → 601; Cruz, Daza → 604)")
    void reparto_porApellido() {
        AsignacionAulaService.Reparto r = asignacion.repartir(ID_ASIGNATURA, ID_EXAMEN);

        assertEquals(AMB_601, r.asignacion().get(9101)); // Alba
        assertEquals(AMB_601, r.asignacion().get(9102)); // Barrios
        assertEquals(AMB_604, r.asignacion().get(9103)); // Cruz
        assertEquals(AMB_604, r.asignacion().get(9104)); // Daza
    }

    @Test
    @DisplayName("Reparto: la reubicación tiene prioridad sobre el reparto por apellido")
    void reparto_reubicacionTienePrioridad() {
        CambioAmbiente cambio = new CambioAmbiente();
        cambio.setCodsisEstudiante(9103);
        cambio.setIdAmbiente(AMB_601);
        cambios.add(cambio);

        assertEquals(AMB_601, asignacion.aulaAsignada(ID_ASIGNATURA, ID_EXAMEN, 9103).orElseThrow().idAmbiente());
    }

    @Test
    @DisplayName("Cuotas: proporcionales a la capacidad, y por partes iguales si un aula no tiene capacidad")
    void cuotas() {
        Ambiente a = new Ambiente();
        a.setIdAmbiente(1);
        List<AsignacionAulaService.AulaExamen> conCapacidad = List.of(
                new AsignacionAulaService.AulaExamen(a, "A", null, 30),
                new AsignacionAulaService.AulaExamen(a, "B", null, 10));
        assertArrayEquals(new int[]{6, 2}, AsignacionAulaService.calcularCuotas(conCapacidad, 8));

        List<AsignacionAulaService.AulaExamen> sinCapacidad = List.of(
                new AsignacionAulaService.AulaExamen(a, "A", null, null),
                new AsignacionAulaService.AulaExamen(a, "B", null, 10));
        assertArrayEquals(new int[]{3, 2}, AsignacionAulaService.calcularCuotas(sinCapacidad, 5));
    }

    // ---------------------------------------------------------------- métricas

    @Test
    @DisplayName("Sin ingresos ni duplicados: pendientes = habilitados, avance 0 %, indicadores en cero")
    void tablero_inicial() {
        TableroMonitoreoDto t = service.tablero(ID_EXAMEN, "ip");

        assertEquals(4, t.metricas().habilitados());
        assertEquals(0, t.metricas().ingresados());
        assertEquals(4, t.metricas().pendientes());
        assertEquals(0.0, t.metricas().porcentajeAvance());
        assertEquals(0, t.metricas().duplicadosBloqueados());
        assertEquals(0, t.metricas().aulasFueraDeLimite());
        assertEquals(2, t.aulas().size());
    }

    @Test
    @DisplayName("Con ingresos: baja pendientes, sube el avance y el aula llena queda 'Fuera de Límite'")
    void tablero_conIngresos() {
        ingresos.add(ingreso(9101, AMB_601));
        ingresos.add(ingreso(9102, AMB_601));
        ingresos.add(ingreso(9103, AMB_604));
        when(intentoRepository.countByIdAsignaturaAndIdExamenAndMotivo(ID_ASIGNATURA, ID_EXAMEN, MotivoIntento.DUPLICADO))
                .thenReturn(2L);

        TableroMonitoreoDto t = service.tablero(ID_EXAMEN, "ip");

        assertEquals(3, t.metricas().ingresados());
        assertEquals(1, t.metricas().pendientes());
        assertEquals(75.0, t.metricas().porcentajeAvance());
        assertEquals(2, t.metricas().duplicadosBloqueados());
        assertEquals(1, t.metricas().aulasFueraDeLimite());

        AulaMonitoreoDto a601 = t.aulas().get(0); // la más ocupada va primero
        assertEquals("Aula 601", a601.aula());
        assertTrue(a601.fueraDeLimite());
        assertEquals("FUERA_DE_LIMITE", a601.nivel());
        assertEquals(0, a601.disponibles());
        AulaMonitoreoDto a604 = t.aulas().get(1);
        assertFalse(a604.fueraDeLimite());
        assertEquals(1, a604.pendientes());
    }

    @Test
    @DisplayName("Alerta: estudiante de la 604 que se presentó en la 601 aparece con su aula asignada")
    void tablero_alertaDesubicado() {
        when(intentoRepository.findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(
                ID_ASIGNATURA, ID_EXAMEN, MotivoIntento.AMBIENTE_DIFERENTE)).thenReturn(List.of(intentoAulaDiferente()));

        TableroMonitoreoDto t = service.tablero(ID_EXAMEN, "ip");

        assertEquals(1, t.alertas().size());
        AlertaDesubicadoDto alerta = t.alertas().get(0);
        assertEquals("Aula 601", alerta.aulaActual());
        assertEquals("Aula 604", alerta.aulaAsignada());
        assertTrue(alerta.puedeReubicar());
        assertEquals(1, t.metricas().estudiantesDesubicados());
    }

    @Test
    @DisplayName("Alerta: el administrador la ve, pero 'Reubicar y Autorizar' es solo del docente")
    void tablero_alertaParaAdmin() {
        autenticar("ADMINISTRADOR", 1, "admin@umss.edu");
        when(intentoRepository.findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(
                ID_ASIGNATURA, ID_EXAMEN, MotivoIntento.AMBIENTE_DIFERENTE)).thenReturn(List.of(intentoAulaDiferente()));

        AlertaDesubicadoDto alerta = service.tablero(ID_EXAMEN, "ip").alertas().get(0);

        assertFalse(alerta.puedeReubicar());
        assertTrue(alerta.motivoNoReubicable().contains("exclusiva del docente"));
    }

    @Test
    @DisplayName("Alerta: desaparece cuando el estudiante ya ingresó")
    void tablero_alertaResuelta() {
        when(intentoRepository.findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(
                ID_ASIGNATURA, ID_EXAMEN, MotivoIntento.AMBIENTE_DIFERENTE)).thenReturn(List.of(intentoAulaDiferente()));
        ingresos.add(ingreso(9103, AMB_604));

        assertTrue(service.tablero(ID_EXAMEN, "ip").alertas().isEmpty());
    }

    // ---------------------------------------------------------- reubicación

    @Test
    @DisplayName("Reubicar y Autorizar: cambia la asignación al aula actual, registra el ingreso y se audita")
    void reubicar_ok() {
        when(intentoRepository.findById(77)).thenReturn(Optional.of(intentoAulaDiferente()));

        ReubicacionDto r = service.reubicarYAutorizar(77, "ip");

        assertEquals("Aula 604", r.aulaOrigen());
        assertEquals("Aula 601", r.aulaDestino());
        ArgumentCaptor<CambioAmbiente> cambio = ArgumentCaptor.forClass(CambioAmbiente.class);
        verify(cambioAmbienteRepository).save(cambio.capture());
        assertEquals(AMB_601, cambio.getValue().getIdAmbiente());
        assertEquals(AMB_604, cambio.getValue().getIdAmbienteOrigen());
        assertEquals(77, cambio.getValue().getIdIntentoOrigen());
        ArgumentCaptor<Ingreso> ingreso = ArgumentCaptor.forClass(Ingreso.class);
        verify(ingresoRepository).saveAndFlush(ingreso.capture());
        assertEquals(AMB_601, ingreso.getValue().getIdAmbiente());
        assertEquals(MetodoIngreso.MANUAL, ingreso.getValue().getMetodoIngreso());
        verify(ingresoRepository).bloquearAmbiente(AMB_601);
        verify(auditoriaService).registrarEnTransaccion(eq("REUBICACION_EXPRESS"), anyString(), anyString(), anyString(), eq("ip"));
    }

    @Test
    @DisplayName("Reubicar y Autorizar: la auditoría se escribe antes del commit")
    void reubicar_ok_auditaAntesDelCommit() {
        when(intentoRepository.findById(77)).thenReturn(Optional.of(intentoAulaDiferente()));

        service.reubicarYAutorizar(77, "ip");

        InOrder orden = inOrder(transactionManager, auditoriaService);
        orden.verify(auditoriaService).registrarEnTransaccion(eq("REUBICACION_EXPRESS"), anyString(), anyString(), anyString(), eq("ip"));
        orden.verify(transactionManager).commit(estadoTransaccion);
        verify(transactionManager, never()).rollback(any());
    }

    @Test
    void reubicar_falloAuditoriaRevierteLaTransaccion() {
        when(intentoRepository.findById(77)).thenReturn(Optional.of(intentoAulaDiferente()));
        doThrow(new IllegalStateException("auditoria no disponible")).when(auditoriaService)
                .registrarEnTransaccion(eq("REUBICACION_EXPRESS"), anyString(), anyString(), anyString(), eq("ip"));
        assertThrows(IllegalStateException.class, () -> service.reubicarYAutorizar(77, "ip"));
        verify(transactionManager).rollback(estadoTransaccion);
        verify(transactionManager, never()).commit(any());
    }

    @Test
    @DisplayName("Reubicar y Autorizar: sin pupitres libres se rechaza y se mantiene la asignación original")
    void reubicar_sinCupo() {
        when(intentoRepository.findById(77)).thenReturn(Optional.of(intentoAulaDiferente()));
        ingresos.add(ingreso(9101, AMB_601));
        ingresos.add(ingreso(9102, AMB_601));

        ConflictoEstadoException ex = assertThrows(ConflictoEstadoException.class,
                () -> service.reubicarYAutorizar(77, "ip"));

        assertTrue(ex.getMessage().contains("no tiene pupitres libres"));
        assertTrue(ex.getMessage().contains("Aula 604"));
        verify(cambioAmbienteRepository, never()).save(any());
        verify(ingresoRepository, never()).saveAndFlush(any());
        verify(auditoriaService).registrar(eq("REUBICACION_RECHAZADA"), anyString(), anyString(), contains("pupitres"), eq("ip"));
    }

    @Test
    @DisplayName("BUG-038: sin cupo, la transacción hace rollback y la auditoría del rechazo se escribe DESPUÉS")
    void reubicar_sinCupo_auditaDespuesDelRollback() {
        when(intentoRepository.findById(77)).thenReturn(Optional.of(intentoAulaDiferente()));
        ingresos.add(ingreso(9101, AMB_601));
        ingresos.add(ingreso(9102, AMB_601));

        assertThrows(ConflictoEstadoException.class, () -> service.reubicarYAutorizar(77, "ip"));

        InOrder orden = inOrder(transactionManager, auditoriaService);
        orden.verify(transactionManager).rollback(estadoTransaccion);
        orden.verify(auditoriaService).registrar(eq("REUBICACION_RECHAZADA"), anyString(), anyString(),
                contains("pupitres"), eq("ip"));
        verify(transactionManager, never()).commit(any());
    }

    @Test
    @DisplayName("Reubicar y Autorizar: el administrador no puede usarla (403) y queda auditado")
    void reubicar_adminDenegado() {
        autenticar("ADMINISTRADOR", 1, "admin@umss.edu");

        AccesoDenegadoException ex = assertThrows(AccesoDenegadoException.class,
                () -> service.reubicarYAutorizar(77, "ip"));

        assertTrue(ex.getMessage().contains("exclusiva del docente"));
        verify(auditoriaService).registrar(eq("ACCESO_DENEGADO"), anyString(), anyString(), anyString(), eq("ip"));
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Reubicar y Autorizar: si ya ingresó, se rechaza sin tocar la asignación")
    void reubicar_yaIngreso() {
        when(intentoRepository.findById(77)).thenReturn(Optional.of(intentoAulaDiferente()));
        ingresos.add(ingreso(9103, AMB_604));

        assertThrows(ConflictoEstadoException.class, () -> service.reubicarYAutorizar(77, "ip"));
        verify(cambioAmbienteRepository, never()).save(any());
    }

    // ---------------------------------------------------- lista y curva

    @Test
    @DisplayName("Lista del aula: asignados por apellido con su estado; el reubicado aparece en su aula nueva")
    void asistentes_conReubicado() {
        when(ingresoRepository.findByIdAsignaturaAndIdExamen(ID_ASIGNATURA, ID_EXAMEN)).thenReturn(ingresos);
        Ingreso alba = ingreso(9101, AMB_601);
        alba.setHoraIngreso(HoraOficial.hoy().atTime(7, 52));
        ingresos.add(alba);
        CambioAmbiente cambio = new CambioAmbiente();
        cambio.setCodsisEstudiante(9103);       // Cruz: de la 604 a la 601
        cambio.setIdAmbiente(AMB_601);
        cambio.setIdAmbienteOrigen(AMB_604);
        cambios.add(cambio);

        var lista = service.asistentes(AMB_601, "ip");

        assertEquals("Aula 601", lista.aula());
        assertEquals(3, lista.asistentes().size()); // Alba, Barrios y Cruz (reubicada)
        assertEquals("PRESENTE", lista.asistentes().get(0).estado());
        assertEquals("AUSENTE", lista.asistentes().get(1).estado());
        var cruz = lista.asistentes().stream().filter(a -> a.codSis() == 9103).findFirst().orElseThrow();
        assertTrue(cruz.observacion().contains("Reubicado desde Aula 604"));
    }

    @Test
    @DisplayName("Lista del aula: un ingreso excepcional sin asignación aparece como EXCEPCIONAL con su motivo")
    void asistentes_excepcional() {
        when(ingresoRepository.findByIdAsignaturaAndIdExamen(ID_ASIGNATURA, ID_EXAMEN)).thenReturn(ingresos);
        Ingreso excepcional = ingreso(5555, AMB_604);
        excepcional.setTipoIngreso(TipoIngreso.EXCEPCIONAL);
        excepcional.setMotivoExcepcion(bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion.SIN_CARNET_QR);
        excepcional.setIdUsuarioEstudiante(999);
        ingresos.add(excepcional);

        var lista = service.asistentes(AMB_604, "ip");

        var fila = lista.asistentes().stream().filter(a -> a.codSis() == 5555).findFirst().orElseThrow();
        assertEquals("EXCEPCIONAL", fila.estado());
        assertTrue(fila.observacion().contains("Sin carnet o QR"));
    }

    @Test
    @DisplayName("CSV de la lista: se genera y queda en auditoría como EXPORTACION_ASISTENCIA")
    void asistentesCsv_audita() {
        when(ingresoRepository.findByIdAsignaturaAndIdExamen(ID_ASIGNATURA, ID_EXAMEN)).thenReturn(ingresos);

        String csv = new String(service.asistentesCsv(AMB_601, "ip"), java.nio.charset.StandardCharsets.UTF_8);

        assertTrue(csv.contains("Código SIS;Estudiante"));
        assertTrue(csv.contains("Alba"));
        verify(auditoriaService).registrar(eq("EXPORTACION_ASISTENCIA"), anyString(), anyString(), contains("Aula 601"), eq("ip"));
    }

    @Test
    @DisplayName("Curva de llegada: agrupa cada 5 minutos y rellena con cero los tramos sin ingresos")
    void llegadas_agrupaYRellena() {
        Ingreso a = ingreso(9101, AMB_601);
        a.setHoraIngreso(HoraOficial.hoy().atTime(7, 41));
        Ingreso b = ingreso(9102, AMB_601);
        b.setHoraIngreso(HoraOficial.hoy().atTime(7, 44));
        Ingreso c = ingreso(9103, AMB_604);
        c.setHoraIngreso(HoraOficial.hoy().atTime(7, 52));
        ingresos.addAll(List.of(a, b, c));

        var curva = service.llegadas(ID_EXAMEN, 5, "ip");

        assertEquals(3, curva.size());
        assertEquals("07:40", curva.get(0).hora());
        assertEquals(2, curva.get(0).cantidad());
        assertEquals(0, curva.get(1).cantidad()); // 07:45 sin ingresos
        assertEquals(1, curva.get(2).cantidad());
    }

    // ---------------------------------------------------------- auxiliares

    private IntentoNoAutorizado intentoAulaDiferente() {
        IntentoNoAutorizado intento = new IntentoNoAutorizado();
        ReflectionTestUtils.setField(intento, "idIntento", 77);
        intento.setMotivo(MotivoIntento.AMBIENTE_DIFERENTE);
        intento.setCodsisEstudiante(9103);          // Cruz, asignada a la 604
        intento.setIdUsuarioEstudiante(103);
        intento.setIdAmbiente(AMB_601);             // se presentó en la 601
        intento.setIdAmbienteAsignado(AMB_604);
        intento.setHoraIntento(HoraOficial.ahora());
        return intento;
    }

    private Ingreso ingreso(int codSis, int idAmbiente) {
        Ingreso i = new Ingreso();
        i.setCodsisEstudiante(codSis);
        i.setIdAmbiente(idAmbiente);
        i.setTipoIngreso(TipoIngreso.NORMAL);
        return i;
    }

    private Ambiente ambiente(int id, int idAula) {
        Ambiente a = new Ambiente();
        a.setIdAmbiente(id);
        a.setIdAsignatura(ID_ASIGNATURA);
        a.setIdExamen(ID_EXAMEN);
        a.setIdAula(idAula);
        a.setHoraInicio(LocalTime.MIN);
        a.setHoraFin(LocalTime.MAX);
        return a;
    }

    private Aula aula(int id, String nombre, int capacidad) {
        Aula a = new Aula();
        a.setIdAula(id);
        a.setNombreAula(nombre);
        a.setCapacidadAula(capacidad);
        return a;
    }

    private Usuario usuario(int id, String nombre, String apellido) {
        Usuario u = new Usuario("ci" + id, nombre, apellido, null, nombre.toLowerCase() + "@est.umss.edu", "x", true);
        u.setIdusuario(id);
        return u;
    }

    private void autenticar(String rol, int idUsuario, String correo) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(correo, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
        auth.setDetails(idUsuario);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
