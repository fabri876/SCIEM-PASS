package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu05;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionAulaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.DocenteRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Pruebas de integración de la HU05 (control de ingreso): petición real → servicio → base de datos.
 * Todo se deshace al terminar; los intentos bloqueados de prueba se borran.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU05 · Control de ingreso (pruebas de integración)")
class ControlIngresoIntegracionTest extends IntegracionHu05Base {

    @Autowired AsignacionAulaService asignacionAulaService;
    @Autowired AyudanteExamenRepository ayudanteExamenRepository;
    @Autowired DocenteRepository docenteRepository;

    private String ultimos(String token, Ambiente aula, int limite) throws Exception {
        return texto(enviar(get("/api/v1/control/ultimos-ingresos")
                .param("idasignatura", String.valueOf(aula.getIdAsignatura()))
                .param("idexamen", String.valueOf(aula.getIdExamen()))
                .param("idambiente", String.valueOf(aula.getIdAmbiente()))
                .param("limite", String.valueOf(limite)), token));
    }

    private String listaOficial(Ambiente aula, String buscar) throws Exception {
        return texto(enviar(get("/api/v1/control/examenes/" + aula.getIdExamen() + "/lista-oficial")
                .param("buscar", buscar), tokenAdmin));
    }

    private boolean aparece(String jsonLista, EstudiantePrueba e) {
        return campos(jsonLista, "codSisEstudiante").contains(String.valueOf(e.codSis()));
    }

    @Test
    @DisplayName("TC-044 (C4) · La hora del ingreso es la del servidor aunque el equipo envíe otra")
    void horaDelIngreso_esLaDelServidor() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);
        LocalDateTime antes = HoraOficial.ahora();

        // El equipo "con la hora mal" intenta mandar su propia fecha y hora.
        MockHttpServletResponse r = ingresar(tokenAdmin, aula, String.valueOf(e.codSis()),
                "\"horaIngreso\":\"2020-01-01T03:00:00\",\"fechaIngreso\":\"2020-01-01\"");
        LocalDateTime despues = HoraOficial.ahora();
        Ingreso guardado = ingresosDe(aula, e).getFirst();
        evidencia("TC-044", "Hora enviada por el equipo: 2020-01-01 03:00 · Respuesta " + r.getStatus()
                + " · Hora guardada: " + guardado.getHoraIngreso() + " · Hora del servidor: " + antes + " a " + despues);

        assertAll(
                () -> assertEquals(201, r.getStatus()),
                () -> assertFalse(guardado.getHoraIngreso().isBefore(antes.minusMinutes(1)), "Debe guardarse la hora del servidor"),
                () -> assertFalse(guardado.getHoraIngreso().isAfter(despues.plusMinutes(1)), "Debe guardarse la hora del servidor"),
                () -> assertEquals(HoraOficial.hoy(), guardado.getFechaIngreso(), "Debe guardarse la fecha del servidor")
        );
    }

    @Test
    @DisplayName("TC-045 (C5) · Últimos ingresos devuelve estudiante, hora, método y quién registró")
    void ultimosIngresos_traenTodosLosDatos() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);
        ingresar(aula, e);

        String primero = ultimos(tokenAdmin, aula, 1); // el más reciente
        evidencia("TC-045", "Primer registro de Últimos ingresos: " + primero);

        assertAll(
                () -> assertTrue(primero.contains("\"codsisestudiante\":" + e.codSis()), "Debe venir el estudiante (SIS)"),
                () -> assertTrue(primero.contains(nombre(e.usuario())), "Debe venir el nombre del estudiante"),
                () -> assertNotNull(campo(primero, "horaIngreso"), "Debe venir la hora"),
                () -> assertEquals("MANUAL", campo(primero, "metodoIngreso"), "Debe venir el método"),
                () -> assertEquals(nombre(admin), campo(primero, "registradoPor"), "Debe venir quién registró")
        );
    }

    @Test
    @DisplayName("TC-046 (C8) · Verificar dos veces seguidas al mismo estudiante registra una sola vez")
    void dobleVerificacion_registraUnaVez() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);

        MockHttpServletResponse primero = ingresar(aula, e);
        MockHttpServletResponse segundo = ingresar(aula, e);
        int ingresos = ingresosDe(aula, e).size();
        evidencia("TC-046", "Primera verificación → " + primero.getStatus() + " " + campo(texto(primero), "estado")
                + " · Segunda verificación → " + segundo.getStatus() + " " + campo(texto(segundo), "estado")
                + " · Ingresos guardados del estudiante: " + ingresos);

        assertAll(
                () -> assertEquals("PERMITIDO", campo(texto(primero), "estado")),
                () -> assertEquals("DUPLICADO", campo(texto(segundo), "estado")),
                () -> assertEquals(1, ingresos, "Debe existir un solo ingreso")
        );
    }

    @Test
    @DisplayName("TC-047 (C23) / TC-048 (C24) · La Lista oficial busca por apellido sin tildes ni mayúsculas")
    void listaOficial_buscaSinTildesNiMayusculas() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);
        Usuario u = e.usuario();
        u.setApellidousuario("Pérez Ñandú Qa");               // se deshace al terminar
        usuarioRepository.saveAndFlush(u);

        Map<String, Boolean> busquedas = new LinkedHashMap<>();
        for (String texto : List.of("Pérez", "pérez", "PÉREZ", "perez", "PEREZ", "nandu")) {
            busquedas.put(texto, aparece(listaOficial(aula, texto), e));
        }
        String sinCoincidencias = listaOficial(aula, "zzqaxx");
        evidencia("TC-047", "Apellido \"Pérez Ñandú Qa\" · ¿aparece al buscar…? " + busquedas);
        evidencia("TC-048", "Búsqueda \"zzqaxx\" → " + sinCoincidencias);

        List<org.junit.jupiter.api.function.Executable> verificaciones = new ArrayList<>();
        busquedas.forEach((texto, encontrado) -> verificaciones.add(() ->
                assertTrue(encontrado, "Buscar \"" + texto + "\" debe encontrar a \"Pérez Ñandú Qa\"")));
        verificaciones.add(() -> assertEquals("[]", sinCoincidencias.trim(), "Sin coincidencias debe devolver la lista vacía"));
        assertAll(verificaciones);
    }

    @Test
    @DisplayName("TC-049 (C25) · Registrar ingreso cambia el estado en la Lista oficial a Ingresó")
    void registrarDesdeLista_cambiaEstado() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);
        String ci = e.usuario().getCiusuario();

        String antes = campo(listaOficial(aula, ci), "estado");
        MockHttpServletResponse r = ingresar(tokenAdmin, aula, ci, null); // el botón de la lista envía el C.I.
        String filaDespues = listaOficial(aula, ci);
        evidencia("TC-049", "Estado antes: " + antes + " · Registrar → " + r.getStatus() + " " + campo(texto(r), "estado")
                + " · Estado después: " + campo(filaDespues, "estado") + " a las " + campo(filaDespues, "horaIngreso")
                + " · Registró: " + campo(filaDespues, "marcadoPor"));

        assertAll(
                () -> assertEquals("PENDIENTE", antes),
                () -> assertEquals("INGRESO", campo(filaDespues, "estado")),
                () -> assertNotNull(campo(filaDespues, "horaIngreso"), "Debe mostrarse la hora del ingreso")
        );
    }

    @Test
    @DisplayName("TC-051 (C29) · Últimos ingresos devuelve los 5 más recientes, del más nuevo al más antiguo")
    void ultimosIngresos_cincoMasRecientes() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        List<Integer> orden = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            EstudiantePrueba e = estudianteHabilitado(aula);
            ingresar(aula, e);
            orden.add(e.codSis());
        }
        List<Integer> esperado = new ArrayList<>(orden.subList(1, 6));
        Collections.reverse(esperado);

        List<Integer> recibido = campos(ultimos(tokenAdmin, aula, 5), "codsisestudiante").stream().map(Integer::valueOf).toList();
        evidencia("TC-051", "Orden de registro (SIS): " + orden + " · Últimos ingresos devuelve: " + recibido);

        assertEquals(esperado, recibido, "Deben venir los 5 más recientes, del más nuevo al más antiguo");
    }

    @Test
    @DisplayName("TC-052 (C30) · Al volver a cargar, el contador y los últimos ingresos coinciden con lo guardado")
    void recargar_contadorYUltimosCoinciden() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        Usuario operador = operadorActivo();
        ayudanteExamenRepository.saveAndFlush(new AyudanteExamen(new AyudanteExamenId(operador.getIdusuario(),
                aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente()), "ACTIVO"));
        String tokenOperador = token(operador, "OPERADOR");
        var contador = get("/api/v1/control/examen-seleccionado")
                .param("idasignatura", String.valueOf(aula.getIdAsignatura()))
                .param("idexamen", String.valueOf(aula.getIdExamen()))
                .param("idambiente", String.valueOf(aula.getIdAmbiente()));

        int antes = Integer.parseInt(campo(texto(enviar(contador, tokenOperador)), "ingresaron"));
        ingresar(aula, estudianteHabilitado(aula));
        ingresar(aula, estudianteHabilitado(aula));

        // Dos "recargas" seguidas del panel
        String carga1 = texto(enviar(contador, tokenOperador));
        String carga2 = texto(enviar(contador, tokenOperador));
        String ultimos1 = ultimos(tokenOperador, aula, 5);
        String ultimos2 = ultimos(tokenOperador, aula, 5);
        long enBase = ingresoRepository.countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(
                aula.getIdAsignatura(), aula.getIdExamen(), aula.getIdAmbiente());
        evidencia("TC-052", "Contador antes: " + antes + " · tras 2 ingresos, recarga 1: " + campo(carga1, "ingresaron")
                + " · recarga 2: " + campo(carga2, "ingresaron") + " · ingresos guardados en el aula: " + enBase
                + " · Últimos ingresos iguales en ambas recargas: " + ultimos1.equals(ultimos2));

        assertAll(
                () -> assertEquals(String.valueOf(antes + 2), campo(carga1, "ingresaron")),
                () -> assertEquals(campo(carga1, "ingresaron"), campo(carga2, "ingresaron")),
                () -> assertEquals(String.valueOf(enBase), campo(carga1, "ingresaron"), "El contador debe coincidir con lo guardado"),
                () -> assertEquals(ultimos1, ultimos2, "Los últimos ingresos deben ser los mismos al recargar")
        );
    }

    @Test
    @DisplayName("TC-053 (C36) · Cada ingreso e intento bloqueado queda guardado con sus datos")
    void ingresosEIntentos_quedanGuardados() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba permitido = estudianteHabilitado(aula);
        EstudiantePrueba inhabilitado = estudianteLibre(aula);
        habilitar(aula, inhabilitado, false);

        ingresar(aula, permitido);
        ingresar(aula, permitido);       // duplicado
        ingresar(aula, inhabilitado);    // inhabilitado

        // Aula diferente: examen con 2 o más aulas; el estudiante se presenta en una que no es la suya
        Ambiente otraAula = ambienteRepository.findAll().stream()
                .filter(a -> ambienteRepository.findByIdExamen(a.getIdExamen()).size() >= 2)
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un examen con varias aulas."));
        EstudiantePrueba enOtraAula = estudianteHabilitado(otraAula);
        Integer aulaAsignada = asignacionAulaService.aulaAsignada(otraAula.getIdAsignatura(), otraAula.getIdExamen(),
                enOtraAula.codSis()).map(AsignacionAulaService.AulaExamen::idAmbiente).orElse(otraAula.getIdAmbiente());
        Ambiente equivocada = ambienteRepository.findByIdExamen(otraAula.getIdExamen()).stream()
                .filter(a -> !a.getIdAmbiente().equals(aulaAsignada)).findFirst().orElseThrow();
        MockHttpServletResponse rOtra = ingresar(tokenAdmin, equivocada, String.valueOf(enOtraAula.codSis()), null);

        Ingreso ingreso = ingresosDe(aula, permitido).getFirst();
        List<IntentoNoAutorizado> dup = intentosDe(aula, permitido, MotivoIntento.DUPLICADO);
        List<IntentoNoAutorizado> inh = intentosDe(aula, inhabilitado, MotivoIntento.INHABILITADO);
        List<IntentoNoAutorizado> amb = intentosDe(equivocada, enOtraAula, MotivoIntento.AMBIENTE_DIFERENTE);
        evidencia("TC-053", "Ingreso: SIS " + ingreso.getCodsisEstudiante() + ", registró #" + ingreso.getIdUsuarioRegistra()
                + ", " + ingreso.getFechaIngreso() + " " + ingreso.getHoraIngreso() + ", " + ingreso.getMetodoIngreso()
                + " · Intentos guardados → duplicado: " + describir(dup) + " · inhabilitado: " + describir(inh)
                + " · aula diferente (" + campo(texto(rOtra), "estado") + "): " + describir(amb));

        assertAll(
                () -> assertEquals(admin.getIdusuario(), ingreso.getIdUsuarioRegistra(), "El ingreso guarda quién lo registró"),
                () -> assertNotNull(ingreso.getHoraIngreso(), "El ingreso guarda la hora"),
                () -> assertEquals(1, dup.size(), "Debe guardarse el intento por duplicado"),
                () -> assertEquals(1, inh.size(), "Debe guardarse el intento por inhabilitación"),
                () -> assertEquals(1, amb.size(), "Debe guardarse el intento por aula diferente"),
                () -> assertTrue(completos(dup) && completos(inh) && completos(amb),
                        "Cada intento debe tener quién lo hizo, fecha, hora y estudiante")
        );
    }

    private String describir(List<IntentoNoAutorizado> lista) {
        return lista.isEmpty() ? "(ninguno)" : lista.stream().map(i -> "[" + i.getMotivo() + ", SIS " + i.getCodsisEstudiante()
                + ", registró #" + i.getIdUsuarioRegistra() + ", " + i.getFechaIntento() + " " + i.getHoraIntento() + "]").toList().toString();
    }

    private boolean completos(List<IntentoNoAutorizado> lista) {
        return lista.stream().allMatch(i -> i.getIdUsuarioRegistra() != null && i.getFechaIntento() != null
                && i.getHoraIntento() != null && i.getCodsisEstudiante() != null && i.getMotivo() != null);
    }

    @Test
    @DisplayName("TC-054 (C44) · El administrador puede registrar ingresos en el control de un examen")
    void administrador_registraIngreso() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);

        MockHttpServletResponse r = ingresar(aula, e);
        String registro = ultimos(tokenAdmin, aula, 1);
        evidencia("TC-054", "Administrador " + admin.getCorreousuario() + " registra → " + r.getStatus() + " "
                + campo(texto(r), "estado") + " · Últimos ingresos: registró \"" + campo(registro, "registradoPor") + "\"");

        assertAll(
                () -> assertEquals(201, r.getStatus()),
                () -> assertEquals("PERMITIDO", campo(texto(r), "estado")),
                () -> assertEquals(nombre(admin), campo(registro, "registradoPor"))
        );
    }

    @Test
    @DisplayName("TC-055 (C47) · El operador asignado por el docente ve su examen y aula en su panel")
    void operadorAsignado_veSuExamenYAula() throws Exception {
        // Examen con docente responsable activo; se pasa a mañana para poder asignar (se deshace al terminar)
        Examen examen = examenRepository.findAll().stream()
                .filter(x -> x.getIdUsuario() != null && docenteRepository.findByIdusuario(x.getIdUsuario()).isPresent())
                .filter(x -> usuarioRepository.findById(x.getIdUsuario()).map(u -> Boolean.TRUE.equals(u.getEstadousuario())).orElse(false))
                .filter(x -> !ambienteRepository.findByIdExamen(x.getIdExamen()).isEmpty())
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un examen con docente responsable."));
        examen.setFechaExamen(HoraOficial.hoy().plusDays(1));
        examenRepository.saveAndFlush(examen);
        Ambiente aula = ambienteRepository.findByIdExamen(examen.getIdExamen()).getFirst();
        Usuario docente = usuarioRepository.findById(examen.getIdUsuario()).orElseThrow();

        Usuario operador = ayudanteRepository.findAll().stream()
                .map(a -> usuarioRepository.findById(a.getIdusuario()).orElse(null))
                .filter(u -> u != null && Boolean.TRUE.equals(u.getEstadousuario()) && u.getCorreousuario() != null)
                .filter(u -> ayudanteExamenRepository.findByIdIdayudanteAndEstadoAsignacion(u.getIdusuario(), "ACTIVO").isEmpty())
                .findFirst().orElseThrow(() -> new IllegalStateException("No hay un operador libre para la prueba."));

        String cuerpo = "{\"idAsignatura\":" + examen.getIdAsignatura() + ",\"asignaciones\":[{\"idAmbiente\":"
                + aula.getIdAmbiente() + ",\"idOperador\":" + operador.getIdusuario() + "}]}";
        MockHttpServletResponse asignar = enviar(put("/api/v1/control/examenes/" + examen.getIdExamen() + "/asignacion-ingreso")
                .contentType("application/json").content(cuerpo), token(docente, "DOCENTE"));
        String panel = texto(enviar(get("/api/v1/examenes/delegados"), token(operador, "OPERADOR")));
        boolean veExamen = campos(panel, "idexamen").contains(String.valueOf(examen.getIdExamen()));
        boolean veAula = campos(panel, "idambiente").contains(String.valueOf(aula.getIdAmbiente()));
        evidencia("TC-055", "Docente " + docente.getCorreousuario() + " asigna al operador " + operador.getCorreousuario()
                + " al examen #" + examen.getIdExamen() + ", aula #" + aula.getIdAmbiente() + " → " + asignar.getStatus()
                + " · Panel del operador: ve el examen " + veExamen + ", ve el aula " + veAula
                + " (" + campo(panel, "nombreAsignatura") + " · " + campo(panel, "nombreAmbiente") + ")");

        assertAll(
                () -> assertEquals(200, asignar.getStatus(), "El docente debe poder asignar al operador"),
                () -> assertTrue(veExamen, "El operador debe ver el examen asignado"),
                () -> assertTrue(veAula, "El operador debe ver el aula asignada")
        );
    }
}