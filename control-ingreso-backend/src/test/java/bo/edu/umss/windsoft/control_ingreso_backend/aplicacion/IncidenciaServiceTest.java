package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignaturaId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Expulsion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Incidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.SeveridadIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIncidencia;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExpulsionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IncidenciaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de IncidenciaService (HU06).
 * No usan la base de datos: los repositorios son simulados.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IncidenciaServiceTest {

    private static final int ID_AMBIENTE = 7;
    private static final int ID_ASIGNATURA = 1;
    private static final int ID_EXAMEN = 3;
    private static final int ID_DOCENTE = 50;
    private static final int ID_ESTUDIANTE = 200;
    private static final int CODSIS = 202201994;
    private static final String DESCRIPCION = "Celular encendido debajo de la hoja de respuestas.";

    @Mock private IncidenciaRepository incidenciaRepository;
    @Mock private IngresoRepository ingresoRepository;
    @Mock private ExpulsionRepository expulsionRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AmbienteRepository ambienteRepository;
    @Mock private AulaRepository aulaRepository;
    @Mock private AsignaturaRepository asignaturaRepository;
    @Mock private ExamenRepository examenRepository;
    @Mock private DocenteAsignaturaRepository docenteAsignaturaRepository;
    @Mock private AyudanteExamenRepository ayudanteExamenRepository;
    @Mock private EstudianteRepository estudianteRepository;
    @Mock private HabilitacionRepository habilitacionRepository;
    @Mock private EvidenciaService evidenciaService;
    @Mock private AuditoriaService auditoriaService;

    private IncidenciaService service;
    private Examen examen;

    @BeforeEach
    void setUp() {
        ContextoUsuarioService contexto = new ContextoUsuarioService(docenteAsignaturaRepository, examenRepository,
                ayudanteExamenRepository, auditoriaService);
        AmbienteExamenService ambientes = new AmbienteExamenService(ambienteRepository, aulaRepository,
                asignaturaRepository, examenRepository, ingresoRepository, contexto);
        EstudianteExamenService estudiantes = new EstudianteExamenService(estudianteRepository, usuarioRepository,
                habilitacionRepository);
        service = new IncidenciaService(incidenciaRepository, ingresoRepository, expulsionRepository,
                usuarioRepository, ambientes, estudiantes, contexto, evidenciaService, auditoriaService);

        Ambiente ambiente = new Ambiente();
        ambiente.setIdAmbiente(ID_AMBIENTE);
        ambiente.setIdAsignatura(ID_ASIGNATURA);
        ambiente.setIdExamen(ID_EXAMEN);
        ambiente.setIdAula(10);
        ambiente.setHoraFin(LocalTime.MAX);
        when(ambienteRepository.findById(ID_AMBIENTE)).thenReturn(Optional.of(ambiente));

        Aula aula = new Aula();
        aula.setIdAula(10);
        aula.setNombreAula("Aula 601");
        when(aulaRepository.findAllById(any())).thenReturn(List.of(aula));
        Asignatura asignatura = new Asignatura();
        asignatura.setIdAsignatura(ID_ASIGNATURA);
        asignatura.setNombreAsignatura("Cálculo I");
        when(asignaturaRepository.findAllById(any())).thenReturn(List.of(asignatura));
        examen = new Examen();
        examen.setIdExamen(ID_EXAMEN);
        examen.setFechaExamen(HoraOficial.hoy());
        examen.setIdUsuario(ID_DOCENTE); // la docente es la responsable (asignada) del examen
        when(examenRepository.findAllById(any())).thenReturn(List.of(examen));
        when(examenRepository.findById(ID_EXAMEN)).thenReturn(Optional.of(examen));

        when(docenteAsignaturaRepository.findByIdIdusuario(ID_DOCENTE)).thenReturn(List.of(
                new DocenteAsignatura(new DocenteAsignaturaId(ID_DOCENTE, 1001, ID_ASIGNATURA))));

        Usuario estudiante = new Usuario("1234567", "Juan", "Pérez García", null, "j.perez@est.umss.edu", "x", true);
        estudiante.setIdusuario(ID_ESTUDIANTE);
        when(estudianteRepository.findByCodsisestudiante(CODSIS)).thenReturn(Optional.of(new Estudiante(ID_ESTUDIANTE, CODSIS)));
        when(usuarioRepository.findById(ID_ESTUDIANTE)).thenReturn(Optional.of(estudiante));
        when(usuarioRepository.findAllById(any())).thenReturn(List.of(estudiante));

        when(incidenciaRepository.findByClaveSolicitud(any())).thenReturn(Optional.empty());
        when(incidenciaRepository.saveAndFlush(any(Incidencia.class))).thenAnswer(inv -> {
            Incidencia i = inv.getArgument(0);
            ReflectionTestUtils.setField(i, "idIncidencia", 14);
            return i;
        });
        when(incidenciaRepository.save(any(Incidencia.class))).thenAnswer(inv -> inv.getArgument(0));
        when(expulsionRepository.save(any(Expulsion.class))).thenAnswer(inv -> {
            Expulsion e = inv.getArgument(0);
            ReflectionTestUtils.setField(e, "idExpulsion", 5);
            return e;
        });
        when(expulsionRepository.findFirstByIdIncidencia(any())).thenReturn(Optional.empty());

        autenticar("DOCENTE", ID_DOCENTE, "ana.rocha@umss.edu");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Registrar: queda ABIERTA con código INC-014 y se audita")
    void registrar_ok() {
        IncidenciaDetalleDto dto = service.registrar(UUID.randomUUID().toString(), ID_AMBIENTE, "OBJETO_PROHIBIDO",
                "MEDIA", DESCRIPCION, null, false, null, "ip");

        assertEquals("INC-014", dto.codigo());
        assertEquals("ABIERTA", dto.estado());
        assertEquals("Aula 601", dto.aula());
        assertEquals(1, dto.lineaTiempo().size());
        verify(auditoriaService).registrar(eq("INCIDENCIA_REGISTRADA"), eq("ana.rocha@umss.edu"), anyString(),
                contains("INC-014"), eq("ip"));
    }

    @Test
    @DisplayName("Doble clic: la misma clave devuelve la incidencia existente sin crear otra")
    void registrar_mismaClave() {
        Incidencia existente = new Incidencia();
        ReflectionTestUtils.setField(existente, "idIncidencia", 14);
        existente.setIdAmbiente(ID_AMBIENTE);
        existente.setIdUsuarioReporta(ID_DOCENTE);
        existente.setTipo(TipoIncidencia.OTRO);
        existente.setSeveridad(SeveridadIncidencia.BAJA);
        existente.setFechaHora(HoraOficial.ahora());
        when(incidenciaRepository.findByClaveSolicitud(any())).thenReturn(Optional.of(existente));

        IncidenciaDetalleDto dto = service.registrar(UUID.randomUUID().toString(), ID_AMBIENTE, "OTRO", "BAJA",
                DESCRIPCION, null, false, null, "ip");

        assertEquals("INC-014", dto.codigo());
        verify(incidenciaRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("El operador puede registrar incidencias en el aula de examen que tiene asignada")
    void registrar_operador() {
        autenticar("OPERADOR", 70, "roberto.vargas@umss.edu");
        AyudanteExamenId asignacion = new AyudanteExamenId(70, ID_ASIGNATURA, ID_EXAMEN, ID_AMBIENTE);
        when(ayudanteExamenRepository.findById(asignacion))
                .thenReturn(Optional.of(new AyudanteExamen(asignacion, "ACTIVO")));

        assertNotNull(service.registrar(UUID.randomUUID().toString(), ID_AMBIENTE, "FALLA_TECNICA", "BAJA",
                "El lector QR dejó de funcionar.", null, false, null, "ip"));
    }

    @Test
    @DisplayName("Operador sin esa aula asignada (o con la asignación inactiva): 403 y auditado")
    void registrar_operadorSinAsignacion() {
        autenticar("OPERADOR", 70, "roberto.vargas@umss.edu");
        AyudanteExamenId asignacion = new AyudanteExamenId(70, ID_ASIGNATURA, ID_EXAMEN, ID_AMBIENTE);
        when(ayudanteExamenRepository.findById(asignacion))
                .thenReturn(Optional.of(new AyudanteExamen(asignacion, "INACTIVO")));

        AccesoDenegadoException ex = assertThrows(AccesoDenegadoException.class,
                () -> service.registrar(UUID.randomUUID().toString(), ID_AMBIENTE, "FALLA_TECNICA", "BAJA",
                        "El lector QR dejó de funcionar.", null, false, null, "ip"));
        assertEquals("No tiene asignada esta aula de examen.", ex.getMessage());
        verify(auditoriaService).registrar(eq("ACCESO_DENEGADO"), anyString(), anyString(), anyString(), anyString());
        verify(incidenciaRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Docente no asignado al examen: no puede registrar incidencias en él")
    void registrar_docenteNoAsignado() {
        examen.setIdUsuario(999);

        assertThrows(AccesoDenegadoException.class, () -> service.registrar(UUID.randomUUID().toString(),
                ID_AMBIENTE, "OTRO", "BAJA", DESCRIPCION, null, false, null, "ip"));
        verify(incidenciaRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Se puede registrar después del examen (examen de hace 3 días)")
    void registrar_despuesDelExamen() {
        examen.setFechaExamen(HoraOficial.hoy().minusDays(3));

        IncidenciaDetalleDto dto = service.registrar(UUID.randomUUID().toString(), ID_AMBIENTE, "OTRO", "BAJA",
                DESCRIPCION, null, false, null, "ip");
        assertEquals("ABIERTA", dto.estado());
    }

    @Test
    @DisplayName("No se puede registrar una incidencia de un examen que todavía no se tomó")
    void registrar_examenFuturo() {
        examen.setFechaExamen(HoraOficial.hoy().plusDays(2));

        assertThrows(ConflictoEstadoException.class, () -> service.registrar(UUID.randomUUID().toString(),
                ID_AMBIENTE, "OTRO", "BAJA", DESCRIPCION, null, false, null, "ip"));
        verify(incidenciaRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("El operador no puede ver la lista de incidencias")
    void listar_operadorDenegado() {
        autenticar("OPERADOR", 70, "roberto.vargas@umss.edu");

        assertThrows(AccesoDenegadoException.class, () -> service.listar(ID_EXAMEN, null, null, null, "ip"));
        verify(auditoriaService).registrar(eq("ACCESO_DENEGADO"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Retirar a un estudiante que no ingresó: no se permite")
    void registrar_retirarSinIngreso() {
        when(ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(CODSIS, ID_ASIGNATURA, ID_EXAMEN))
                .thenReturn(Optional.empty());

        assertThrows(ConflictoEstadoException.class, () -> service.registrar(UUID.randomUUID().toString(),
                ID_AMBIENTE, "SUPLANTACION", "ALTA", DESCRIPCION, CODSIS, true, null, "ip"));
        verify(incidenciaRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Retirar a un estudiante que ingresó: se crea la expulsión, se marca el ingreso y se audita")
    void registrar_retirarConIngreso() {
        Ingreso ingreso = new Ingreso();
        ReflectionTestUtils.setField(ingreso, "idIngreso", 1203);
        when(ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(CODSIS, ID_ASIGNATURA, ID_EXAMEN))
                .thenReturn(Optional.of(ingreso));

        service.registrar(UUID.randomUUID().toString(), ID_AMBIENTE, "SUPLANTACION", "ALTA", DESCRIPCION,
                CODSIS, true, null, "ip");

        assertEquals(5, ingreso.getIdExpulsion());
        verify(ingresoRepository).saveAndFlush(ingreso);
        verify(auditoriaService).registrar(eq("EXPULSION_REGISTRADA"), anyString(), eq("j.perez@est.umss.edu"),
                contains("ingreso #1203"), anyString());
    }

    @Test
    @DisplayName("Descripción de menos de 15 caracteres o tipo inválido: no se guarda")
    void registrar_validaciones() {
        assertThrows(SolicitudInvalidaException.class, () -> service.registrar(UUID.randomUUID().toString(),
                ID_AMBIENTE, "OTRO", "BAJA", "corta", null, false, null, "ip"));
        assertThrows(SolicitudInvalidaException.class, () -> service.registrar(UUID.randomUUID().toString(),
                ID_AMBIENTE, "INVENTADO", "BAJA", DESCRIPCION, null, false, null, "ip"));
        assertThrows(SolicitudInvalidaException.class, () -> service.registrar("no-es-uuid",
                ID_AMBIENTE, "OTRO", "BAJA", DESCRIPCION, null, false, null, "ip"));
        verify(incidenciaRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Cerrar sin resolución no se permite; cerrar con resolución queda CERRADA y auditada")
    void cerrar() {
        Incidencia incidencia = incidenciaGuardada(EstadoIncidencia.EN_REVISION);

        assertThrows(SolicitudInvalidaException.class, () -> service.cerrar(14, "   ", "ip"));

        IncidenciaDetalleDto dto = service.cerrar(14, "Se devolvió el celular al terminar.", "ip");
        assertEquals("CERRADA", dto.estado());
        assertEquals(ID_DOCENTE, incidencia.getIdUsuarioResuelve());
        verify(auditoriaService).registrar(eq("INCIDENCIA_CERRADA"), anyString(), anyString(),
                contains("EN_REVISION → CERRADA"), anyString());
    }

    @Test
    @DisplayName("Una incidencia cerrada ya no cambia de estado")
    void cerrada_esInmutable() {
        incidenciaGuardada(EstadoIncidencia.CERRADA);

        assertThrows(ConflictoEstadoException.class, () -> service.cerrar(14, "otra resolución", "ip"));
        assertThrows(ConflictoEstadoException.class, () -> service.marcarEnRevision(14, "ip"));
    }

    @Test
    @DisplayName("Marcar en revisión guarda quién y cuándo, y aparece en la línea de tiempo")
    void marcarEnRevision() {
        incidenciaGuardada(EstadoIncidencia.ABIERTA);

        IncidenciaDetalleDto dto = service.marcarEnRevision(14, "ip");

        assertEquals("EN_REVISION", dto.estado());
        assertEquals(2, dto.lineaTiempo().size());
        verify(auditoriaService).registrar(eq("INCIDENCIA_EN_REVISION"), anyString(), anyString(), anyString(), anyString());
    }

    private Incidencia incidenciaGuardada(EstadoIncidencia estado) {
        Incidencia i = new Incidencia();
        ReflectionTestUtils.setField(i, "idIncidencia", 14);
        i.setIdAmbiente(ID_AMBIENTE);
        i.setIdUsuarioReporta(ID_DOCENTE);
        i.setTipo(TipoIncidencia.OBJETO_PROHIBIDO);
        i.setSeveridad(SeveridadIncidencia.MEDIA);
        i.setDescripcion(DESCRIPCION);
        i.setEstado(estado);
        i.setFechaHora(HoraOficial.ahora().minusMinutes(10));
        when(incidenciaRepository.findById(14)).thenReturn(Optional.of(i));
        return i;
    }

    private void autenticar(String rol, int idUsuario, String correo) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(correo, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
        auth.setDetails(idUsuario);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
