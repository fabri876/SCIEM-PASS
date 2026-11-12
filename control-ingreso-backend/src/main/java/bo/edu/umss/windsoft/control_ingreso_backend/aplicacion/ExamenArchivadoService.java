package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ExamenArchivado;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenArchivadoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import org.apache.pdfbox.Loader;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.security.*;
import java.time.*;
import java.util.*;
@Service
public class ExamenArchivadoService {
    private final ExamenArchivadoRepository repository;
    private final Clock clock;
    @org.springframework.beans.factory.annotation.Autowired
    public ExamenArchivadoService(ExamenArchivadoRepository repository) {
        this(repository,Clock.system(ZoneId.of("America/La_Paz")));
    }
    ExamenArchivadoService(ExamenArchivadoRepository repository,Clock clock) {
        this.repository=repository; this.clock=clock;
    }
    public List<ExamenArchivado> listar(int limite,int offset) {
        if(limite<1 || limite>100 || offset<0) throw error("La página debe tener entre 1 y 100 registros.");
        return repository.listar(limite,offset);
    }
    public byte[] pdf(long id) {
        return repository.pdf(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Documento no encontrado."));
    }
    @Transactional
    public long guardar(ExamenArchivadoRequest d,MultipartFile archivo) {
        if(d.strNombre()==null || d.strNombre().isBlank() || d.strNombre().trim().length()>200)
            throw error("Indique un título de hasta 200 caracteres.");
        if(d.strPeriodo()==null || !d.strPeriodo().matches("[12]-[12][0-9]{3}"))
            throw error("Indique la gestión con formato 1-2026 o 2-2026.");
        var hoy=LocalDate.now(clock);
        int anio=Integer.parseInt(d.strPeriodo().substring(2));
        int semestre=Integer.parseInt(d.strPeriodo().substring(0,1));
        if(anio>hoy.getYear() || (anio==hoy.getYear() && semestre>(hoy.getMonthValue()<=6?1:2)))
            throw error("No se pueden cargar documentos de una gestión futura.");
        if(d.strFecha()!=null && (d.strFecha().isAfter(hoy) || d.strFecha().getYear()!=anio))
            throw error("La fecha no debe ser futura y debe corresponder al año de la gestión.");
        if(d.strObservaciones()!=null && d.strObservaciones().length()>500)
            throw error("Las observaciones no pueden superar 500 caracteres.");
        if(archivo==null || archivo.isEmpty()) throw error("Adjunte un archivo PDF.");
        if(archivo.getSize()>10L*1024*1024) throw error("El archivo supera el tamaño máximo de 10 MB.");
        if(archivo.getOriginalFilename()==null || !archivo.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".pdf")
            || (archivo.getContentType()!=null && !List.of("application/pdf","application/octet-stream").contains(archivo.getContentType())))
            throw error("Solo se permiten archivos PDF.");
        byte[] bytes;
        try {
            bytes=archivo.getBytes();
            try(var pdf=Loader.loadPDF(bytes)) {
                if(pdf.isEncrypted() || pdf.getNumberOfPages()<1) throw error("El PDF debe ser legible y no estar protegido.");
            }
        } catch(IOException e) { throw error("El archivo no contiene un PDF válido y legible."); }
        String sha;
        try { sha=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
        Long id=repository.guardar(d,bytes,sha);
        if(id==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Este PDF ya existe en la biblioteca de exámenes pasados.");
        return id;
    }
    private static ResponseStatusException error(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,mensaje);
    }
}
