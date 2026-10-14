package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IncidenciaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ConsultaEstudianteDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EventoIncidenciaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Incidencias (pruebas de integración)")
class IncidenciaIntegracionTest extends IntegracionHu06Base {

    private static final String DESCRIPCION = "Prueba de integración QA: incidencia de prueba en el aula.";
    private static final String RESOLUCION = "Prueba de integración QA: se verificó y se resolvió la incidencia.";

    @Autowired IncidenciaService incidenciaService;
    @Autowired IngresoExcepcionalService ingresoExcepcionalService;
    @Autowired IncidenciaRepository incidenciaRepository;

    private IncidenciaDetalleDto registrar(Ambiente aula, UUID claveSolicitud) {
        return incidenciaService.registrar(claveSolicitud.toString(), aula.getIdAmbiente(), "OTRO", "BAJA",
                DESCRIPCION, null, false, null, IP_QA);
    }

    private int incidenciasDelAula(Ambiente aula) {
        return incidenciaRepository.findByIdAmbienteInOrderByFechaHoraDesc(List.of(aula.getIdAmbiente())).size();
    }

    private String acciones(IncidenciaDetalleDto detalle) {
        return detalle.lineaTiempo().stream().map(EventoIncidenciaDto::accion).collect(Collectors.joining(", "));
    }

    @Test
    @DisplayName("TC-060 (C23) · Al escribir un C.I. se muestra el nombre del estudiante y su ingreso")
    void buscarPorCi_muestraNombreEIngreso() {
        Ambiente aula = prepararAulaEnCurso();
        EstudiantePrueba estudiante = estudianteNoHabilitado(aula);
        // Para que el estudiante "ya haya ingresado" se le registra un ingreso excepcional.
        ingresoExcepcionalService.autorizar(aula.getIdAmbiente(), estudiante.codSis(), "LLEGADA_TARDIA",
                "Prueba de integración QA: ingreso previo para la búsqueda.", null, IP_QA);

        ConsultaEstudianteDto existe = ingresoExcepcionalService.consultar(aula.getIdAmbiente(),
                estudiante.usuario().getCiusuario(), true, IP_QA);
        ConsultaEstudianteDto noExiste = ingresoExcepcionalService.consultar(aula.getIdAmbiente(),
                "QA-NO-EXISTE-000", true, IP_QA);

        evidencia("TC-060", "C.I. " + estudiante.usuario().getCiusuario() + " → " + existe.nombreCompleto()
                + " · ingresó " + existe.horaIngresoPrevio() + " | C.I. inexistente → " + noExiste.estado());

        assertAll(
                () -> assertEquals(nombre(estudiante.usuario()), existe.nombreCompleto(),
                        "Debe mostrarse el nombre del estudiante"),
                () -> assertNotNull(existe.horaIngresoPrevio(),
                        "Debe indicarse a qué hora ingresó el estudiante"),
                () -> assertEquals("NO_ENCONTRADO", noExiste.estado(),
                        "Un C.I. que no existe debe responder 'Estudiante no encontrado'")
        );
    }

    @Test
    @DisplayName("TC-061 (C25) · Registrar incidencia la guarda Abierta con código INC correlativo")
    void registrarIncidencia_quedaAbiertaConCodigoCorrelativo() {
        Ambiente aula = prepararAulaEnCurso();
        LocalDateTime antes = HoraOficial.ahora().minusSeconds(2);

        IncidenciaDetalleDto primera = registrar(aula, UUID.randomUUID());
        IncidenciaDetalleDto segunda = registrar(aula, UUID.randomUUID());

        LocalDateTime despues = HoraOficial.ahora().plusSeconds(2);
        evidencia("TC-061", primera.codigo() + " (" + primera.estadoEtiqueta() + ", " + primera.fechaHora() + ", "
                + primera.aula() + ", reportó " + primera.reportadoPor() + ") → siguiente: " + segunda.codigo());

        assertAll(
                () -> assertEquals("ABIERTA", primera.estado(), "La incidencia debe quedar Abierta"),
                () -> assertEquals(String.format("INC-%03d", primera.idIncidencia()), primera.codigo(),
                        "El código debe tener el formato INC-000"),
                () -> assertTrue(segunda.idIncidencia() > primera.idIncidencia(),
                        "Los códigos deben ser correlativos: " + primera.codigo() + " → " + segunda.codigo()),
                () -> assertFalse(primera.fechaHora().isBefore(antes) || primera.fechaHora().isAfter(despues),
                        "Debe guardarse la hora oficial del sistema. Se guardó: " + primera.fechaHora()),
                () -> assertEquals(aula.getIdAmbiente(), primera.idAmbiente(), "Debe guardarse el aula"),
                () -> assertEquals(aula.getIdExamen(), primera.idExamen(), "Debe guardarse el examen"),
                () -> assertEquals(nombre(admin), primera.reportadoPor(), "Debe guardarse quién la reportó")
        );
    }

    @Test
    @DisplayName("TC-062 (C26) · Doble clic en Registrar incidencia la guarda una sola vez")
    void dobleClicEnRegistrar_guardaUnaSolaVez() {
        Ambiente aula = prepararAulaEnCurso();
        int antes = incidenciasDelAula(aula);
        UUID mismaSolicitud = UUID.randomUUID();

        IncidenciaDetalleDto primerClic = registrar(aula, mismaSolicitud);
        IncidenciaDetalleDto segundoClic = registrar(aula, mismaSolicitud);

        int despues = incidenciasDelAula(aula);
        evidencia("TC-062", "1er clic → " + primerClic.codigo() + " · 2do clic → " + segundoClic.codigo()
                + " · incidencias del aula: " + antes + " → " + despues);

        assertAll(
                () -> assertEquals(primerClic.idIncidencia(), segundoClic.idIncidencia(),
                        "El segundo clic debe devolver la misma incidencia"),
                () -> assertEquals(antes + 1, despues, "Solo debe guardarse una incidencia")
        );
    }

    @Test
    @DisplayName("TC-063 (C32) · Marcar en revisión cambia el estado y lo anota en la línea de tiempo")
    void marcarEnRevision_cambiaEstadoYAnotaEnLineaDeTiempo() {
        Ambiente aula = prepararAulaEnCurso();
        IncidenciaDetalleDto incidencia = registrar(aula, UUID.randomUUID());

        IncidenciaDetalleDto enRevision = incidenciaService.marcarEnRevision(incidencia.idIncidencia(), IP_QA);

        EventoIncidenciaDto evento = enRevision.lineaTiempo().stream()
                .filter(e -> "Marcada en revisión".equals(e.accion()))
                .findFirst().orElse(null);
        evidencia("TC-063", enRevision.codigo() + " · estado " + incidencia.estadoEtiqueta() + " → "
                + enRevision.estadoEtiqueta() + " · línea de tiempo: " + acciones(enRevision));

        assertAll(
                () -> assertEquals("EN_REVISION", enRevision.estado(), "El estado debe cambiar a En revisión"),
                () -> assertNotNull(evento, "La línea de tiempo debe tener 'Marcada en revisión'. Tiene: "
                        + acciones(enRevision)),
                () -> assertNotNull(evento == null ? null : evento.fechaHora(), "El evento debe tener su hora"),
                () -> assertEquals(nombre(admin), evento == null ? null : evento.usuario(),
                        "El evento debe indicar quién lo hizo")
        );
    }

    @Test
    @DisplayName("TC-064 (C34) · Cerrar incidencia con resolución cambia el estado a Cerrada")
    void cerrarConResolucion_cambiaEstadoACerrada() {
        Ambiente aula = prepararAulaEnCurso();
        IncidenciaDetalleDto incidencia = registrar(aula, UUID.randomUUID());

        IncidenciaDetalleDto cerrada = incidenciaService.cerrar(incidencia.idIncidencia(), RESOLUCION, IP_QA);
        IncidenciaDetalleDto releida = incidenciaService.detalle(incidencia.idIncidencia(), IP_QA);

        EventoIncidenciaDto evento = cerrada.lineaTiempo().stream()
                .filter(e -> "Cerrada".equals(e.accion()))
                .findFirst().orElse(null);
        evidencia("TC-064", cerrada.codigo() + " · estado " + cerrada.estadoEtiqueta() + " · resolución guardada: \""
                + releida.resolucion() + "\" · línea de tiempo: " + acciones(cerrada));

        assertAll(
                () -> assertEquals("CERRADA", cerrada.estado(), "El estado debe cambiar a Cerrada"),
                () -> assertEquals(RESOLUCION, releida.resolucion(), "La resolución debe quedar guardada"),
                () -> assertNotNull(evento, "La línea de tiempo debe tener 'Cerrada'. Tiene: " + acciones(cerrada))
        );
    }
}
