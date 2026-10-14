package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu05;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Credencial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Pruebas de regresión de la HU05 (control de ingreso): los flujos principales siguen funcionando.
 * Se corren de nuevo cada vez que se integran cambios de otros módulos.
 * Todo se deshace al terminar; los intentos bloqueados de prueba se borran.
 */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@DisplayName("HU05 · Control de ingreso (pruebas de regresión)")
class RegresionHu05Test extends IntegracionHu05Base {

    @Autowired CredencialRepository credencialRepository;

    // ---------------------------------------------------------------------
    // Ayudas propias de estas pruebas
    // ---------------------------------------------------------------------

    /** Deja al estudiante con una credencial QR vigente para el examen (se deshace al terminar) y devuelve el texto del QR. */
    private String qrVigente(Ambiente aula, EstudiantePrueba e) {
        String base = "QA" + System.nanoTime();
        String token = base.length() > 20 ? base.substring(0, 20) : base;
        Credencial c = credencialRepository.findByIdUsuarioAndIdExamen(e.usuario().getIdusuario(), aula.getIdExamen())
                .orElseGet(Credencial::new);
        c.setIdUsuario(e.usuario().getIdusuario());
        c.setIdExamen(aula.getIdExamen());
        c.setToken(token);
        c.setValidoDesde(HoraOficial.ahora().minusHours(1));
        c.setValidoHasta(HoraOficial.ahora().plusHours(1));
        c.setFechaCreacionCredencial(LocalDate.now());
        c.setEstado("ACTIVO");
        credencialRepository.saveAndFlush(c);
        return "SCIEMPASS:1:" + token;
    }

    /** Lectura de un QR, igual que la cámara del panel (el frontend envía metodoIngreso = ESCANEO). */
    private MockHttpServletResponse leerQr(Ambiente aula, String textoQr) throws Exception {
        String json = "{\"identificador\":\"" + textoQr + "\",\"idasignatura\":" + aula.getIdAsignatura()
                + ",\"idexamen\":" + aula.getIdExamen() + ",\"idambiente\":" + aula.getIdAmbiente()
                + ",\"metodoIngreso\":\"ESCANEO\"}";
        return enviar(post("/api/v1/control/ingresos").contentType("application/json").content(json), tokenAdmin);
    }

    /** Estudiante habilitado cuyo Código SIS tiene 9 dígitos. */
    private EstudiantePrueba habilitadoConSis9(Ambiente aula) {
        for (int i = 0; i < 30; i++) {
            EstudiantePrueba e = estudianteLibre(aula);
            if (String.valueOf(e.codSis()).length() == 9) {
                habilitar(aula, e, true);
                return e;
            }
        }
        throw new IllegalStateException("No hay un estudiante con Código SIS de 9 dígitos para la prueba.");
    }

    private String estado(MockHttpServletResponse r) throws Exception {
        return campo(texto(r), "estado");
    }

    private String metodos(List<Ingreso> lista) {
        return lista.stream().map(i -> String.valueOf(i.getMetodoIngreso())).toList().toString();
    }

    // ---------------------------------------------------------------------
    // Pruebas
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("TC-282 (C1) · Un QR válido registra el ingreso como Permitido por escaneo")
    void qrValido_registraIngreso() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);
        String qr = qrVigente(aula, e);

        MockHttpServletResponse r = leerQr(aula, qr);
        List<Ingreso> guardados = ingresosDe(aula, e);
        evidencia("TC-282", "QR \"" + qr + "\" del SIS " + e.codSis() + " → " + r.getStatus() + " " + estado(r)
                + " · Ingresos guardados: " + guardados.size() + " · Método: " + metodos(guardados));

        assertAll(
                () -> assertEquals(201, r.getStatus()),
                () -> assertEquals("PERMITIDO", estado(r)),
                () -> assertEquals(1, guardados.size(), "Debe guardarse un ingreso"),
                () -> assertEquals("[ESCANEO]", metodos(guardados), "El ingreso debe quedar como lectura de QR")
        );
    }

    @Test
    @DisplayName("TC-283 (C2) · Un C.I. válido en Ingreso manual registra el ingreso")
    void ciValido_registraIngreso() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = estudianteHabilitado(aula);
        String ci = e.usuario().getCiusuario();

        MockHttpServletResponse r = ingresar(tokenAdmin, aula, ci, null);
        List<Ingreso> guardados = ingresosDe(aula, e);
        evidencia("TC-283", "C.I. " + ci + " → " + r.getStatus() + " " + estado(r)
                + " · Ingresos guardados: " + guardados.size() + " · Método: " + metodos(guardados));

        assertAll(
                () -> assertEquals(201, r.getStatus()),
                () -> assertEquals("PERMITIDO", estado(r)),
                () -> assertEquals(1, guardados.size(), "Debe guardarse un ingreso"),
                () -> assertEquals("[MANUAL]", metodos(guardados))
        );
    }

    @Test
    @DisplayName("TC-284 (C3) · Un Código SIS de 9 dígitos en Ingreso manual registra el ingreso")
    void sis9Digitos_registraIngreso() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba e = habilitadoConSis9(aula);
        String sis = String.valueOf(e.codSis());

        MockHttpServletResponse r = ingresar(tokenAdmin, aula, sis, null);
        List<Ingreso> guardados = ingresosDe(aula, e);
        evidencia("TC-284", "SIS " + sis + " (" + sis.length() + " dígitos) → " + r.getStatus() + " " + estado(r)
                + " · Ingresos guardados: " + guardados.size() + " · Método: " + metodos(guardados));

        assertAll(
                () -> assertEquals(9, sis.length()),
                () -> assertEquals(201, r.getStatus()),
                () -> assertEquals("PERMITIDO", estado(r)),
                () -> assertEquals(1, guardados.size(), "Debe guardarse un ingreso"),
                () -> assertEquals("[MANUAL]", metodos(guardados))
        );
    }

    @Test
    @DisplayName("TC-285 (C50) · QR, manual y duplicado funcionan igual en una misma jornada")
    void qrManualYDuplicado_funcionanJuntos() throws Exception {
        Ambiente aula = aulaUnicaDelExamen();
        EstudiantePrueba ana = estudianteHabilitado(aula);
        EstudiantePrueba bruno = estudianteHabilitado(aula);
        String qr = qrVigente(aula, ana);

        MockHttpServletResponse porQr = leerQr(aula, qr);
        MockHttpServletResponse manual = ingresar(tokenAdmin, aula, bruno.usuario().getCiusuario(), null);
        MockHttpServletResponse duplicado = ingresar(tokenAdmin, aula, ana.usuario().getCiusuario(), null);
        List<Ingreso> deAna = ingresosDe(aula, ana);
        List<Ingreso> deBruno = ingresosDe(aula, bruno);
        evidencia("TC-285", "QR del estudiante 1 → " + porQr.getStatus() + " " + estado(porQr)
                + " · C.I. del estudiante 2 → " + manual.getStatus() + " " + estado(manual)
                + " · C.I. del estudiante 1 otra vez → " + duplicado.getStatus() + " " + estado(duplicado)
                + " · Ingresos guardados: estudiante 1 = " + deAna.size() + " " + metodos(deAna)
                + ", estudiante 2 = " + deBruno.size() + " " + metodos(deBruno));

        assertAll(
                () -> assertEquals("PERMITIDO", estado(porQr), "El QR debe seguir funcionando"),
                () -> assertEquals("PERMITIDO", estado(manual), "El ingreso manual debe seguir funcionando"),
                () -> assertEquals(409, duplicado.getStatus()),
                () -> assertEquals("DUPLICADO", estado(duplicado), "El duplicado debe seguir detectándose"),
                () -> assertEquals("[ESCANEO]", metodos(deAna), "El estudiante 1 debe tener un solo ingreso, por QR"),
                () -> assertEquals("[MANUAL]", metodos(deBruno), "El estudiante 2 debe tener un solo ingreso, manual")
        );
    }
}