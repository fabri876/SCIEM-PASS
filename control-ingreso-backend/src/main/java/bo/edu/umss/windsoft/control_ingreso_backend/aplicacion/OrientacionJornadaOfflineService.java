package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CarreraEstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/** Datos minimos de la jornada para orientacion, no para autorizar ingresos. */
@Service
public class OrientacionJornadaOfflineService {
    private static final ZoneId ZONA = ZoneId.of("America/La_Paz");
    private final ControlIngresoAyudanteService control;
    private final ExamenRepository examenes;
    private final AsignaturaRepository asignaturas;
    private final AsignacionAulaService aulas;
    private final CredencialRepository credenciales;
    private final CarreraEstudianteRepository carreras;

    public record Candidato(Integer idAsignatura, Integer idExamen, Integer idAmbiente,
                            String sis, String ci, String nombre, String asignatura, String aula,
                            String edificio, long apertura, long cierre, String qrHash,
                            Long qrDesde, Long qrHasta, String carrera) {}
    public record Jornada(String fecha, List<Candidato> candidatos) {}

    public OrientacionJornadaOfflineService(ControlIngresoAyudanteService control, ExamenRepository examenes,
            AsignaturaRepository asignaturas, AsignacionAulaService aulas, CredencialRepository credenciales,
            CarreraEstudianteRepository carreras) {
        this.control = control; this.examenes = examenes; this.asignaturas = asignaturas;
        this.aulas = aulas; this.credenciales = credenciales;
        this.carreras = carreras;
    }

    @Transactional(readOnly = true)
    public Jornada descargar(Integer usuario, Integer asignaturaControl, Integer examenControl, Integer ambienteControl) {
        control.validarAsignacionDeControl(new VerificarIngresoRequestDTO("", asignaturaControl, examenControl, ambienteControl, null), usuario);
        LocalDate hoy = LocalDate.now(ZONA);
        var candidatos = new ArrayList<Candidato>();
        for (var examen : examenes.findAll()) {
            if (!hoy.equals(examen.getFechaExamen()) || examen.getIdExamen().equals(examenControl)) continue;
            var reparto = aulas.repartir(examen.getIdAsignatura(), examen.getIdExamen());
            var nombreAsignatura = asignaturas.findById(examen.getIdAsignatura()).map(a -> a.getNombreAsignatura()).orElse(null);
            var credencialesExamen = credenciales.findAllByIdExamen(examen.getIdExamen());
            for (var estudiante : reparto.habilitados().values()) {
                var aula = reparto.aulaDe(estudiante.codSis()).orElse(null);
                if (aula == null || aula.ambiente().getHoraInicio() == null || aula.ambiente().getHoraFin() == null) continue;
                long apertura = hoy.atTime(aula.ambiente().getHoraInicio()).minusMinutes(15).atZone(ZONA).toInstant().toEpochMilli();
                long cierre = hoy.atTime(aula.ambiente().getHoraFin()).atZone(ZONA).toInstant().toEpochMilli();
                var credencial = credencialesExamen.stream().filter(c -> estudiante.idUsuario().equals(c.getIdUsuario())
                        && "ACTIVO".equals(c.getEstado()) && c.getToken() != null && c.getValidoDesde() != null
                        && c.getValidoHasta() != null).findFirst().orElse(null);
                candidatos.add(new Candidato(examen.getIdAsignatura(), examen.getIdExamen(), aula.idAmbiente(),
                        String.valueOf(estudiante.codSis()), estudiante.ci(), estudiante.nombreCompleto(), nombreAsignatura,
                        aula.nombre(), aula.ubicacion(), apertura, cierre,
                        credencial == null ? null : hash(credencial.getToken()),
                        credencial == null ? null : credencial.getValidoDesde().atZone(ZONA).toInstant().toEpochMilli(),
                        credencial == null ? null : credencial.getValidoHasta().atZone(ZONA).toInstant().toEpochMilli(),
                        String.join(", ", carreras.nombres(estudiante.idUsuario(), estudiante.codSis()))));
            }
        }
        return new Jornada(hoy.toString(), List.copyOf(candidatos));
    }

    static String hash(String valor) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 no disponible", e); }
    }
}
