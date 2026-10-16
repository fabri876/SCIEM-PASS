package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class QaRegistroTest {
 @AfterEach void limpiar(){SecurityContextHolder.clearContext();}
 @Test void pdfConservaColumnasYNumeracionIncluidoEncabezado() throws Exception {
  try(var doc=new PDDocument()){
   var page=new PDPage(new org.apache.pdfbox.pdmodel.common.PDRectangle(1100,800));doc.addPage(page);
   try(var stream=new PDPageContentStream(doc,page)){
    String[][] filas={{"CODSIS","CORREO","CI","APELLIDOS","NOMBRES","TELEFONO"},{"202301601","qa@example.test","7338351","Prueba Cuatro","QA Masiva","72007283"},{"202301602","otro@example.test","7338351","García Pérez","Juan Carlos","72007284"}};
    int[] x={30,135,350,450,650,850};
    for(int i=0;i<filas.length;i++) for(int j=0;j<x.length;j++){stream.beginText();stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),11);stream.newLineAtOffset(x[j],750-i*25);stream.showText(filas[i][j]);stream.endText();}
   }
   var filas=LectorTablaUsuariosPdf.leer(doc);assertEquals(2,filas.size());assertEquals(2,filas.get(0).numero());assertEquals(3,filas.get(1).numero());
   assertEquals("Prueba Cuatro",filas.get(0).datos().get("APELLIDOS"));assertEquals("QA Masiva",filas.get(0).datos().get("NOMBRES"));assertEquals("72007283",filas.get(0).datos().get("TELEFONO"));
  }
 }
 @Test void docenteNoConsultaAsignaturasAjenasNiConSisManipulado(){
  var asignaciones=mock(DocenteAsignaturaRepository.class);
  var servicio=new AsignaturaService(asignaciones,mock(AsignaturaRepository.class),mock(UsuarioRepository.class),mock(ExamenRepository.class),mock(HabilitacionRepository.class));
  var auth=new UsernamePasswordAuthenticationToken("docente",null,List.of(new SimpleGrantedAuthority("ROLE_DOCENTE")));auth.setDetails(10);SecurityContextHolder.getContext().setAuthentication(auth);
  assertThrows(org.springframework.security.access.AccessDeniedException.class,()->servicio.obtenerPorDocente(11,123));verifyNoInteractions(asignaciones);
 }
 @Test void cargaRechazaCiSisCorreoYTelefonoInvalidosSinGuardar() throws Exception {
  var usuarios=mock(UsuarioRepository.class);var roles=mock(TipoUsuarioResolver.class);var grupos=mock(GrupoService.class);
  Usuario admin=new Usuario();admin.setIdusuario(1);when(usuarios.findByCorreousuario("admin@test.bo")).thenReturn(Optional.of(admin));when(roles.resolver(1)).thenReturn("ADMINISTRADOR");
  var servicio=new CargaMasivaService(usuarios,mock(AdminRepository.class),mock(DocenteRepository.class),mock(AyudanteRepository.class),mock(EstudianteRepository.class),mock(AsignaturaRepository.class),mock(GrupoRepository.class),grupos,mock(PasswordEncoder.class),mock(AuditoriaService.class),roles);
  try(var w=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
   var hoja=w.createSheet();String[] cols={"CODSIS","CORREO","CI","APELLIDOS","NOMBRES","TELEFONO"};var h=hoja.createRow(0);var fila=hoja.createRow(1);String[] datos={"20230160","sin.dominio@","ABCDEFG","Prueba","QA","12ab"};for(int i=0;i<cols.length;i++){h.createCell(i).setCellValue(cols[i]);fila.createCell(i).setCellValue(datos[i]);}w.write(out);
   var resultado=servicio.procesarCargaMasiva(new MockMultipartFile("archivo","lista.xlsx","application/octet-stream",out.toByteArray()),"ESTUDIANTE","admin@test.bo","local",7);
   assertEquals(1,resultado.getFallidos());assertEquals(0,resultado.getExitosos());String errores=resultado.getDetallesErrores().toString();verify(usuarios,never()).save(any());
   assertTrue(resultado.getDetallesErrores().get(0).getErrores().size()>=4);
  }
 }
 @Test void auditoriaDeRegistroUsaLaTransaccionActual() throws Exception {
  var annotation=AuditoriaService.class.getMethod("registrarEnTransaccion",String.class,String.class,String.class,String.class,String.class).getAnnotation(org.springframework.transaction.annotation.Transactional.class);
  assertEquals(org.springframework.transaction.annotation.Propagation.REQUIRED,annotation.propagation());
 }
}
