package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaEspecifica;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.NormaGeneral;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.NormaEspecificaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.NormaGeneralRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NormaGeneralService {

    private final NormaGeneralRepository normaGeneralRepository;
    private final NormaEspecificaRepository normaEspecificaRepository;

    public NormaGeneralService(NormaGeneralRepository normaGeneralRepository,
                                NormaEspecificaRepository normaEspecificaRepository) {
        this.normaGeneralRepository = normaGeneralRepository;
        this.normaEspecificaRepository = normaEspecificaRepository;
    }

    public List<NormaGeneral> obtenerNormasActivas() {
        return normaGeneralRepository.findByEstadoNormaTrue();
    }

    // BUG-006 (QA): el admin necesita ver también las inactivas para poder
    // reactivarlas — el GET público solo trae activas a propósito (catálogo
    // que consumen los exámenes), así que este es un endpoint aparte.
    public List<NormaGeneral> obtenerTodas() {
        return normaGeneralRepository.findAll();
    }

    public NormaGeneral crear(String descripcionNorma) {
        NormaGeneral norma = new NormaGeneral();
        norma.setDescripcionNorma(descripcionNorma);
        norma.setEstadoNorma(true);
        return normaGeneralRepository.save(norma);
    }

    public NormaGeneral actualizar(Integer id, String descripcionNorma) {
        NormaGeneral norma = normaGeneralRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Norma general no encontrada: " + id));
        norma.setDescripcionNorma(descripcionNorma);
        return normaGeneralRepository.save(norma);
    }

    @Transactional
    public void darDeBaja(Integer id) {
        NormaGeneral norma = normaGeneralRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Norma general no encontrada: " + id));
        norma.setEstadoNorma(false);
        normaGeneralRepository.save(norma);
    }

    // BUG-006 (QA): no existía forma de reactivar una norma desactivada.
    @Transactional
    public void activar(Integer id) {
        NormaGeneral norma = normaGeneralRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Norma general no encontrada: " + id));
        norma.setEstadoNorma(true);
        normaGeneralRepository.save(norma);
    }

    @Transactional
    public NormaGeneral promoverDesdeEspecifica(Integer idNormaEspecifica) {
        NormaEspecifica especifica = normaEspecificaRepository.findById(idNormaEspecifica)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Norma específica no encontrada: " + idNormaEspecifica));

        if (Boolean.TRUE.equals(especifica.getPromovida())) {
            throw new IllegalArgumentException(
                    "Esta norma específica ya fue promovida al catálogo general anteriormente.");
        }

        NormaGeneral nueva = new NormaGeneral();
        nueva.setDescripcionNorma(especifica.getDescripcionNorma());
        nueva.setEstadoNorma(true);
        NormaGeneral guardada = normaGeneralRepository.save(nueva);

        especifica.setPromovida(true);
        normaEspecificaRepository.save(especifica);

        return guardada;
    }
}