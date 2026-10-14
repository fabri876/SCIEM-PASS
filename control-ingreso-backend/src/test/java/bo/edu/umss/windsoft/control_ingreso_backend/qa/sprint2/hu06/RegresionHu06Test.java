package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ControlIngresoAyudanteService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService.EstadoHabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Credencial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoNoAutorizadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AforoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ResultadoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UltimoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de regresión de la HU06: verifican que lo que ya funcionaba siga igual.
 * Se vuelven a correr cada vez que el equipo sube cambios a otros módulos.
 * Todo se deshace al terminar; los intentos de duplicado que se guardan aparte se borran.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Regresión")
class RegresionHu06Test extends IntegracionHu06Base {

    @Autowired ControlIngresoAyudanteService controlIngresoService;
    @Autowired IncidenciaService incidenciaService;
    @Autowired HabilitacionRepository habilitacionRepository;
    @Autowired CredencialRepository credencialRepository;
    @Autowired IntentoNoAutorizadoRepository intentoRepository;
    @Autowired AuditoriaRepository auditoriaRepository;
    @Autowired PlatformTransactionManager transactionManager;
    @PersistenceContext EntityManager entityManager;

    private final List<Integer> intentosCreados = new ArrayList<>();

    @AfterEach
    void borrarIntentosDePrueba() {
        if (intentosCreados.isEmpty()) {
            return;
        }
        TransactionTemplate aparte = new TransactionTemplate(transactionManager);
        aparte.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        aparte.executeWithoutResult(estado -> intentoRepository.deleteAllById(intentosCreados));
    }

    // ---------------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------------

    /** Aula de un examen que tiene una sola aula (así todo estudiante habilitado va a esa aula). */
    private Ambiente aulaUnicaDelExamen() {
        return ambienteRepository.findAll().stream()
                .filter(a -> ambienteRepository.findByIdExamen(a.getIdExamen()).size() == 1)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un examen con una sola aula para la prueba."));
    }

    /** Estudiante sin ningún registro de habilitación ni QR para ese examen. */
    private EstudiantePrueba estudianteSinRegistro(Ambiente aula, Integer... excluir) {
        List<Integer> excluidos = new ArrayList<>(List.of(excluir));
        while (true) {
            EstudiantePrueba e = estudianteNoHabilitado(aula, excluidos.toArray(Integer[]::new));
            boolean sinHabilitacion = estudianteExamenService.habilitacion(e.codSis(), aula).estado()
                    == EstadoHabilitacion.NO_EN_LISTA;
            boolean sinQr = credencialRepository.findByIdUsuarioAndIdExamen(e.usuario().getIdusuario(),
                    aula.getIdExamen()).isEmpty();
            if (sinHabilitacion && sinQr) {
                return e;
            }
            excluidos.add(e.codSis());
        }
    }

    private Ingreso ingresoExcepcional(Ambiente aula, EstudiantePrueba estudiante, String hora) {
        Ingreso ingreso = new Ingreso();
        ingreso.setIdUsuarioEstudiante(estudiante.usuario().getIdusuario());
        ingreso.setCodsisEstudiante(estudiante.codSis());
        ingreso.setIdAsignatura(aula.getIdAsignatura());
        ingreso.setIdExamen(aula.getIdExamen());
        ingreso.setIdAmbiente(aula.getIdAmbiente());
        ingreso.setIdUsuarioRegistra(admin.getIdusuario());
        ingreso.setFechaIngreso(HoraOficial.hoy());
        ingreso.setHoraIngreso(HoraOficial.hoy().atTime(Integer.parseInt(hora.substring(0, 2)), Integer.parseInt(hora.substring(3))));
        ingreso.setTipoIngreso(TipoIngreso.EXCEPCIONAL);
        ingreso.setMetodoIngreso(MetodoIngreso.MANUAL);
        ingreso.setMotivoExcepcion(MotivoExcepcion.LLEGADA_TARDIA);
        ingreso.setObservacionIngreso("Prueba de regresión QA: ingreso excepcional previo.");
        return ingresoRepository.saveAndFlush(ingreso);
    }

    private void habilitar(Ambiente aula, EstudiantePrueba estudiante) {
        Habilitacion habilitacion = new Habilitacion();
        habilitacion.setEstudiante(estudianteRepository.findByCodsisestudiante(estudiante.codSis()).orElseThrow());
        habilitacion.setIdExamen(aula.getIdExamen());
        habilitacion.setIdAsignatura(aula.getIdAsignatura());
        habilitacion.setIdUsuario(estudiante.usuario().getIdusuario());
        habilitacion.setEstadohabilitacion(true);
        habilitacion.setFecharegistro(HoraOficial.hoy());
        habilitacionRepository.saveAndFlush(habilitacion);
    }

    private ResultadoIngresoDTO verificar(Ambiente aula, String identificador, MetodoIngreso metodo) {
        ResponseEntity<ResultadoIngresoDTO> respuesta = controlIngresoService.registrarIngreso(
                new VerificarIngresoRequestDTO(identificador, aula.getIdAsignatura(), aula.getIdExamen(),
                        aula.getIdAmbiente(), metodo),
                admin.getIdusuario());
        return respuesta.getBody();
    }

    private String fila(Ingreso i) {
        return "#" + i.getIdIngreso() + " SIS " + i.getCodsisEstudiante() + " " + i.getTipoIngreso() + " "
                + i.getHoraIngreso() + " expulsión=" + i.getIdExpulsion() + " obs=" + i.getObservacionIngreso();
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-286 (C49) · El ingreso normal sigue igual con excepcionales ya registrados")
    void ingresoNormal_sigueIgualConExcepcionales() {
        Ambiente aula = aulaUnicaDelExamen();
        LocalDateTime inicio = HoraOficial.ahora().minusSeconds(2);
        AforoDto antes = ambienteExamenService.aforo(aula.getIdAmbiente());

        // Ya existe un ingreso excepcional en el aula.
        EstudiantePrueba conExcepcional = estudianteNoHabilitado(aula);
        ingresoExcepcional(aula, conExcepcional, "07:41");

        // Un estudiante habilitado entra por ingreso manual (Código SIS).
        EstudiantePrueba porManual = estudianteSinRegistro(aula, conExcepcional.codSis());
        habilitar(aula, porManual);

        // Otro estudiante habilitado entra con su QR vigente.
        EstudiantePrueba porQr = estudianteSinRegistro(aula, conExcepcional.codSis(), porManual.codSis());
        habilitar(aula, porQr);
        String token = "QA" + (System.nanoTime() % 10_000_000_000L);
        Credencial credencial = new Credencial();
        credencial.setIdUsuario(porQr.usuario().getIdusuario());
        credencial.setIdExamen(aula.getIdExamen());
        credencial.setToken(token);
        credencial.setEstado("ACTIVO");
        credencial.setFechaCreacionCredencial(HoraOficial.hoy());
        credencial.setValidoDesde(HoraOficial.ahora().minusHours(1));
        credencial.setValidoHasta(HoraOficial.ahora().plusHours(1));
        credencialRepository.saveAndFlush(credencial);

        ResultadoIngresoDTO manual = verificar(aula, String.valueOf(porManual.codSis()), MetodoIngreso.MANUAL);
        ResultadoIngresoDTO qr = verificar(aula, "SCIEMPASS:1:" + token, MetodoIngreso.ESCANEO);
        ResultadoIngresoDTO duplicado = verificar(aula, String.valueOf(porManual.codSis()), MetodoIngreso.MANUAL);

        AforoDto despues = ambienteExamenService.aforo(aula.getIdAmbiente());
        List<UltimoIngresoDTO> ultimos = controlIngresoService.obtenerUltimosIngresos(aula.getIdAsignatura(),
                aula.getIdExamen(), aula.getIdAmbiente(), 10);
        List<Integer> sisEnUltimos = ultimos.stream().map(u -> u.estudiante().codsisestudiante()).toList();

        intentoRepository.findByIdAsignaturaAndIdExamenAndMotivoOrderByHoraIntentoDesc(aula.getIdAsignatura(),
                        aula.getIdExamen(), MotivoIntento.DUPLICADO).stream()
                .filter(i -> porManual.codSis().equals(i.getCodsisEstudiante()))
                .filter(i -> i.getHoraIntento() != null && !i.getHoraIntento().isBefore(inicio))
                .map(IntentoNoAutorizado::getIdIntento)
                .forEach(intentosCreados::add);

        evidencia("TC-286", "Manual → " + manual.estado() + " · QR → " + qr.estado() + " · mismo estudiante otra vez → "
                + duplicado.estado() + " · aforo " + texto(antes) + " → " + texto(despues)
                + " · Últimos ingresos (SIS): " + sisEnUltimos);

        assertAll(
                () -> assertEquals("PERMITIDO", manual.estado(), "El ingreso manual debe funcionar"),
                () -> assertEquals("PERMITIDO", qr.estado(), "El ingreso por QR debe funcionar"),
                () -> assertEquals("DUPLICADO", duplicado.estado(), "El duplicado debe seguir detectándose"),
                () -> assertEquals(antes.ocupados() + 3, despues.ocupados(),
                        "El contador debe sumar el excepcional y los dos ingresos normales"),
                () -> assertTrue(sisEnUltimos.containsAll(List.of(conExcepcional.codSis(), porManual.codSis(), porQr.codSis())),
                        "Últimos ingresos debe mostrar los dos tipos de ingreso")
        );
    }

    @Test
    @DisplayName("TC-287 (C50) · Registrar una incidencia no altera los ingresos ni la auditoría previos")
    void registrarIncidencia_noAlteraIngresosNiAuditoria() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        ingresoExcepcional(aula, estudiante, "07:41");

        List<String> ingresosAntes = ingresoRepository.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByIdIngresoDesc(
                aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente()).stream().map(this::fila).toList();
        Map<Integer, String> auditoriaAntes = new LinkedHashMap<>();
        auditoriaRepository.findAllByOrderByIdAuditoriaDesc().stream().limit(20)
                .forEach(a -> auditoriaAntes.put(a.getIdAuditoria(), a.getFechaAccion() + " " + a.getAccion()));

        // Incidencia con el estudiante involucrado, sin retirarlo del examen.
        IncidenciaDetalleDto incidencia = incidenciaService.registrar(UUID.randomUUID().toString(), aula.getIdAmbiente(),
                "CONDUCTA_INAPROPIADA", "MEDIA", "Prueba de regresión QA: incidencia con estudiante involucrado.",
                estudiante.codSis(), false, null, IP_QA);

        // Se vuelve a leer todo desde la base de datos, no desde lo que ya estaba en memoria.
        entityManager.flush();
        entityManager.clear();
        List<String> ingresosDespues = ingresoRepository.findTop10ByIdAsignaturaAndIdExamenAndIdAmbienteOrderByIdIngresoDesc(
                aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente()).stream().map(this::fila).toList();
        Map<Integer, String> auditoriaDespues = new LinkedHashMap<>();
        auditoriaRepository.findAllByOrderByIdAuditoriaDesc().stream().limit(40)
                .forEach(a -> auditoriaDespues.put(a.getIdAuditoria(), a.getFechaAccion() + " " + a.getAccion()));
        long auditoriaSinCambios = auditoriaAntes.entrySet().stream()
                .filter(e -> e.getValue().equals(auditoriaDespues.get(e.getKey()))).count();

        evidencia("TC-287", incidencia.codigo() + " registrada · ingresos del aula sin cambios: "
                + ingresosAntes.equals(ingresosDespues) + " (" + ingresosAntes.size() + " revisados) · "
                + "registros de auditoría previos sin cambios: " + auditoriaSinCambios + "/" + auditoriaAntes.size());

        assertAll(
                () -> assertEquals(ingresosAntes, ingresosDespues, "Los ingresos previos no deben cambiar"),
                () -> assertEquals(auditoriaAntes.size(), auditoriaSinCambios,
                        "Los registros previos del historial de auditoría no deben cambiar")
        );
    }
}