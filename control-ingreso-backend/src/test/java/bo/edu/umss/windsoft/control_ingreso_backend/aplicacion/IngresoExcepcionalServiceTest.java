package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.DocenteAsignaturaId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteAsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteGrupoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ConsultaEstudianteDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IngresoExcepcionalDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias de IngresoExcepcionalService (HU06).
 * No usan la base de datos: los repositorios son simulados.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IngresoExcepcionalServiceTest {

    private static final int ID_AMBIENTE = 7;
    private static final int ID_ASIGNATURA = 1;
    private static final int ID_EXAMEN = 3;
    private static final int ID_AULA = 10;
    private static final int ID_DOCENTE = 50;
    private static final int ID_ESTUDIANTE = 200;
    private static final int CODSIS = 202409112;
    private static final String OBSERVACION = "Presenta boleta de inscripción sellada del grupo 3.";

    @Mock private IngresoRepository ingresoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AmbienteRepository ambienteRepository;
    @Mock private AulaRepository aulaRepository;
    @Mock private AsignaturaRepository asignaturaRepository;
    @Mock private ExamenRepository examenRepository;
    @Mock private DocenteAsignaturaRepository docenteAsignaturaRepository;
    @Mock private AyudanteExamenRepository ayudanteExamenRepository;
    @Mock private EstudianteRepository estudianteRepository;
    @Mock private EstudianteGrupoRepository estudianteGrupoRepository;
    @Mock private HabilitacionRepository habilitacionRepository;
    @Mock private EvidenciaService evidenciaService;
    @Mock private AuditoriaService auditoriaService;

    private IngresoExcepcionalService service;
    private Examen examen;

    @BeforeEach
    void setUp() {
        ContextoUsuarioService contexto = new ContextoUsuarioService(docenteAsignaturaRepository, examenRepository,
                ayudanteExamenRepository, auditoriaService);
        AmbienteExamenService ambientes = new AmbienteExamenService(ambienteRepository, aulaRepository,
                asignaturaRepository, examenRepository, ingresoRepository, contexto);
        EstudianteExamenService estudiantes = new EstudianteExamenService(estudianteRepository, usuarioRepository,
                habilitacionRepository, estudianteGrupoRepository);
        service = new IngresoExcepcionalService(ingresoRepository, usuarioRepository, ambientes, estudiantes,
                contexto, evidenciaService, auditoriaService);

        Ambiente ambiente = new Ambiente();
        ambiente.setIdAmbiente(ID_AMBIENTE);
        ambiente.setIdAsignatura(ID_ASIGNATURA);
        ambiente.setIdExamen(ID_EXAMEN);
        ambiente.setIdAula(ID_AULA);
        ambiente.setHoraInicio(LocalTime.MIN);
        ambiente.setHoraFin(LocalTime.MAX);
        when(ambienteRepository.findById(ID_AMBIENTE)).thenReturn(Optional.of(ambiente));

        Aula aula = new Aula();
        aula.setIdAula(ID_AULA);
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

        Usuario usuarioEstudiante = usuario(ID_ESTUDIANTE, "Carlos", "Ramos Mamani", "c.ramos@est.umss.edu");
        when(estudianteRepository.findByCodsisestudiante(CODSIS))
                .thenReturn(Optional.of(new Estudiante(ID_ESTUDIANTE, CODSIS)));
        when(usuarioRepository.findById(ID_ESTUDIANTE)).thenReturn(Optional.of(usuarioEstudiante));
        when(usuarioRepository.findById(ID_DOCENTE))
                .thenReturn(Optional.of(usuario(ID_DOCENTE, "Ana", "Rocha Villarroel", "ana.rocha@umss.edu")));

        when(habilitacionRepository.findByEstudianteCodsisestudiante(CODSIS)).thenReturn(List.of());
        when(estudianteGrupoRepository.existeInscripcionEnAsignatura(CODSIS, ID_ASIGNATURA)).thenReturn(true);
        when(ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(CODSIS, ID_ASIGNATURA, ID_EXAMEN))
                .thenReturn(Optional.empty());
        when(ingresoRepository.obtenerCapacidadAmbiente(ID_AMBIENTE)).thenReturn(60);
        when(ingresoRepository.countByIdAmbienteAndIdExpulsionIsNull(ID_AMBIENTE)).thenReturn(56L);
        when(ingresoRepository.saveAndFlush(any(Ingreso.class))).thenAnswer(inv -> inv.getArgument(0));

        autenticar("DOCENTE", ID_DOCENTE, "ana.rocha@umss.edu");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Docente asignada al examen autoriza: se guarda EXCEPCIONAL, MANUAL, con su usuario como autorizante, y se audita")
    void autorizar_ok() {
        IngresoExcepcionalDto dto = service.autorizar(ID_AMBIENTE, CODSIS, "NO_FIGURA_EN_LISTA", OBSERVACION, null, "10.0.0.1");

        ArgumentCaptor<Ingreso> guardado = ArgumentCaptor.forClass(Ingreso.class);
        verify(ingresoRepository).saveAndFlush(guardado.capture());
        assertEquals(TipoIngreso.EXCEPCIONAL, guardado.getValue().getTipoIngreso());
        assertEquals(MotivoExcepcion.NO_FIGURA_EN_LISTA, guardado.getValue().getMotivoExcepcion());
        assertEquals(ID_DOCENTE, guardado.getValue().getIdUsuarioRegistra());
        assertEquals(MetodoIngreso.MANUAL, guardado.getValue().getMetodoIngreso());
        assertNotNull(guardado.getValue().getHoraIngreso());

        assertEquals("Ana Rocha Villarroel", dto.autorizadoPor());
        assertEquals("Aula 601", dto.aula());
        verify(ingresoRepository).bloquearAmbiente(ID_AMBIENTE);
        verify(auditoriaService).registrarEnTransaccion(eq("INGRESO_EXCEPCIONAL"), eq("ana.rocha@umss.edu"),
                eq("c.ramos@est.umss.edu"), contains("NO_FIGURA_EN_LISTA"), eq("10.0.0.1"));
    }

    @Test
    @DisplayName("Un fallo de auditoria impide confirmar el ingreso excepcional")
    void autorizar_falloAuditoriaPropagaError() {
        doThrow(new IllegalStateException("fallo de auditoria"))
                .when(auditoriaService).registrarEnTransaccion(eq("INGRESO_EXCEPCIONAL"), anyString(),
                        anyString(), anyString(), anyString());
        assertThrows(IllegalStateException.class, () -> service.autorizar(
                ID_AMBIENTE, CODSIS, "NO_FIGURA_EN_LISTA", OBSERVACION, null, "10.0.0.1"));
        verify(evidenciaService).eliminarSinFallar(null);
    }

    @Test
    @DisplayName("Docente de otra materia: 403 'No es docente de esta materia' y ACCESO_DENEGADO en auditoría")
    void autorizar_docenteDeOtraMateria() {
        examen.setIdUsuario(999);
        when(docenteAsignaturaRepository.findByIdIdusuario(ID_DOCENTE)).thenReturn(List.of());

        AccesoDenegadoException ex = assertThrows(AccesoDenegadoException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "SIN_CARNET_QR", OBSERVACION, null, "ip"));

        assertEquals("No es docente de esta materia.", ex.getMessage());
        verify(auditoriaService).registrar(eq("ACCESO_DENEGADO"), anyString(), anyString(), anyString(), eq("ip"));
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Docente de la materia que no es el asignado al examen: 403 'No es el docente asignado a este examen'")
    void autorizar_docenteNoAsignadoAlExamen() {
        examen.setIdUsuario(999); // otro docente de la misma materia es el responsable

        AccesoDenegadoException ex = assertThrows(AccesoDenegadoException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "SIN_CARNET_QR", OBSERVACION, null, "ip"));

        assertEquals("No es el docente asignado a este examen.", ex.getMessage());
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Estudiante que ya ingresó: se rechaza indicando hora y aula, y queda auditado")
    void autorizar_duplicado() {
        Ingreso previo = new Ingreso();
        previo.setIdAmbiente(ID_AMBIENTE);
        previo.setTipoIngreso(TipoIngreso.NORMAL);
        previo.setIdUsuarioRegistra(99);
        previo.setHoraIngreso(HoraOficial.hoy().atTime(7, 41));
        when(ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(CODSIS, ID_ASIGNATURA, ID_EXAMEN))
                .thenReturn(Optional.of(previo));

        ConflictoEstadoException ex = assertThrows(ConflictoEstadoException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "SIN_CARNET_QR", OBSERVACION, null, "ip"));

        assertTrue(ex.getMessage().contains("07:41"));
        assertTrue(ex.getMessage().contains("Aula 601"));
        verify(auditoriaService).registrar(eq("INGRESO_EXCEPCIONAL_RECHAZADO"), anyString(), anyString(), anyString(), anyString());
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Doble clic: el mismo docente repite la autorización y recibe el ingreso ya creado, sin duplicar")
    void autorizar_repeticion() {
        Ingreso previo = new Ingreso();
        previo.setIdAmbiente(ID_AMBIENTE);
        previo.setTipoIngreso(TipoIngreso.EXCEPCIONAL);
        previo.setIdUsuarioRegistra(ID_DOCENTE);
        previo.setHoraIngreso(HoraOficial.ahora());
        when(ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(CODSIS, ID_ASIGNATURA, ID_EXAMEN))
                .thenReturn(Optional.of(previo));

        assertNotNull(service.autorizar(ID_AMBIENTE, CODSIS, "SIN_CARNET_QR", OBSERVACION, null, "ip"));
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Aula llena: se rechaza con el aforo y queda auditado")
    void autorizar_aulaLlena() {
        when(ingresoRepository.countByIdAmbienteAndIdExpulsionIsNull(ID_AMBIENTE)).thenReturn(60L);

        ConflictoEstadoException ex = assertThrows(ConflictoEstadoException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "SIN_CARNET_QR", OBSERVACION, null, "ip"));

        assertTrue(ex.getMessage().startsWith("Aula llena (60/60)"));
        verify(auditoriaService).registrar(eq("INGRESO_EXCEPCIONAL_RECHAZADO"), anyString(), anyString(), anyString(), anyString());
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Examen de ayer: el ingreso está cerrado")
    void autorizar_ingresoCerrado() {
        examen.setFechaExamen(HoraOficial.hoy().minusDays(1));

        assertThrows(ConflictoEstadoException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "LLEGADA_TARDIA", OBSERVACION, null, "ip"));
        verify(auditoriaService).registrar(eq("INGRESO_EXCEPCIONAL_RECHAZADO"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Estudiante habilitado: no corresponde ingreso excepcional")
    void autorizar_estudianteHabilitado() {
        Habilitacion habilitacion = new Habilitacion(new Estudiante(ID_ESTUDIANTE, CODSIS), true, null);
        habilitacion.setIdExamen(ID_EXAMEN);
        when(habilitacionRepository.findByEstudianteCodsisestudiante(CODSIS)).thenReturn(List.of(habilitacion));

        assertThrows(ConflictoEstadoException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "SIN_CARNET_QR", OBSERVACION, null, "ip"));
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Observación de menos de 20 caracteres o motivo vacío: no se guarda")
    void autorizar_validaciones() {
        assertThrows(SolicitudInvalidaException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "SIN_CARNET_QR", "muy corta", null, "ip"));
        assertThrows(SolicitudInvalidaException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "", OBSERVACION, null, "ip"));
        assertThrows(SolicitudInvalidaException.class,
                () -> service.autorizar(ID_AMBIENTE, CODSIS, "OTRO_MOTIVO", OBSERVACION, null, "ip"));
        verify(ingresoRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Consulta del operador: un estudiante que no ha ingresado no se puede reportar")
    void consultar_operador() {
        autenticar("OPERADOR", 70, "roberto.vargas@umss.edu");
        AyudanteExamenId asignacion = new AyudanteExamenId(70, ID_ASIGNATURA, ID_EXAMEN, ID_AMBIENTE);
        when(ayudanteExamenRepository.findById(any()))
                .thenReturn(Optional.of(new AyudanteExamen(asignacion, "ACTIVO")));

        ConsultaEstudianteDto dto = service.consultar(ID_AMBIENTE, String.valueOf(CODSIS), true, "ip");

        assertEquals("SIN_INGRESO", dto.estado());
        assertFalse(dto.puedeAutorizarExcepcional());
        assertFalse(dto.puedeRegistrarIncidencia());
    }

    @Test
    @DisplayName("Consulta desde incidencias: un estudiante no inscrito en la materia no se puede reportar")
    void consultar_noInscrito() {
        when(estudianteGrupoRepository.existeInscripcionEnAsignatura(CODSIS, ID_ASIGNATURA)).thenReturn(false);

        ConsultaEstudianteDto dto = service.consultar(ID_AMBIENTE, String.valueOf(CODSIS), true, "ip");

        assertEquals("NO_INSCRITO", dto.estado());
        assertFalse(dto.puedeRegistrarIncidencia());
    }

    @Test
    @DisplayName("Consulta del docente: estudiante que no figura en la lista se puede autorizar")
    void consultar_docente() {
        ConsultaEstudianteDto dto = service.consultar(ID_AMBIENTE, String.valueOf(CODSIS), false, "ip");

        assertEquals("NO_EN_LISTA", dto.estado());
        assertTrue(dto.puedeAutorizarExcepcional());
        assertEquals(56, dto.aforo().ocupados());
        assertEquals(4, dto.aforo().disponibles());
    }

    @Test
    @DisplayName("Consulta de un CI que no existe: NO_ENCONTRADO")
    void consultar_noEncontrado() {
        ConsultaEstudianteDto dto = service.consultar(ID_AMBIENTE, "0000000", false, "ip");

        assertEquals("NO_ENCONTRADO", dto.estado());
        assertTrue(dto.mensaje().startsWith("Estudiante no encontrado"));
        assertFalse(dto.puedeAutorizarExcepcional());
    }

    @Test
    @DisplayName("QA: al buscar con el aula llena, no deja autorizar, explica el motivo y el intento queda en auditoría")
    void consultar_aulaLlena_auditaIntento() {
        when(ingresoRepository.countByIdAmbienteAndIdExpulsionIsNull(ID_AMBIENTE)).thenReturn(60L);

        ConsultaEstudianteDto dto = service.consultar(ID_AMBIENTE, String.valueOf(CODSIS), false, "ip");

        assertFalse(dto.puedeAutorizarExcepcional());
        assertTrue(dto.mensaje().contains("Aula llena (60/60)"));
        verify(auditoriaService).registrar(eq("INGRESO_EXCEPCIONAL_RECHAZADO"), anyString(),
                eq("c.ramos@est.umss.edu"), contains("Aula llena"), eq("ip"));
    }

    @Test
    @DisplayName("QA: al buscar a quien ya ingresó, se indica hora y aula y el intento queda en auditoría")
    void consultar_duplicado_auditaIntento() {
        Ingreso previo = new Ingreso();
        previo.setIdAmbiente(ID_AMBIENTE);
        previo.setHoraIngreso(HoraOficial.hoy().atTime(7, 41));
        when(ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(CODSIS, ID_ASIGNATURA, ID_EXAMEN))
                .thenReturn(Optional.of(previo));

        ConsultaEstudianteDto dto = service.consultar(ID_AMBIENTE, String.valueOf(CODSIS), false, "ip");

        assertEquals("DUPLICADO", dto.estado());
        assertTrue(dto.mensaje().contains("07:41") && dto.mensaje().contains("Aula 601"));
        assertFalse(dto.puedeAutorizarExcepcional());
        verify(auditoriaService).registrar(eq("INGRESO_EXCEPCIONAL_RECHAZADO"), anyString(), anyString(),
                contains("07:41"), eq("ip"));
    }

    @Test
    @DisplayName("Buscar al estudiante desde el formulario de incidencias no registra intentos de ingreso")
    void consultar_desdeIncidencia_noAudita() {
        when(ingresoRepository.countByIdAmbienteAndIdExpulsionIsNull(ID_AMBIENTE)).thenReturn(60L);

        service.consultar(ID_AMBIENTE, String.valueOf(CODSIS), true, "ip");

        verify(auditoriaService, never()).registrar(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    private void autenticar(String rol, int idUsuario, String correo) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(correo, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
        auth.setDetails(idUsuario);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private Usuario usuario(int id, String nombre, String apellido, String correo) {
        Usuario u = new Usuario("ci" + id, nombre, apellido, null, correo, "x", true);
        u.setIdusuario(id);
        return u;
    }
}
