package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.IntentoNoAutorizado;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoNoAutorizadoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Guarda los ingresos bloqueados en el punto de control (HU05) para el
 * dashboard de la HU10 ("Duplicados Bloqueados", alertas de aula diferente).
 *
 * Se guarda en una transacción PROPIA y el commit también va dentro del
 * try/catch: si guardar el intento fallara, el escaneo del operador sigue
 * funcionando igual y solo queda el error en el log.
 */
@Service
public class IntentoIngresoService {

    private static final Logger logger = LoggerFactory.getLogger(IntentoIngresoService.class);

    private final IntentoNoAutorizadoRepository intentoRepository;

    public IntentoIngresoService(IntentoNoAutorizadoRepository intentoRepository) {
        this.intentoRepository = intentoRepository;
    }

    public void registrar(MotivoIntento motivo, Integer idAsignatura, Integer idExamen, Integer idAmbiente,
                          Integer idAmbienteAsignado, Integer idUsuarioEstudiante, Integer codSis,
                          Integer idUsuarioRegistra) {
        try {
            IntentoNoAutorizado intento = new IntentoNoAutorizado();
            intento.setMotivo(motivo);
            intento.setIdAsignatura(idAsignatura);
            intento.setIdExamen(idExamen);
            intento.setIdAmbiente(idAmbiente);
            intento.setIdAmbienteAsignado(idAmbienteAsignado);
            intento.setIdUsuarioEstudiante(idUsuarioEstudiante);
            intento.setCodsisEstudiante(codSis);
            intento.setIdUsuarioRegistra(idUsuarioRegistra);
            intento.setFechaIntento(HoraOficial.hoy());
            intento.setHoraIntento(HoraOficial.ahora());
            intentoRepository.save(intento);
        } catch (Exception e) {
            logger.error("No se pudo guardar el intento {} del SIS {}: {}", motivo, codSis, e.getMessage());
        }
    }
}
