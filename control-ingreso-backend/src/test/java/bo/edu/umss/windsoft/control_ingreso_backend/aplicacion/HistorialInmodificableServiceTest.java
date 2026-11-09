package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.SelloAuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HistorialInmodificableBloqueDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IntegridadCadenaResultadoDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HistorialInmodificableServiceTest {

    @Mock
    private AuditoriaRepository auditoriaRepository;

    @Mock
    private SelloAuditoriaRepository selloRepository;

    @Test
    @DisplayName("Cálculo SHA-256 es determinista y produce 64 caracteres en minúsculas")
    void calcularSha256_formatoCorrecto() {
        String hash1 = AuditoriaHashService.calcularSha256("SCIEM_PASS_TEST");
        String hash2 = AuditoriaHashService.calcularSha256("SCIEM_PASS_TEST");

        assertNotNull(hash1);
        assertEquals(64, hash1.length());
        assertEquals(hash1, hash2);
        assertTrue(hash1.matches("^[0-9a-f]{64}$"));
    }

    @Test
    @DisplayName("El formato HU15-V1 conserva acentos, separadores y microsegundos")
    void hashEventoPersistido_vectorConocido() {
        String hash = AuditoriaHashService.hashEventoPersistido(1, "0".repeat(64), 7, 2,
                LocalDateTime.of(2026, 10, 28, 8, 30, 0, 123456000), "Acción|á");
        assertEquals("e44d9232e8ebc7cd3cf8aabf7c28dfbb1c8676bda3d03d844f17e87fd4178a08", hash);
    }

    @Test
    @DisplayName("Los registros historicos sin sello se listan sin inventar hashes")
    void listarHistorialInmodificable_encadenamientoCorrecto() {
        Auditoria a1 = new Auditoria(1, "[USUARIO_CREADO] ejecutor=admin@umss.edu | afectado=doc@umss.edu | ip=127.0.0.1 | Alta docente");
        a1.setIdAuditoria(1);
        a1.setFechaAccion(LocalDateTime.of(2026, 10, 28, 8, 0, 0));

        Auditoria a2 = new Auditoria(1, "[INTENTO_EXAMEN_INCORRECTO] ejecutor=op@umss.edu | afectado=est@umss.edu | ip=192.168.1.10 | SIS 202104859 se presentó en Cálculo I");
        a2.setIdAuditoria(2);
        a2.setFechaAccion(LocalDateTime.of(2026, 10, 28, 8, 30, 0));

        when(auditoriaRepository.findAll()).thenReturn(List.of(a1, a2));

        HistorialInmodificableService service = new HistorialInmodificableService(auditoriaRepository, selloRepository);
        List<HistorialInmodificableBloqueDto> lista = service.listarHistorialInmodificable(null, null, null, null, null, null);

        assertNotNull(lista);
        assertEquals(2, lista.size());

        // Orden DESC: el más reciente primero
        HistorialInmodificableBloqueDto rec = lista.get(0);
        HistorialInmodificableBloqueDto ant = lista.get(1);

        assertEquals(2, rec.getIdBloque());
        assertEquals(1, ant.getIdBloque());
        assertEquals("CONTROL_INGRESO", rec.getModulo());
        assertNull(ant.getHashBloqueAnterior());
        assertNull(rec.getSelloSha256());
    }

    @Test
    @DisplayName("No se afirma integridad cuando no hay sellos persistidos")
    void verificarIntegridadCadena_validaExitoso() {
        Auditoria a1 = new Auditoria(1, "[LOGIN_EXITOSO] ejecutor=adm@umss.edu | afectado=adm@umss.edu | ip=10.0.0.1 | Login");
        a1.setIdAuditoria(10);
        a1.setFechaAccion(LocalDateTime.now());

        when(auditoriaRepository.findAll()).thenReturn(List.of(a1));

        HistorialInmodificableService service = new HistorialInmodificableService(auditoriaRepository, selloRepository);
        IntegridadCadenaResultadoDto resultado = service.verificarIntegridadCadena();

        assertFalse(resultado.isEsValido());
        assertEquals(1, resultado.getTotalBloques());
        assertTrue(resultado.getMensaje().contains("no tienen sellos"));
    }

    @Test
    @DisplayName("Un registro modificado sin sello historico sigue siendo no verificable")
    void verificarIntegridadCadena_noDeclaraValidoUnRegistroModificado() {
        Auditoria auditoria = new Auditoria(1, "contenido alterado");
        auditoria.setIdAuditoria(1);
        when(auditoriaRepository.findAll()).thenReturn(List.of(auditoria));

        HistorialInmodificableService service = new HistorialInmodificableService(auditoriaRepository, selloRepository);
        assertFalse(service.verificarIntegridadCadena().isEsValido());
    }

    @Test
    @DisplayName("Una modificacion posterior no coincide con el sello persistido")
    void verificarCadena_detectaAlteracion() {
        Auditoria evento = new Auditoria(1, "original");
        evento.setIdAuditoria(7);
        evento.setFechaAccion(LocalDateTime.of(2026, 10, 28, 8, 0));
        String anterior = "0".repeat(64);
        String hash = AuditoriaHashService.hashEventoPersistido(1, anterior, 7, 1, evento.getFechaAccion(), "original");
        evento.setAccion("alterado");
        when(auditoriaRepository.findAll()).thenReturn(List.of(evento));
        when(selloRepository.disponible()).thenReturn(true);
        when(selloRepository.listar()).thenReturn(List.of(new SelloAuditoriaRepository.Sello(1, 7, anterior, hash)));
        when(selloRepository.cabeza()).thenReturn(java.util.Optional.of(new SelloAuditoriaRepository.Cabeza(1, hash)));
        var resultado = new HistorialInmodificableService(auditoriaRepository, selloRepository).verificarIntegridadCadena();
        assertFalse(resultado.isEsValido());
        assertEquals(7, resultado.getIdBloqueAfectado());
    }

    @Test
    @DisplayName("La cadena sellada se verifica sin atribuir integridad a eventos anteriores")
    void verificarCadena_internaConsistente() {
        Auditoria anteriorSinSello = new Auditoria(1, "evento anterior");
        anteriorSinSello.setIdAuditoria(6);
        Auditoria evento = new Auditoria(1, "evento sellado");
        evento.setIdAuditoria(7);
        evento.setFechaAccion(LocalDateTime.of(2026, 10, 28, 8, 0));
        String genesis = "0".repeat(64);
        String hash = AuditoriaHashService.hashEventoPersistido(1, genesis, 7, 1, evento.getFechaAccion(), evento.getAccion());
        when(auditoriaRepository.findAll()).thenReturn(List.of(anteriorSinSello, evento));
        when(selloRepository.disponible()).thenReturn(true);
        when(selloRepository.listar()).thenReturn(List.of(new SelloAuditoriaRepository.Sello(1, 7, genesis, hash)));
        when(selloRepository.cabeza()).thenReturn(java.util.Optional.of(new SelloAuditoriaRepository.Cabeza(1, hash)));

        var resultado = new HistorialInmodificableService(auditoriaRepository, selloRepository).verificarIntegridadCadena();
        assertTrue(resultado.isEsValido());
        assertTrue(resultado.getMensaje().contains("Sin punto de control externo"));
        assertTrue(resultado.getMensaje().contains("1 eventos históricos sin sello"));
    }

    @Test
    @DisplayName("Una cabeza que no coincide con la cadena se informa como inconsistente")
    void verificarCadena_detectaCabezaAlterada() {
        Auditoria evento = new Auditoria(1, "evento sellado");
        evento.setIdAuditoria(7);
        evento.setFechaAccion(LocalDateTime.of(2026, 10, 28, 8, 0));
        String genesis = "0".repeat(64);
        String hash = AuditoriaHashService.hashEventoPersistido(1, genesis, 7, 1, evento.getFechaAccion(), evento.getAccion());
        when(auditoriaRepository.findAll()).thenReturn(List.of(evento));
        when(selloRepository.disponible()).thenReturn(true);
        when(selloRepository.listar()).thenReturn(List.of(new SelloAuditoriaRepository.Sello(1, 7, genesis, hash)));
        when(selloRepository.cabeza()).thenReturn(java.util.Optional.of(new SelloAuditoriaRepository.Cabeza(2, hash)));

        var resultado = new HistorialInmodificableService(auditoriaRepository, selloRepository).verificarIntegridadCadena();
        assertFalse(resultado.isEsValido());
        assertTrue(resultado.getMensaje().contains("cabeza"));
    }

    @Test
    @DisplayName("Una secuencia con saltos no se declara integra")
    void verificarCadena_detectaSalto() {
        Auditoria evento = new Auditoria(1, "evento sellado");
        evento.setIdAuditoria(7);
        evento.setFechaAccion(LocalDateTime.of(2026, 10, 28, 8, 0));
        String genesis = "0".repeat(64);
        String hash = AuditoriaHashService.hashEventoPersistido(2, genesis, 7, 1, evento.getFechaAccion(), evento.getAccion());
        when(auditoriaRepository.findAll()).thenReturn(List.of(evento));
        when(selloRepository.disponible()).thenReturn(true);
        when(selloRepository.listar()).thenReturn(List.of(new SelloAuditoriaRepository.Sello(2, 7, genesis, hash)));
        when(selloRepository.cabeza()).thenReturn(java.util.Optional.of(new SelloAuditoriaRepository.Cabeza(2, hash)));

        assertFalse(new HistorialInmodificableService(auditoriaRepository, selloRepository).verificarIntegridadCadena().isEsValido());
    }

    @Test
    @DisplayName("Filtros combinados por módulo, ejecutor y fecha funcionan adecuadamente")
    void listarHistorialInmodificable_filtrosCombinados() {
        Auditoria a1 = new Auditoria(1, "[INTENTO_EXAMEN_INCORRECTO] ejecutor=operador1@umss.edu | afectado=est1@umss.edu | ip=192.168.1.1 | Detalle");
        a1.setIdAuditoria(100);
        a1.setFechaAccion(LocalDateTime.of(2026, 10, 28, 9, 0, 0));

        Auditoria a2 = new Auditoria(1, "[AUTORIZAR_INGRESO_EXCEPCIONAL] ejecutor=docente@umss.edu | afectado=est2@umss.edu | ip=192.168.1.2 | Detalle");
        a2.setIdAuditoria(101);
        a2.setFechaAccion(LocalDateTime.of(2026, 10, 28, 9, 15, 0));

        when(auditoriaRepository.findAll()).thenReturn(List.of(a1, a2));

        HistorialInmodificableService service = new HistorialInmodificableService(auditoriaRepository, selloRepository);

        List<HistorialInmodificableBloqueDto> soloControl = service.listarHistorialInmodificable(
                "CONTROL_INGRESO", null, null, null, null, null);
        assertEquals(1, soloControl.size());
        assertEquals(100, soloControl.get(0).getIdBloque());

        List<HistorialInmodificableBloqueDto> soloDocente = service.listarHistorialInmodificable(
                null, "docente@umss.edu", null, null, null, null);
        assertEquals(1, soloDocente.size());
        assertEquals(101, soloDocente.get(0).getIdBloque());

        List<HistorialInmodificableBloqueDto> vacio = service.listarHistorialInmodificable(
                "USUARIOS", null, null, null, null, null);
        assertTrue(vacio.isEmpty());
    }
}
