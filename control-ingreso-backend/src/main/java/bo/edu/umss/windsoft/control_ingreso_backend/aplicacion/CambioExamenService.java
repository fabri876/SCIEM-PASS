package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CambioExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CambioExamenDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
@Service
public class CambioExamenService {
 private final CambioExamenRepository cambios;
 private final AulaRepository aulas;
 public CambioExamenService(CambioExamenRepository cambios,AulaRepository aulas) { this.cambios=cambios;this.aulas=aulas; }
 public record Estado(String aulas,String horario) {}
 public Estado estado(LocalDate fecha,List<Ambiente> ambientes) {
  String nombres=ambientes.stream().map(Ambiente::getIdAula).distinct().sorted()
   .map(id -> aulas.findById(id).map(a -> a.getNombreAula()+" (#"+id+")").orElse("Aula #"+id))
   .collect(Collectors.joining(", "));
  String horas=ambientes.stream().map(a -> a.getHoraInicio()+" - "+a.getHoraFin()).distinct().sorted().collect(Collectors.joining(", "));
  return new Estado(nombres,fecha+" · "+horas);
 }
 public void registrar(Integer examen,Estado antes,Estado despues) {
  if(!antes.aulas().equals(despues.aulas())) cambios.guardar(examen,"AULA",antes.aulas(),despues.aulas());
  if(!antes.horario().equals(despues.horario())) cambios.guardar(examen,"HORARIO",antes.horario(),despues.horario());
 }
 @Transactional(readOnly=true)
 public List<CambioExamenDto> recientes() { return cambios.recientes(); }
}
