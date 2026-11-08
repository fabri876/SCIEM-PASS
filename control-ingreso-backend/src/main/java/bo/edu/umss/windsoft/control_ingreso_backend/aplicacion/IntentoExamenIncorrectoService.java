package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository.Datos;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository.Guardado;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Set;
import java.time.LocalDateTime;

/** Registra el intento y su auditoria en la misma transaccion de verificacion. */
@Service
public class IntentoExamenIncorrectoService {
    private final IntentoExamenIncorrectoRepository repo;
    private final AuditoriaService auditoria;
    public IntentoExamenIncorrectoService(IntentoExamenIncorrectoRepository repo, AuditoriaService auditoria) {
        this.repo = repo; this.auditoria = auditoria;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Guardado registrar(Datos datos, String ejecutor, String afectado, String ip) {
        return registrar(datos, ejecutor, afectado, ip, null);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Guardado registrar(Datos datos, String ejecutor, String afectado, String ip, String contextoAdicional) {
        return registrar(datos, ejecutor, afectado, ip, contextoAdicional, null);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Guardado registrar(Datos datos, String ejecutor, String afectado, String ip, String contextoAdicional,
                             LocalDateTime marcadoEn) {
        if (datos == null || datos.solicitud() == null || datos.metodo() == null
                || !Set.of("QR", "SIS", "CI").contains(datos.metodo())) {
            throw new IllegalArgumentException("Se requieren identificador de solicitud y metodo de verificacion valido.");
        }
        var nuevo = marcadoEn == null ? repo.insertar(datos) : repo.insertar(datos, marcadoEn);
        if (nuevo.isPresent()) {
            int id = nuevo.get();
            auditoria.registrarEnTransaccion("INTENTO_EXAMEN_INCORRECTO", ejecutor, afectado,
                    "intento=" + id + ", estudiante=" + datos.estudiante() + ", examen=" + datos.examen()
                            + ", ambiente=" + datos.ambiente() + ", examen_destino=" + datos.examenDestino()
                            + ", metodo=" + datos.metodo()
                            + (contextoAdicional == null ? "" : ", " + contextoAdicional), ip);
            return new Guardado(id, datos);
        }
        Guardado previo = repo.buscar(datos.solicitud())
                .orElseThrow(() -> new IllegalStateException("No se encontro la solicitud registrada."));
        Datos p = previo.datos();
        if (p.operador() != datos.operador() || p.estudiante() != datos.estudiante()
                || p.codSis() != datos.codSis() || p.asignatura() != datos.asignatura()
                || p.examen() != datos.examen() || p.ambiente() != datos.ambiente()
                || !Objects.equals(p.metodo(), datos.metodo())) {
            throw new IllegalArgumentException("La clave de solicitud ya corresponde a otra verificacion.");
        }
        return previo;
    }
}
