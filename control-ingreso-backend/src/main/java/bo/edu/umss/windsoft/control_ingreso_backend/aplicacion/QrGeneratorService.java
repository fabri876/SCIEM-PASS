package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Credencial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

@Service
public class QrGeneratorService {

    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int TOKEN_LENGTH = 12;
    private final SecureRandom random = new SecureRandom();

    private final CredencialRepository credencialRepository;
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;

    public QrGeneratorService(CredencialRepository credencialRepository, ExamenRepository examenRepository,
                              AmbienteRepository ambienteRepository) {
        this.credencialRepository = credencialRepository;
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
    }

    /**
     * Genera un token aleatorio seguro de 12 caracteres agrupados en bloques de 4 separados por guiones.
     * Ejemplo: K7P2-9XQM-4TRA
     */
    public String generateUniqueToken() {
        StringBuilder sb = new StringBuilder(TOKEN_LENGTH);
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
        }
        return sb.substring(0, 4) + "-" + sb.substring(4, 8) + "-" + sb.substring(8, 12);
    }

    /**
     * Genera (o actualiza) la credencial QR para un estudiante y un examen específico.
     * Define la ventana de validez desde 24h antes del examen hasta el final del día del examen.
     */
    @Transactional
    public Credencial generarCredencialParaEstudiante(Integer idUsuario, Integer idExamen) {
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new IllegalArgumentException("Examen no encontrado: " + idExamen));

        LocalDate fechaEx = examen.getFechaExamen();
        if (fechaEx == null) {
            throw new IllegalStateException("El examen no tiene una fecha definida.");
        }

        // Validez exacta: 24 horas antes del inicio del examen.
        LocalTime horaInicio = ambienteRepository.findByIdExamen(idExamen).stream()
                .map(a -> a.getHoraInicio())
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(LocalTime.MIDNIGHT);
        LocalDateTime inicioExamen = fechaEx.atTime(horaInicio);
        LocalDateTime validoDesde = inicioExamen.minusHours(24);
        LocalDateTime validoHasta = fechaEx.atTime(LocalTime.MAX);

        // Si ya existe una credencial, la actualizamos para que sea válida nuevamente si estaba anulada
        Optional<Credencial> existenteOpt = credencialRepository.findByIdUsuarioAndIdExamen(idUsuario, idExamen);
        if (existenteOpt.isPresent()) {
            Credencial credencial = existenteOpt.get();
            credencial.setToken(generateUniqueToken()); // Generamos uno nuevo por seguridad
            credencial.setValidoDesde(validoDesde);
            credencial.setValidoHasta(validoHasta);
            credencial.setEstado("ACTIVO");
            return credencialRepository.save(credencial);
        }

        // Crear nueva credencial
        Credencial nuevaCredencial = new Credencial(
                idUsuario, 
                idExamen, 
                generateUniqueToken(), 
                validoDesde, 
                validoHasta
        );
        return credencialRepository.save(nuevaCredencial);
    }

    /**
     * Anula una credencial QR en caso de inhabilitación del estudiante.
     */
    @Transactional
    public void anularCredencial(Integer idUsuario, Integer idExamen) {
        credencialRepository.findByIdUsuarioAndIdExamen(idUsuario, idExamen).ifPresent(credencial -> {
            credencial.setEstado("ANULADO");
            credencialRepository.save(credencial);
        });
    }
}
