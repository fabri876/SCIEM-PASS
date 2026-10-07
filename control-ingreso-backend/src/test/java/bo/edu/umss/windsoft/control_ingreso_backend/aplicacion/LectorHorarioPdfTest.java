package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assumptions;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

class LectorHorarioPdfTest {
    private final LectorHorarioPdf lector = new LectorHorarioPdf();
    @Test void conservaMateriaEntrePaginasYEliminaDiasRepetidos() {
        var filas = lector.interpretar("""
                A 2008019 ALGEBRA I
                14 LEON ROMERO GUALBERTO MA 1545-1715 692E
                Procesado CPD - Facultad de Ciencias y Tecnología Página 1 de 2
                UNIVERSIDAD MAYOR DE SAN SIMON
                NIVEL MATERIA GRUPO TIPO DOCENTE DIA HORA AULA
                14 LEON ROMERO GUALBERTO JU 1115-1245 692E
                8 LEON ROMERO GUALBERTO VI 645 -0815 692F
                8 [TP] AUXILIAR POR DESIGNAR JU 645 -0815 625D
                """);
        assertEquals(3, filas.size());
        assertEquals("8", filas.get(1).nombreGrupo());
        assertEquals(2008019, filas.get(1).codigoAsignatura());
        assertTrue(filas.get(2).auxiliar());
        assertTrue(filas.get(2).porDesignar());
    }
    @Test void reconstruyeNombrePartidoAlrededorDelHorario() {
        var filas = lector.interpretar("""
                H 2016059 GESTION ESTRATEGICA DE EMPRESAS
                2 GUZMAN ORELLANA GONZALO ENRIQUE
                MA 645 -0945 682L6IN
                ANTONIO
                """);
        assertEquals("GUZMAN ORELLANA GONZALO ENRIQUE ANTONIO", filas.getFirst().nombreDocente());
    }
    @Test void noOmiteSilenciosamenteUnaFilaInvalida() {
        assertThrows(SolicitudInvalidaException.class, () -> lector.interpretar("A 2008019 ALGEBRA I\n14 DOCENTE FORMATO DESCONOCIDO"));
    }
    @Test void reconstruyeNombrePartidoAntesDelDia() {
        var filas = lector.interpretar("H 2016059 GESTION ESTRATEGICA DE EMPRESAS\n2 GUZMAN ORELLANA GONZALO ENRIQUE\nANTONIO MA 645 -0945 682L6IN");
        assertEquals("GUZMAN ORELLANA GONZALO ENRIQUE ANTONIO", filas.getFirst().nombreDocente());
    }
    @Test void admiteGruposAlfanumericosYPracticas() {
        var filas = lector.interpretar("A 2006063 FISICA GENERAL\nC1 [P] DOCENTE PRUEBA MA 1115-1245 620\nC2 POR DESGINAR DOCENTE VI 815 -0945 620");
        assertEquals("C1", filas.getFirst().nombreGrupo());
        assertFalse(filas.getFirst().auxiliar());
        assertTrue(filas.get(1).porDesignar());
    }
    @Test void verificaElHorarioRealSiSeProporciona() throws Exception {
        String ruta = System.getProperty("horario.test.pdf");
        Assumptions.assumeTrue(ruta != null, "PDF real opcional, no incluido en el repositorio");
        var filas = lector.leer(Files.readAllBytes(Path.of(ruta)));
        assertEquals(63, filas.stream().map(f -> f.codigoAsignatura()).distinct().count());
        assertTrue(filas.stream().anyMatch(f -> f.nombreDocente().equals("GUZMAN ORELLANA GONZALO ENRIQUE ANTONIO")));
        assertTrue(filas.stream().anyMatch(f -> f.nombreDocente().equals("COSIO PAPADOPOLIS CARLOS JAVIER ALFREDO")));
        System.out.println("Horario real: " + filas.size() + " asignaciones distintas y 63 asignaturas.");
    }
}
