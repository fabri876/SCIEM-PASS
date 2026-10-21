package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaSemestre;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class SemestresTest {
    @Test void listadoAmplioEsPaginadoYSePuedeReimportarSinPerderIdentidades() throws Exception {
        var filas = new java.util.ArrayList<bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente>();
        for(int i=0;i<180;i++)filas.add(new bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente("9990001","Ingenieria de Software con un nombre suficientemente largo",""+(i+1),"Ana Maria","Prueba Vargas","90000001","990000001","docente@example.test","70000001"));
        byte[] bytes=new PdfSemestreService().generarListado("1-2026",filas,true);
        try(var doc=org.apache.pdfbox.Loader.loadPDF(bytes)){
            assertTrue(doc.getNumberOfPages()>5);
            String texto=new org.apache.pdfbox.text.PDFTextStripper().getText(doc);
            assertTrue(texto.contains("90000001"));assertTrue(texto.contains("DATOS SIMULADOS"));
            var recuperadas=new tools.jackson.databind.ObjectMapper().readValue(java.util.Base64.getDecoder().decode(doc.getDocumentInformation().getCustomMetadataValue(PdfSemestreService.LISTADO_METADATA)),bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente[].class);
            assertEquals(filas,java.util.Arrays.asList(recuperadas));
        }
        var archivo=new org.springframework.mock.web.MockMultipartFile("archivo","listado.pdf","application/pdf",bytes);
        assertEquals(180,new SemestreService(null,null,new PdfSemestreService()).leer(archivo).size());
    }
    @Test void comparaDocentesSinConfundirGruposDeDistintasMaterias() {
        var antes = List.of(new FilaSemestre("1", "IA", "2", List.of("Ana")),
                new FilaSemestre("2", "Software", "2", List.of("Bruno")),
                new FilaSemestre("3", "Calculo", "1", List.of()));
        var despues = List.of(new FilaSemestre("1", "IA", "2", List.of("Carla")),
                new FilaSemestre("2", "Software", "2", List.of("BRUNO")),
                new FilaSemestre("4", "Fisica", "1", List.of()));
        var cambios = ComparadorSemestres.comparar(antes, despues);
        assertEquals(List.of("CAMBIO_DOCENTE", "SIN_CAMBIOS", "GRUPO_RETIRADO", "GRUPO_NUEVO"),
                cambios.stream().map(ComparadorSemestres.Diferencia::tipo).toList());
    }
    @Test void pdfIncluyeMarcaDeEjemploYTextoExtraible() throws Exception {
        var pdf = new PdfSemestreService().generar("1-2026", List.of(new FilaSemestre("9990001", "IA", "2", List.of("Ana Ejemplo"))), true);
        try (var doc = org.apache.pdfbox.Loader.loadPDF(pdf)) {
            String texto = new org.apache.pdfbox.text.PDFTextStripper().getText(doc);
            assertTrue(texto.contains("DATOS SIMULADOS"));
            assertTrue(texto.contains("9990001 | IA | 2 | Ana Ejemplo"));
        }
    }
    @Test void recuperaFilasLargasQueOcupanVariasLineasEnElPdf() {
        var filas = List.of(new FilaSemestre("9990001", "Asignatura de prueba ".repeat(10).trim(), "2", List.of("Nombre Docente")),
                new FilaSemestre("9990002", "Otra asignatura", "1", List.of()));
        var pdf = new PdfSemestreService();
        var archivo = new org.springframework.mock.web.MockMultipartFile("archivo", "ejemplo.pdf", "application/pdf", pdf.generar("1-2026",filas,true));
        assertEquals(filas,new SemestreService(null,null,pdf).leer(archivo));
    }
}
