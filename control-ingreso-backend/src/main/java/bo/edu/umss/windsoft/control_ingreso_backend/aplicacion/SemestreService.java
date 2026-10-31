package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaSemestre;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.SemestreRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.SemestreRepository.Resumen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.SemestreRepository.Docente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import org.springframework.beans.factory.annotation.Autowired;
@Service
public class SemestreService {
 private final SemestreRepository repo; private final LectorHorarioPdf lector; private final PdfSemestreService pdf;
 private final Clock reloj;
 @Autowired public SemestreService(SemestreRepository repo,LectorHorarioPdf lector,PdfSemestreService pdf){this(repo,lector,pdf,Clock.system(ZoneId.of("America/La_Paz")));}
 public SemestreService(SemestreRepository repo,LectorHorarioPdf lector,PdfSemestreService pdf,Clock reloj){this.repo=repo;this.lector=lector;this.pdf=pdf;this.reloj=reloj;}
 public record Panel(Resumen actual,List<Resumen> historial) {}
 public record VistaPrevia(String semestreAnterior,String semestreNuevo,List<ComparadorSemestres.Diferencia> diferencias,List<String> avisos,String confirmacion) {}
 public record Detalle(Resumen seleccionado,Resumen actual,List<ComparadorSemestres.Diferencia> diferencias) {}
 @Transactional(readOnly=true) public Panel listar(){return new Panel(repo.actual(false),repo.historial());}
 @Transactional(readOnly=true) public Detalle comparar(int id){var s=repo.obtener(id);if(!"FINALIZADO".equals(s.estado()))throw invalido("Seleccione un semestre finalizado.");return new Detalle(s,repo.actual(false),ComparadorSemestres.comparar(repo.filas(id),repo.filasActuales()));}
 @Transactional(readOnly=true) public byte[] descargar(int id,boolean original){
  var semestre=repo.obtener(id);
  if(!original && "ACTUAL".equals(semestre.estado()) && semestre.archivadoEn()==null)return pdf.generarListado(semestre.nombre(),repo.listadoActual(),false);
  byte[] contenido=repo.pdf(id,original);
  if(contenido==null&&!original)return pdf.generarListado(semestre.nombre(),listado(id),semestre.simulado());
  if(contenido==null)throw invalido("Este semestre no tiene un PDF original adjunto.");return contenido;
 }
 @Transactional(readOnly=true) public List<FilaListadoDocente> listado(int id){
  var semestre=repo.obtener(id);if("ACTUAL".equals(semestre.estado()) && semestre.archivadoEn()==null)return repo.listadoActual();
  var guardado=repo.listado(id);return guardado.isEmpty()?sinIdentidades(repo.filas(id)):guardado;
 }
 private List<FilaListadoDocente> sinIdentidades(List<FilaSemestre> filas){
  var resultado=new ArrayList<FilaListadoDocente>();for(var f:filas){for(String nombre:f.docentes().isEmpty()?List.of("POR DESIGNAR"):f.docentes())resultado.add(new FilaListadoDocente(f.codigo(),f.asignatura(),f.grupo(),nombre,"","","","",""));}return resultado;
 }

 @Transactional(readOnly=true) public VistaPrevia previsualizar(String nombre,MultipartFile archivo){return preparar(nombre,archivo,false);}
 @Transactional(readOnly=true) public VistaPrevia previsualizar(String nombre,LocalDate inicio,LocalDate fin,MultipartFile archivo){
  validarFechas(inicio,fin);validarNuevoPeriodo(repo.actual(false),inicio,fin);
  var previa=preparar(nombre,archivo,false);
  return new VistaPrevia(previa.semestreAnterior(),previa.semestreNuevo(),previa.diferencias(),previa.avisos(),huella(previa.confirmacion()+"|"+inicio+"|"+fin));
 }
 @Transactional public Panel abrir(String nombre,LocalDate inicio,LocalDate fin,String observaciones,MultipartFile archivo,String confirmacion){
  validarFechas(inicio,fin);validarNuevoPeriodo(repo.actual(true),inicio,fin);
  var previa=preparar(nombre,archivo,false);
  if(!huella(previa.confirmacion()+"|"+inicio+"|"+fin).equals(confirmacion))throw invalido("Las fechas o el catalogo cambiaron. Revise nuevamente antes de confirmar.");
  abrir(nombre,observaciones,archivo,previa.confirmacion());
  repo.guardarFechas(repo.actual(false).id(),inicio,fin);return listar();
 }
 @Transactional public Panel configurarFechas(LocalDate inicio,LocalDate fin){
  validarFechas(inicio,fin);var actual=repo.actual(true);
  if(actual.archivadoEn()!=null)throw invalido("El semestre ya fue archivado; sus fechas no se pueden modificar.");
  if(repo.haySolapamiento(actual.id(),inicio,fin))throw invalido("Las fechas se solapan con otro semestre registrado.");
  repo.guardarFechas(actual.id(),inicio,fin);archivarVencido();return listar();
 }
 @Transactional public void archivarVencido(){
  var actual=repo.actual(true);
  if(actual.fechaFin()==null||actual.archivadoEn()!=null||!LocalDate.now(reloj).isAfter(actual.fechaFin()))return;
  archivar(actual);
 }
 private void archivar(Resumen actual){
  var listado=repo.listadoActual();repo.guardarListado(actual.id(),listado);
  repo.guardarFilas(actual.id(),repo.filasActuales());
  repo.guardarPdfListado(actual.id(),pdf.generarListado(actual.nombre(),listado,false),false);
  repo.marcarArchivado(actual.id());
 }
 private void validarFechas(LocalDate inicio,LocalDate fin){
  if(inicio==null||fin==null)throw invalido("Indique la fecha de inicio y fin del semestre.");
  if(fin.isBefore(inicio))throw invalido("La fecha de fin no puede ser anterior al inicio.");
 }
 private void validarNuevoPeriodo(Resumen actual,LocalDate inicio,LocalDate fin){
  if(fin.isBefore(LocalDate.now(reloj)))throw invalido("El nuevo semestre no puede estar vencido. Registre un historico en su lugar.");
  if(actual.fechaFin()!=null && !LocalDate.now(reloj).isAfter(actual.fechaFin()))throw invalido("El semestre actual sigue vigente hasta "+actual.fechaFin()+". Ajuste sus fechas o espere a su finalizacion.");
  if(actual.fechaFin()!=null && !inicio.isAfter(actual.fechaFin()))throw invalido("El nuevo semestre debe empezar despues del fin del actual.");
  if(repo.haySolapamiento(-1,inicio,fin))throw invalido("Las fechas se solapan con otro semestre registrado.");
 }
 private VistaPrevia preparar(String nombre,MultipartFile archivo,boolean bloquear){
  var actual=repo.actual(bloquear);var periodo=periodo(nombre);if(periodo[0]*2+periodo[1]<=actual.anio()*2+actual.numero())throw invalido("El nuevo semestre debe ser posterior a "+actual.nombre()+".");
  if(repo.existe(periodo[0],periodo[1],false))throw invalido("Ese semestre ya está registrado.");
  var antes=repo.filasActuales();var despues=archivo==null||archivo.isEmpty()?antes:leer(archivo);
  List<String> avisos=new ArrayList<>();var docentes=repo.docentes();
  for(var f:despues)for(var nombreDocente:f.docentes())if(resolver(nombreDocente,docentes).size()!=1)avisos.add(f.asignatura()+" · grupo "+f.grupo()+": «"+nombreDocente+"» no coincide con un docente activo único. El grupo quedará por asignar; no se creará una cuenta desde el PDF.");
  String token=huella(actual.id()+"|"+nombre+"|"+antes+"|"+despues+"|"+docentes);
  return new VistaPrevia(actual.nombre(),nombre,ComparadorSemestres.comparar(antes,despues),avisos,token);
 }
 @Transactional public Panel abrir(String nombre,String observaciones,MultipartFile archivo,String confirmacion){
  var previa=preparar(nombre,archivo,true);
  if(confirmacion==null||!confirmacion.equals(previa.confirmacion()))throw invalido("El catálogo cambió desde la vista previa. Revise nuevamente antes de confirmar.");
  var anterior=repo.actual(false);var antes=repo.filasActuales();var despues=archivo==null||archivo.isEmpty()?antes:leer(archivo);
  if(anterior.archivadoEn()==null)archivar(anterior);
  repo.cerrar(anterior.id(),repo.pdf(anterior.id(),false));
  var periodo=periodo(nombre);int nuevo=repo.crear(periodo[0],periodo[1],"ACTUAL",observaciones(observaciones),false,null,bytes(archivo));
  var docentes=repo.docentes();
  var cargas=new ArrayList<SemestreRepository.CargaGrupo>();
  for(var f:despues){var asignados=new ArrayList<Docente>();for(var nombreDocente:f.docentes()){var candidatos=resolver(nombreDocente,docentes);if(candidatos.size()==1)asignados.add(candidatos.getFirst());}cargas.add(new SemestreRepository.CargaGrupo(f,List.copyOf(asignados)));}
  repo.crearCatalogo(cargas);
  // No se copian estudiantes, ayudantes ni exámenes al nuevo semestre.
  return listar();
 }
 @Transactional public Panel historico(String nombre,String observaciones,MultipartFile archivo){
  var actual=repo.actual(true);var p=periodo(nombre);if(p[0]*2+p[1]>=actual.anio()*2+actual.numero())throw invalido("El histórico debe ser anterior al semestre actual.");
  if(repo.existe(p[0],p[1],false))throw invalido("Ese semestre ya tiene un histórico real.");
  var filas=leer(archivo);var listado=leerListadoPdf(bytes(archivo)).orElseGet(()->sinIdentidades(filas));
  int id=repo.crear(p[0],p[1],"FINALIZADO",observaciones(observaciones),false,pdf.generarListado(nombre,listado,false),bytes(archivo));repo.guardarFilas(id,filas);repo.guardarListado(id,listado);return listar();
 }
 @Transactional public Panel historico(String nombre,LocalDate inicio,LocalDate fin,String observaciones,MultipartFile archivo){
  validarFechas(inicio,fin);
  if(!LocalDate.now(reloj).isAfter(fin))throw invalido("Un historico debe tener una fecha de fin pasada.");
  if(repo.haySolapamiento(-1,inicio,fin))throw invalido("Las fechas se solapan con otro semestre registrado.");
  historico(nombre,observaciones,archivo);
  var periodo=periodo(nombre);int id=repo.idPeriodo(periodo[0],periodo[1]);
  repo.guardarFechas(id,inicio,fin);repo.marcarArchivado(id);return listar();
 }
 @Transactional public Panel ejemplos(){
  var actual=repo.actual(true);var base=new ArrayList<>(repo.filasActuales());
  if(base.isEmpty())for(int i=0;i<120;i++)base.add(new FilaSemestre(String.valueOf(9900000+i/3),"Asignatura de ejemplo "+(i/3+1),String.valueOf(i%3+1),List.of()));
  String[] nombres={"Ana Maria","Bruno","Carla","Daniel","Elena","Fernando","Gabriela","Hector","Isabel","Javier","Laura","Miguel"};
  String[] apellidos={"Prueba Rojas","Ejemplo Vargas","Demo Flores"};
  for(String nombre:List.of("1-2025","2-2025","1-2026")){var p=periodo(nombre);if(p[0]*2+p[1]>=actual.anio()*2+actual.numero()||repo.existe(p[0],p[1],false))continue;
   var listado=new ArrayList<FilaListadoDocente>();var filas=new ArrayList<FilaSemestre>();
   for(int i=0;i<base.size();i++){
    var f=base.get(i);int persona=(i+(p[0]-2025)*3+p[1])%36;
    String nom=nombres[persona%12],ape=apellidos[persona/12];
    listado.add(new FilaListadoDocente(f.codigo(),f.asignatura(),f.grupo(),nom,ape,String.valueOf(90000001+persona),String.valueOf(990000001+persona),"docente"+(persona+1)+"@example.test",String.valueOf(70000001+persona)));
    filas.add(new FilaSemestre(f.codigo(),f.asignatura(),f.grupo(),List.of(nom+" "+ape)));
   }
   int id=repo.prepararEjemplo(p[0],p[1]);repo.guardarFilas(id,filas);repo.guardarListado(id,listado);repo.guardarPdfListado(id,pdf.generarListado(nombre,listado,true),true);
  }return listar();
 }
 private Optional<List<FilaListadoDocente>> leerListadoPdf(byte[] bytes){
  try(var documento=Loader.loadPDF(bytes)){
   if(documento.getNumberOfPages()>100)throw invalido("Maximo 100 paginas.");
   String datos=documento.getDocumentInformation().getCustomMetadataValue(PdfSemestreService.LISTADO_METADATA);
   if(datos==null)return Optional.empty();if(datos.length()>8_000_000)throw invalido("Listado demasiado grande.");
   var filas=Arrays.asList(new tools.jackson.databind.ObjectMapper().readValue(Base64.getDecoder().decode(datos),FilaListadoDocente[].class));
   if(filas.isEmpty()||filas.size()>5000)throw invalido("El listado admite entre 1 y 5000 filas.");
   for(var f:filas)for(String valor:List.of(f.codigo(),f.asignatura(),f.grupo(),f.nombre(),f.apellido(),f.ci(),f.sis(),f.correo(),f.telefono()))if(valor.length()>500||valor.contains("|"))throw invalido("Dato invalido en el listado.");
   return Optional.of(List.copyOf(filas));
  }catch(SolicitudInvalidaException e){throw e;}catch(Exception e){throw invalido("El PDF no contiene un listado valido.");}
 }
 private List<Docente> resolver(String nombre,List<Docente> docentes){String n=ComparadorSemestres.normalizar(nombre);return docentes.stream().filter(d->ComparadorSemestres.normalizar(d.nombre()+" "+d.apellido()).equals(n)||ComparadorSemestres.normalizar(d.apellido()+" "+d.nombre()).equals(n)).toList();}
 public List<FilaSemestre> leer(MultipartFile archivo){
  byte[] b=bytes(archivo);if(b==null)throw invalido("Adjunte el PDF del horario.");
  var listado=leerListadoPdf(b);
  if(listado.isPresent()){
   var agrupadas=new TreeMap<String,FilaSemestre>();for(var f:listado.get())agregar(agrupadas,f.codigo(),f.asignatura(),f.grupo(),f.nombre().equals("POR DESIGNAR")?List.of():List.of((f.nombre()+" "+f.apellido()).trim()));
   return new ArrayList<>(agrupadas.values());
  }
  String texto;try(var doc=Loader.loadPDF(b)){if(doc.getNumberOfPages()>100)throw invalido("Máximo 100 páginas.");var stripper=new PDFTextStripper();stripper.setSortByPosition(true);texto=stripper.getText(doc);}catch(java.io.IOException e){throw invalido("No se pudo leer el PDF. Debe tener texto seleccionable y no estar protegido.");}
  var unicas=new TreeMap<String,FilaSemestre>();
  if(texto.contains("CODIGO | ASIGNATURA | GRUPO | DOCENTES")){
   StringBuilder fila = new StringBuilder();
   for (String linea : texto.lines().toList()) {
    if (linea.matches("^(ID:)?[0-9]+\\s*\\|.*")) {
     if (!fila.isEmpty()) agregarCanonica(unicas, fila.toString());
     fila.setLength(0); fila.append(linea);
    } else if (!fila.isEmpty() && !linea.isBlank()) fila.append(' ').append(linea.trim());
   }
   if (!fila.isEmpty()) agregarCanonica(unicas, fila.toString());
  }else for(var f:lector.leer(b))if(!f.auxiliar())agregar(unicas,String.valueOf(f.codigoAsignatura()),f.nombreAsignatura(),f.nombreGrupo(),f.porDesignar()?List.of():List.of(f.nombreDocente()));
  if(unicas.isEmpty())throw invalido("El PDF no contiene asignaturas y grupos reconocibles.");if(unicas.size()>5000)throw invalido("El horario admite hasta 5000 grupos.");return new ArrayList<>(unicas.values());
 }
 private void agregarCanonica(Map<String,FilaSemestre> mapa, String linea) {
  String[] c=linea.split("\\|",4); if(c.length!=4)throw invalido("Fila de horario incompleta.");
  agregar(mapa,c[0].trim(),c[1].trim(),c[2].trim(),c[3].trim().equals("POR DESIGNAR")?List.of():Arrays.stream(c[3].trim().split(";;")).map(String::trim).toList());
 }
 private void agregar(Map<String,FilaSemestre> mapa,String codigo,String asignatura,String grupo,List<String> docentes){
  grupo=grupo.trim().toUpperCase(Locale.ROOT);if(grupo.isBlank()||grupo.length()>50||codigo.length()>40||asignatura.isBlank())throw invalido("Asignatura o grupo inválido.");String key=codigo+":"+grupo;var vieja=mapa.get(key);
  if(vieja!=null&&!ComparadorSemestres.normalizar(vieja.asignatura()).equals(ComparadorSemestres.normalizar(asignatura)))throw invalido("Código con nombres contradictorios: "+codigo);
  var nombres=new TreeSet<String>(docentes);if(vieja!=null)nombres.addAll(vieja.docentes());mapa.put(key,new FilaSemestre(codigo,asignatura,grupo,List.copyOf(nombres)));
 }
 private byte[] bytes(MultipartFile archivo){if(archivo==null||archivo.isEmpty())return null;if(archivo.getOriginalFilename()==null||!archivo.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".pdf")||archivo.getSize()>10*1024*1024)throw invalido("Seleccione un PDF de hasta 10 MB.");try{return archivo.getBytes();}catch(java.io.IOException e){throw invalido("No se pudo leer el archivo.");}}
 private int[] periodo(String nombre){if(nombre==null||!nombre.matches("[12]-20[0-9]{2}"))throw invalido("Use el formato 1-2027 o 2-2027.");return new int[]{Integer.parseInt(nombre.substring(2)),Integer.parseInt(nombre.substring(0,1))};}
 private String observaciones(String s){if(s!=null&&s.length()>2000)throw invalido("Las observaciones admiten hasta 2000 caracteres.");return s==null?"":s.trim();}
 private String huella(String s){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private SolicitudInvalidaException invalido(String mensaje){return new SolicitudInvalidaException(mensaje);}
}
