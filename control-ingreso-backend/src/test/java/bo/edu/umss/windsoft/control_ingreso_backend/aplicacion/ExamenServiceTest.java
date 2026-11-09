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
    @DisplayName("C6-C8 - No se permite registrar el Segundo Parcial sin haber registrado el Primer Parcial")
    void registrarExamen_segundoParcialSinPrimero_rechaza() {
        // El docente no tiene ningún examen registrado (tiposUsados vacío).
        ExamenRequest request = solicitudEventual(2, fechaFutura(LocalTime.of(9, 0)), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));

        assertThrows(IllegalArgumentException.class, () -> examenService.registrarExamen(request));
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("C20 - Se rechaza un examen cuya hora de fin no es posterior a la de inicio")
    void registrarExamen_horaFinAnteriorAInicio_rechaza() {
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(10, 0)), ID_AULA,
                LocalTime.of(10, 0), LocalTime.of(9, 0));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> examenService.registrarExamen(request));
        assertEquals("La hora de fin debe ser posterior a la hora de inicio.", error.getMessage());
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("C21 - Se rechaza un horario eventual fuera del horario institucional (06:45 - 21:45)")
    void registrarExamen_fueraDeHorarioInstitucional_rechaza() {
        // Empieza a las 06:00, antes de las 06:45.
        ExamenRequest request = solicitudEventual(1, fechaFutura(LocalTime.of(6, 0)), ID_AULA,
                LocalTime.of(6, 0), LocalTime.of(7, 30));

        assertThrows(IllegalArgumentException.class, () -> examenService.registrarExamen(request));
        verify(examenRepository, never()).save(any(Examen.class));
    }

    @Test
    @DisplayName("C22 - Se rechaza un examen programado en una fecha u hora pasada")
    void registrarExamen_fechaPasada_rechaza() {
        ExamenRequest request = solicitudEventual(1, LocalDateTime.now().minusDays(1), ID_AULA,
                LocalTime.of(9, 0), LocalTime.of(11, 0));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> examenService.registrarExamen(request));
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

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> examenService.registrarExamen(request));
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

        assertThrows(IllegalArgumentException.class, () -> examenService.registrarExamen(request));
        verify(examenRepository, never()).save(any(Examen.class));
    }
}