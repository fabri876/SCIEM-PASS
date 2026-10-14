package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaListaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaResumenDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU06 · Incidencias (pruebas de validación)")
class IncidenciaValidacionTest extends IntegracionHu06Base {

    private static final String DESCRIPCION = "Prueba de validación QA: incidencia de prueba en el aula.";
    private static final String RESOLUCION = "Prueba de validación QA: resolución original.";

    @Autowired IncidenciaService incidenciaService;

    private IncidenciaDetalleDto registrar(Ambiente aula, String tipo, String severidad) {
        return incidenciaService.registrar(UUID.randomUUID().toString(), aula.getIdAmbiente(), tipo, severidad,
                DESCRIPCION, null, false, null, IP_QA);
    }

    private List<Integer> ids(IncidenciaListaDto lista) {
        return lista.incidencias().stream().map(IncidenciaResumenDto::idIncidencia).toList();
    }

    /** Aula de un examen de otra materia que ya se tomó o se toma hoy. */
    private Ambiente aulaDeOtraMateria(Integer idAsignatura) {
        LocalDate hoy = HoraOficial.hoy();
        return ambienteRepository.findAll().stream()
                .filter(a -> !a.getIdAsignatura().equals(idAsignatura))
                .filter(a -> examenRepository.findById(a.getIdExamen())
                        .map(e -> e.getFechaExamen() != null && !e.getFechaExamen().isAfter(hoy))
                        .orElse(false))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un examen de otra materia para la prueba."));
    }

    @Test
    @DisplayName("TC-188 (C29) · Los filtros muestran solo las incidencias que coinciden")
    void filtros_muestranSoloLasQueCoinciden() {
        Ambiente aula = prepararAulaEnCurso();
        IncidenciaDetalleDto otro = registrar(aula, "OTRO", "BAJA");
        IncidenciaDetalleDto falla1 = registrar(aula, "FALLA_TECNICA", "ALTA");
        IncidenciaDetalleDto falla2 = registrar(aula, "FALLA_TECNICA", "MEDIA");
        incidenciaService.marcarEnRevision(falla2.idIncidencia(), IP_QA);

        IncidenciaListaDto porTipo = incidenciaService.listar(null, aula.getIdAmbiente(), "FALLA_TECNICA", null, IP_QA);
        IncidenciaListaDto porTipoYEstado = incidenciaService.listar(null, aula.getIdAmbiente(), "FALLA_TECNICA", "EN_REVISION", IP_QA);
        IncidenciaListaDto porExamen = incidenciaService.listar(aula.getIdExamen(), null, null, null, IP_QA);
        IncidenciaListaDto sinCoincidencias = incidenciaService.listar(null, aula.getIdAmbiente(), "SUPLANTACION", null, IP_QA);

        evidencia("TC-188", "Tipo Falla técnica → " + ids(porTipo) + " · + estado En revisión → " + ids(porTipoYEstado)
                + " · examen " + aula.getIdExamen() + " → " + porExamen.incidencias().size() + " incidencias"
                + " · Suplantación → " + ids(sinCoincidencias));

        assertAll(
                () -> assertTrue(porTipo.incidencias().stream().allMatch(i -> "FALLA_TECNICA".equals(i.tipo())),
                        "Con filtro de tipo solo deben aparecer incidencias de ese tipo"),
                () -> assertTrue(ids(porTipo).containsAll(List.of(falla1.idIncidencia(), falla2.idIncidencia())),
                        "Deben aparecer las dos fallas técnicas"),
                () -> assertFalse(ids(porTipo).contains(otro.idIncidencia()), "No debe aparecer la de tipo Otro"),
                () -> assertEquals(List.of(falla2.idIncidencia()), ids(porTipoYEstado).stream()
                                .filter(id -> List.of(otro.idIncidencia(), falla1.idIncidencia(), falla2.idIncidencia()).contains(id))
                                .toList(),
                        "Con tipo y estado solo debe aparecer la falla técnica en revisión"),
                () -> assertTrue(porExamen.incidencias().stream().allMatch(i -> aula.getIdExamen().equals(i.idExamen())),
                        "Con filtro de examen solo deben aparecer incidencias de ese examen"),
                () -> assertTrue(sinCoincidencias.incidencias().stream().allMatch(i -> "SUPLANTACION".equals(i.tipo()))
                                && !ids(sinCoincidencias).contains(otro.idIncidencia()),
                        "Un filtro sin coincidencias no debe devolver incidencias de otro tipo")
        );
    }

    @Test
    @DisplayName("TC-189 (C33) · Cerrar una incidencia sin resolución no se permite")
    void cerrarSinResolucion_noSePermite() {
        Ambiente aula = prepararAulaEnCurso();
        IncidenciaDetalleDto incidencia = registrar(aula, "OTRO", "BAJA");

        SolicitudInvalidaException error = assertThrows(SolicitudInvalidaException.class,
                () -> incidenciaService.cerrar(incidencia.idIncidencia(), "   ", IP_QA));
        IncidenciaDetalleDto despues = incidenciaService.detalle(incidencia.idIncidencia(), IP_QA);
        evidencia("TC-189", incidencia.codigo() + " · mensaje: \"" + error.getMessage() + "\" · estado: "
                + despues.estadoEtiqueta());

        assertAll(
                () -> assertTrue(error.getMessage().contains("obligatoria"), "Debe indicar que la resolución es obligatoria"),
                () -> assertEquals("ABIERTA", despues.estado(), "La incidencia no debe cerrarse")
        );
    }

    @Test
    @DisplayName("TC-190 (C35) · Una incidencia Cerrada no permite cambiar estado ni resolución")
    void incidenciaCerrada_noCambia() {
        Ambiente aula = prepararAulaEnCurso();
        IncidenciaDetalleDto incidencia = registrar(aula, "OTRO", "BAJA");
        incidenciaService.cerrar(incidencia.idIncidencia(), RESOLUCION, IP_QA);

        ConflictoEstadoException alRevisar = assertThrows(ConflictoEstadoException.class,
                () -> incidenciaService.marcarEnRevision(incidencia.idIncidencia(), IP_QA));
        ConflictoEstadoException alCerrarDeNuevo = assertThrows(ConflictoEstadoException.class,
                () -> incidenciaService.cerrar(incidencia.idIncidencia(), "Otra resolución distinta de prueba.", IP_QA));
        IncidenciaDetalleDto despues = incidenciaService.detalle(incidencia.idIncidencia(), IP_QA);
        evidencia("TC-190", incidencia.codigo() + " · marcar en revisión → \"" + alRevisar.getMessage()
                + "\" · cerrar de nuevo → \"" + alCerrarDeNuevo.getMessage() + "\" · estado " + despues.estadoEtiqueta()
                + " · resolución \"" + despues.resolucion() + "\"");

        assertAll(
                () -> assertEquals("CERRADA", despues.estado(), "Debe seguir Cerrada"),
                () -> assertEquals(RESOLUCION, despues.resolucion(), "La resolución no debe cambiar")
        );
    }

    @Test
    @DisplayName("TC-191 (C44) · El administrador ve las incidencias de todas las materias")
    void administrador_veTodasLasMaterias() {
        Ambiente aula1 = prepararAulaEnCurso();
        Ambiente aula2 = aulaDeOtraMateria(aula1.getIdAsignatura());
        IncidenciaDetalleDto deMateria1 = registrar(aula1, "OTRO", "BAJA");
        IncidenciaDetalleDto deMateria2 = registrar(aula2, "OTRO", "BAJA");

        IncidenciaListaDto lista = incidenciaService.listar(null, null, null, null, IP_QA);
        evidencia("TC-191", "Administrador sin filtros ve " + lista.incidencias().size() + " incidencias · incluye "
                + deMateria1.codigo() + " (" + deMateria1.asignatura() + ") y " + deMateria2.codigo()
                + " (" + deMateria2.asignatura() + ")");

        assertAll(
                () -> assertNotEquals(aula1.getIdAsignatura(), aula2.getIdAsignatura(), "Deben ser dos materias distintas"),
                () -> assertTrue(ids(lista).containsAll(List.of(deMateria1.idIncidencia(), deMateria2.idIncidencia())),
                        "El administrador debe ver las incidencias de ambas materias")
        );
    }
}