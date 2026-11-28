package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoHorario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de ExamenService (HU2 - Registrar los diferentes exámenes).
 * No usan la base de datos: todos los repositorios son simulados (mocks).
 * Las pruebas se ejecutan como ADMINISTRADOR para no depender del docente autenticado.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExamenServiceTest {

    private static final int ID_USUARIO_DOCENTE = 50;
    private static final int CODSIS_DOCENTE = 202301500;
    private static final int ID_ASIGNATURA = 1;
    private static final int ID_AULA = 10;
    private static final LocalDate FECHA_FUTURA = LocalDate.now().plusDays(7);

    @Mock private ExamenRepository examenRepository;
    @Mock private AmbienteRepository ambienteRepository;
    @Mock private DocenteAsignaturaRepository docenteAsignaturaRepository;
    @Mock private HorarioRegularRepository horarioRegularRepository;
    @Mock private ExamenNormaGeneralRepository examenNormaGeneralRepository;
    @Mock private NormaEspecificaRepository normaEspecificaRepository;
    @Mock private TipoExamenRepository tipoExamenRepository;
    @Mock private AulaRepository aulaRepository;
    @Mock private DocenteRepository docenteRepository;
    @Mock private AsignaturaRepository asignaturaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuditoriaService auditoriaService;
    @Mock private GrupoRepository grupoRepository;
    @Mock private DocenteGrupoRepository docenteGrupoRepository;
    @Mock private HabilitacionRepository habilitacionRepository;
    @Mock private EstudianteGrupoRepository estudianteGrupoRepository;
    @Mock private EstudianteRepository estudianteRepository;
    @Mock private IngresoRepository ingresoRepository;
    @Mock private NormaGeneralRepository normaGeneralRepository;
    @Mock private CambioExamenService cambiosExamen;
    @Mock private CredencialRepository credencialRepository;
    @Mock private HabilitacionCuentaInactiva habilitacionCuentaInactiva;

    @InjectMocks
    private ExamenService examenService;

    @BeforeEach
    void setUp() {
        // Sesión simulada de administrador.
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin@gmail.com", null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));

        // El docente dicta la asignatura.
        when(docenteAsignaturaRepository.findById(any()))
                .thenReturn(Optional.of(mock(DocenteAsignatura.class)));

        // Tipos de examen del catálogo: 1 = Primer Parcial, 2 = Segundo Parcial.
        // (Se crean antes del when(...) para no configurar un mock dentro de otro.)
        TipoExamen primerParcial = tipoExamen(1, "Primer Parcial");
        TipoExamen segundoParcial = tipoExamen(2, "Segundo Parcial");
        when(tipoExamenRepository.findById(1)).thenReturn(Optional.of(primerParcial));
        when(tipoExamenRepository.findById(2)).thenReturn(Optional.of(segundoParcial));
        when(tipoExamenRepository.findByNombreTipoExamenIgnoreCase("Primer Parcial"))
                .thenReturn(Optional.of(primerParcial));

        // Por defecto, el docente todavía no registró ningún examen en la asignatura.
        when(examenRepository.findTiposUsadosByAsignaturaAndDocente(anyInt(), anyInt()))
                .thenReturn(List.of());

        // Cualquier aula consultada existe y está activa.
        Aula aula = aulaActiva();
        when(aulaRepository.findById(anyInt())).thenReturn(Optional.of(aula));

        // Al guardar, el examen recibe el id 100.
        when(examenRepository.save(any(Examen.class))).thenAnswer(inv -> {
            Examen examen = inv.getArgument(0);
            examen.setIdExamen(100);
            return examen;
        });
    }

    @AfterEach
    void limpiarSesion() {
        SecurityContextHolder.clearContext();
    }

    // ---------------------------------------------------------------------
    // Datos de apoyo
    // ---------------------------------------------------------------------

    private TipoExamen tipoExamen(int id, String nombre) {
        TipoExamen tipo = mock(TipoExamen.class);
        when(tipo.getIdTipoExamen()).thenReturn(id);
        when(tipo.getNombreTipoExamen()).thenReturn(nombre);
        when(tipo.getRequiereDescripcion()).thenReturn(false);
        return tipo;
    }

    private Aula aulaActiva() {
        Aula aula = mock(Aula.class);
        when(aula.getEstadoAula()).thenReturn(true);
        when(aula.getNombreAula()).thenReturn("Aula de prueba");
        return aula;
    }

    private Ambiente ambienteOcupado(int idExamen, LocalTime inicio, LocalTime fin) {
        Ambiente ambiente = mock(Ambiente.class);
        when(ambiente.getIdExamen()).thenReturn(idExamen);
        when(ambiente.getHoraInicio()).thenReturn(inicio);
        when(ambiente.getHoraFin()).thenReturn(fin);
        return ambiente;
    }

    /** Solicitud de examen con horario EVENTUAL. */
    private ExamenRequest solicitudEventual(int idTipoExamen, LocalDateTime fecha, int idAula,
                                           LocalTime inicio, LocalTime fin) {
        ExamenRequest request = new ExamenRequest();
        request.setIdUsuario(ID_USUARIO_DOCENTE);
        request.setCodsisDocente(CODSIS_DOCENTE);
        request.setIdAsignatura(ID_ASIGNATURA);
        request.setIdTipoExamen(idTipoExamen);
        request.setFechaExamen(fecha);
        request.setTipoHorario(TipoHorario.EVENTUAL);
        request.setIdAula(idAula);
        request.setHoraInicio(inicio);
        request.setHoraFin(fin);
        return request;
    }

    private LocalDateTime fechaFutura(LocalTime hora) {
        return LocalDateTime.of(FECHA_FUTURA, hora);
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    void editarAulaYHorarioConservaElAmbienteReferenciadoPorElAyudante() {
        Examen existente = new Examen();
        existente.setIdExamen(100);
        existente.setIdAsignatura(ID_ASIGNATURA);
        existente.setIdTipoExamen(1);
        existente.setIdUsuario(ID_USUARIO_DOCENTE);
        existente.setFechaExamen(FECHA_FUTURA);
        when(examenRepository.findById(100)).thenReturn(Optional.of(existente));
        Ambiente asignado = new Ambiente();
        asignado.setIdAmbiente(700);
        asignado.setIdExamen(100);
        asignado.setIdAsignatura(ID_ASIGNATURA);
        asignado.setIdAula(ID_AULA);
        asignado.setHoraInicio(LocalTime.of(9, 0));
        asignado.setHoraFin(LocalTime.of(10, 0));
        when(ambienteRepository.findByIdExamen(100)).thenReturn(List.of(asignado));
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(11, 0)), 20,
                LocalTime.of(11, 0), LocalTime.of(12, 0));

        examenService.actualizarExamen(100, request, "127.0.0.1");

        verify(ambienteRepository).save(same(asignado));
        verify(ambienteRepository, never()).deleteAll(any(Iterable.class));
        assertEquals(700, asignado.getIdAmbiente());
        assertEquals(20, asignado.getIdAula());
        assertEquals(LocalTime.of(11, 0), asignado.getHoraInicio());
        assertEquals(LocalTime.of(12, 0), asignado.getHoraFin());
    }

    @Test
    void editarVariasAulasConservaLosAmbientesDeLasAulasQueSiguen() {
        Examen existente = new Examen();
        existente.setIdExamen(100);
        existente.setIdAsignatura(ID_ASIGNATURA);
        existente.setIdTipoExamen(1);
        existente.setIdUsuario(ID_USUARIO_DOCENTE);
        existente.setFechaExamen(FECHA_FUTURA);
        when(examenRepository.findById(100)).thenReturn(Optional.of(existente));
        Ambiente reemplazado = new Ambiente();
        reemplazado.setIdAmbiente(700);
        reemplazado.setIdExamen(100);
        reemplazado.setIdAula(10);
        Ambiente conservado = new Ambiente();
        conservado.setIdAmbiente(701);
        conservado.setIdExamen(100);
        conservado.setIdAula(20);
        when(ambienteRepository.findByIdExamen(100)).thenReturn(List.of(reemplazado, conservado));
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(11, 0)), 30,
                LocalTime.of(11, 0), LocalTime.of(12, 0));
        request.setIdsAulasAdicionales(List.of(20));

        examenService.actualizarExamen(100, request, "127.0.0.1");

        verify(ambienteRepository).save(same(reemplazado));
        verify(ambienteRepository).save(same(conservado));
        verify(ambienteRepository, never()).deleteAll(any(Iterable.class));
        assertEquals(700, reemplazado.getIdAmbiente());
        assertEquals(30, reemplazado.getIdAula());
        assertEquals(701, conservado.getIdAmbiente());
        assertEquals(20, conservado.getIdAula());
    }

    private Examen prepararCancelacion(boolean cancelado) {
        var auth = new UsernamePasswordAuthenticationToken("admin@example.invalid", null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")));
        auth.setDetails(1);
        SecurityContextHolder.getContext().setAuthentication(auth);
        Examen examen = new Examen();
        examen.setIdExamen(100);
        examen.setIdAsignatura(ID_ASIGNATURA);
        examen.setFechaExamen(FECHA_FUTURA);
        examen.setCancelado(cancelado);
        when(examenRepository.findById(100)).thenReturn(Optional.of(examen));
        Ambiente ambiente = ambienteOcupado(100, LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(ambienteRepository.findByIdExamen(100)).thenReturn(List.of(ambiente));
        return examen;
    }

    @Test
    void cancelarExamen_registraMotivoEjecutorYExamen() {
        Examen examen = prepararCancelacion(false);
        examenService.cancelarExamen(100, "  Cambio de horario  ", "127.0.0.1");
        assertTrue(examen.getCancelado());
        verify(auditoriaService).registrarEnTransaccion(eq("CANCELACION_EXAMEN"), eq("admin@example.invalid"),
                eq("1"), contains("examen=100, motivo=Cambio de horario"), eq("127.0.0.1"));
    }

    @Test
    void reactivarExamen_registraOperacion() {
        Examen examen = prepararCancelacion(true);
        examenService.reactivarExamen(100, "127.0.0.1");
        verify(habilitacionCuentaInactiva).alReactivarExamen(argThat(e ->
                Boolean.TRUE.equals(e.getEstadoExamen()) && Boolean.FALSE.equals(e.getCancelado())));
        assertFalse(examen.getCancelado());
        verify(auditoriaService).registrarEnTransaccion(eq("REACTIVACION_EXAMEN"), eq("admin@example.invalid"),
                eq("1"), contains("examen=100"), eq("127.0.0.1"));
    }

    @Test
    void cancelarExamen_sinMotivoNoRegistraCancelacionExitosa() {
        prepararCancelacion(false);
        assertThrows(IllegalArgumentException.class, () -> examenService.cancelarExamen(100, "  ", "127.0.0.1"));
        verify(auditoriaService, never()).registrarEnTransaccion(eq("CANCELACION_EXAMEN"), any(), any(), any(), any());
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    void cancelarExamen_falloAuditoriaImpideRespuestaExitosa() throws Exception {
        prepararCancelacion(false);
        doThrow(new IllegalStateException("auditoria no disponible")).when(auditoriaService)
                .registrarEnTransaccion(eq("CANCELACION_EXAMEN"), any(), any(), any(), any());
        assertThrows(IllegalStateException.class, () -> examenService.cancelarExamen(100, "Cambio", "127.0.0.1"));
        assertNotNull(ExamenService.class.getMethod("cancelarExamen", Integer.class, String.class, String.class)
                .getAnnotation(org.springframework.transaction.annotation.Transactional.class));
    }

    @Test
    @DisplayName("La creacion exitosa solicita auditoria en la misma transaccion")
    void registrarExamen_guardaAuditoria() {
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(9, 0)), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));
        Examen resultado = examenService.registrarExamen(request, "127.0.0.1");
        assertEquals(100, resultado.getIdExamen());
        verify(auditoriaService).registrarEnTransaccion(eq("CREACION_EXAMEN"), eq("admin@gmail.com"),
                isNull(), contains("examen=100"), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("Un fallo de auditoria impide confirmar la creacion del examen")
    void registrarExamen_fallaSiAuditoriaFalla() {
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(9, 0)), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));
        doThrow(new IllegalStateException("auditoria no disponible"))
                .when(auditoriaService).registrarEnTransaccion(eq("CREACION_EXAMEN"), anyString(),
                        isNull(), anyString(), anyString());
        assertThrows(IllegalStateException.class, () -> examenService.registrarExamen(request, "127.0.0.1"));
    }

    @Test
    @DisplayName("C6-C8 - No se permite registrar el Segundo Parcial sin haber registrado el Primer Parcial")
    void registrarExamen_segundoParcialSinPrimero_rechaza() {
        // El docente no tiene ningún examen registrado (tiposUsados vacío).
        ExamenRequest request = solicitudEventual(2, fechaFutura(LocalTime.of(9, 0)), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));

        assertThrows(IllegalArgumentException.class, () -> examenService.registrarExamen(request, "127.0.0.1"));
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("Se admite el Segundo Parcial cuando ya existe el Primero")
    void registrarExamen_segundoParcialConPrimero_permite() {
        when(examenRepository.findTiposUsadosByAsignaturaAndDocente(anyInt(), anyInt())).thenReturn(List.of(1));
        ExamenRequest request = solicitudEventual(2, fechaFutura(LocalTime.of(9, 0)), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));
        assertNotNull(examenService.registrarExamen(request, "127.0.0.1"));
    }

    @Test
    @DisplayName("El horario eventual permite los limites institucionales")
    void registrarExamen_horarioEnLimites_permite() {
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(6, 45)), ID_AULA,
                LocalTime.of(6, 45), LocalTime.of(21, 45));
        assertNotNull(examenService.registrarExamen(request, "127.0.0.1"));
    }

    @Test
    @DisplayName("C20 - Se rechaza un examen cuya hora de fin no es posterior a la de inicio")
    void registrarExamen_horaFinAnteriorAInicio_rechaza() {
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(10, 0)), ID_AULA,
                LocalTime.of(10, 0), LocalTime.of(9, 0));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> examenService.registrarExamen(request, "127.0.0.1"));
        assertEquals("La hora de fin debe ser posterior a la hora de inicio.", error.getMessage());
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("C21 - Se rechaza un horario eventual fuera del horario institucional (06:45 - 21:45)")
    void registrarExamen_fueraDeHorarioInstitucional_rechaza() {
        // Empieza a las 06:00, antes de las 06:45.
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(6, 0)), ID_AULA,
                LocalTime.of(6, 0), LocalTime.of(7, 30));

        assertThrows(IllegalArgumentException.class, () -> examenService.registrarExamen(request, "127.0.0.1"));
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("C22 - Se rechaza un examen programado en una fecha u hora pasada")
    void registrarExamen_fechaPasada_rechaza() {
        ExamenRequest request = solicitudEventual(1, LocalDateTime.now().minusDays(1), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> examenService.registrarExamen(request, "127.0.0.1"));
        assertEquals("La fecha del examen no puede ser anterior a la fecha actual.", error.getMessage());
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("C30 - Se detecta el solapamiento de horarios en un mismo ambiente")
    void registrarExamen_solapamientoEnMismoAmbiente_rechaza() {
        // El aula 10 ya está ocupada de 08:00 a 10:00 por el examen 99.
        Ambiente ocupado = ambienteOcupado(99, LocalTime.of(8, 0), LocalTime.of(10, 0));
        when(ambienteRepository.findByIdAulaYFecha(ID_AULA, FECHA_FUTURA))
                .thenReturn(List.of(ocupado));

        // El nuevo examen es de 09:00 a 11:00 en la misma aula.
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(9, 0)), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));

        var error = assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoDuplicadoException.class,
                () -> examenService.registrarExamen(request, "127.0.0.1"));
        assertTrue(error.getMessage().contains("ya está ocupada"));
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("C31 - Se detecta el solapamiento de horarios de un mismo docente, aunque sea en otro ambiente")
    void registrarExamen_solapamientoDelMismoDocente_rechaza() {
        // El docente ya tiene el examen 99 ese mismo día, de 08:00 a 10:00, en el aula 10.
        Examen examenExistente = mock(Examen.class);
        when(examenExistente.getIdExamen()).thenReturn(99);
        when(examenExistente.getFechaExamen()).thenReturn(FECHA_FUTURA);
        when(examenRepository.findByIdUsuarioAndCodsisDocente(ID_USUARIO_DOCENTE, CODSIS_DOCENTE))
                .thenReturn(List.of(examenExistente));
        Ambiente ambienteExistente = ambienteOcupado(99, LocalTime.of(8, 0), LocalTime.of(10, 0));
        when(ambienteRepository.findByIdExamen(99)).thenReturn(List.of(ambienteExistente));
        when(ambienteRepository.findByIdExamenIn(any())).thenReturn(List.of(ambienteExistente));

        // El nuevo examen es de 09:00 a 11:00 en OTRA aula (20), que está libre.
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(9, 0)), 20,
                LocalTime.of(9, 0), LocalTime.of(11, 0));

        assertThrows(IllegalArgumentException.class, () -> examenService.registrarExamen(request, "127.0.0.1"));
        verify(examenRepository, never()).save(any(Examen.class));
    }
}
