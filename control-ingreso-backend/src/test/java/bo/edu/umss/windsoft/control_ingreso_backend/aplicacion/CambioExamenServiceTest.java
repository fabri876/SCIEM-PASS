package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.List;
class CambioExamenServiceTest {
 @Test void soloRegistraCambiosReales() {
  var repo=mock(CambioExamenRepository.class);
  var servicio=new CambioExamenService(repo,mock(AulaRepository.class));
  var antes=new CambioExamenService.Estado("Aula 1","2026-10-12 · 08:00 - 10:00");
  servicio.registrar(4,antes,antes);
  verifyNoInteractions(repo);
  var despues=new CambioExamenService.Estado("Aula 2","2026-10-12 · 09:00 - 11:00");
  servicio.registrar(4,antes,despues);
  verify(repo).guardar(4,"AULA",antes.aulas(),despues.aulas());
  verify(repo).guardar(4,"HORARIO",antes.horario(),despues.horario());
 }
 @Test void recrearAmbientesOReordenarlosNoGeneraAvisos() {
  var servicio=new CambioExamenService(mock(CambioExamenRepository.class),mock(AulaRepository.class));
  var a=new Ambiente();a.setIdAmbiente(1);a.setIdAula(2);a.setHoraInicio(LocalTime.of(8,0));a.setHoraFin(LocalTime.of(10,0));
  var b=new Ambiente();b.setIdAmbiente(2);b.setIdAula(3);b.setHoraInicio(LocalTime.of(8,0));b.setHoraFin(LocalTime.of(10,0));
  var antes=servicio.estado(LocalDate.of(2026,10,12),List.of(a,b));
  a.setIdAmbiente(20);b.setIdAmbiente(30);
  assertEquals(antes,servicio.estado(LocalDate.of(2026,10,12),List.of(b,a)));
 }
}
