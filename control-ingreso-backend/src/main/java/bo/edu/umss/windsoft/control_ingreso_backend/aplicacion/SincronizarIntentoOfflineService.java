package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CredencialRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Sincronizacion conservadora: si los datos ya no coinciden se exige revision. */
@Service
public class SincronizarIntentoOfflineService {
    private static final ZoneId ZONA = ZoneId.of("America/La_Paz");
    public record Solicitud(UUID clientUuid, Integer asignaturaControl, Integer examenControl,
            Integer ambienteControl, Integer estudianteSis, Integer asignaturaDestino, Integer examenDestino,
            Integer ambienteDestino, String metodo, String qrHash, String qrToken, Long fechaCreacion) {}
    private final ControlIngresoAyudanteService control;
    private final IntentoExamenIncorrectoService intentos;
    private final IntentoExamenIncorrectoRepository repositorio;
    private final EstudianteRepository estudiantes;
    private final UsuarioRepository usuarios;
    private final HabilitacionRepository habilitaciones;
    private final ExamenRepository examenes;
    private final AmbienteRepository ambientes;
    private final CredencialRepository credenciales;

    public SincronizarIntentoOfflineService(ControlIngresoAyudanteService control, IntentoExamenIncorrectoService intentos,
            IntentoExamenIncorrectoRepository repositorio, EstudianteRepository estudiantes, UsuarioRepository usuarios,
            HabilitacionRepository habilitaciones, ExamenRepository examenes, AmbienteRepository ambientes,
            CredencialRepository credenciales) {
        this.control=control; this.intentos=intentos; this.repositorio=repositorio; this.estudiantes=estudiantes;
        this.usuarios=usuarios; this.habilitaciones=habilitaciones; this.examenes=examenes;
        this.ambientes=ambientes; this.credenciales=credenciales;
    }

    @Transactional
    public int sincronizar(Solicitud s, Integer operador, String ip) {
        if (s == null || s.clientUuid() == null || operador == null || s.asignaturaControl() == null
                || s.examenControl() == null || s.ambienteControl() == null || s.estudianteSis() == null
                || s.asignaturaDestino() == null || s.examenDestino() == null || s.ambienteDestino() == null
                || s.fechaCreacion() == null || s.fechaCreacion() <= 0 || s.metodo() == null
                || !Set.of("SIS", "CI", "QR").contains(s.metodo())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datos de verificacion incompletos.");
        if (s.fechaCreacion() > System.currentTimeMillis() + 600_000L) throw revision();
        LocalDateTime momento;
        try { momento = LocalDateTime.ofInstant(Instant.ofEpochMilli(s.fechaCreacion()), ZONA); }
        catch (RuntimeException ex) { throw revision(); }
        control.validarAsignacionDeControl(new VerificarIngresoRequestDTO("", s.asignaturaControl(), s.examenControl(), s.ambienteControl(), MetodoIngreso.MANUAL), operador);
        var estudiante = estudiantes.findByCodsisestudiante(s.estudianteSis()).orElseThrow(SincronizarIntentoOfflineService::revision);
        var usuario = usuarios.findById(estudiante.getIdusuario()).orElseThrow(SincronizarIntentoOfflineService::revision);
        String ejecutor = usuarios.findById(operador).map(u -> u.getCorreousuario()).orElse(null);
        var datos = new IntentoExamenIncorrectoRepository.Datos(s.clientUuid(), s.asignaturaControl(), s.examenControl(),
                s.ambienteControl(), operador, usuario.getIdusuario(), s.estudianteSis(), s.metodo(),
                s.asignaturaDestino(), s.examenDestino(), s.ambienteDestino());
        // Un reintento confirmado conserva el resultado original aunque cambie la jornada.
        var previo = repositorio.buscar(s.clientUuid());
        if (previo.isPresent()) {
            var anterior = previo.get().datos();
            if (!Objects.equals(anterior.asignaturaDestino(), s.asignaturaDestino())
                    || !Objects.equals(anterior.examenDestino(), s.examenDestino())
                    || !Objects.equals(anterior.ambienteDestino(), s.ambienteDestino())) throw revision();
            return intentos.registrar(datos, ejecutor, usuario.getCorreousuario(), ip).idIntento();
        }
        var examen = examenes.findById(s.examenControl()).orElseThrow(SincronizarIntentoOfflineService::revision);
        var ambiente = ambientes.findById(s.ambienteControl()).orElseThrow(SincronizarIntentoOfflineService::revision);
        if (examen.getFechaExamen() == null || ambiente.getHoraInicio() == null || ambiente.getHoraFin() == null
                || momento.isBefore(examen.getFechaExamen().atTime(ambiente.getHoraInicio()).minusMinutes(15))
                || momento.isAfter(examen.getFechaExamen().atTime(ambiente.getHoraFin()))) throw revision();
        if (habilitaciones.existsByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(s.asignaturaControl(), s.examenControl(), s.estudianteSis())) throw revision();
        var destinos = control.examenesCorrespondientes(s.estudianteSis(), s.examenControl(), momento);
        if (destinos.size() != 1 || !Objects.equals(destinos.get(0).idAsignatura(), s.asignaturaDestino())
                || !Objects.equals(destinos.get(0).idExamen(), s.examenDestino())
                || !Objects.equals(destinos.get(0).idAmbiente(), s.ambienteDestino())) throw revision();
        if ("QR".equals(s.metodo())) {
            boolean valido = s.qrHash() != null && s.qrHash().matches("[0-9a-f]{64}")
                    && s.qrToken() != null && !s.qrToken().isBlank()
                    && OrientacionJornadaOfflineService.hash(s.qrToken()).equals(s.qrHash())
                    && credenciales.findAllByIdExamen(s.examenDestino()).stream().anyMatch(c ->
                    Objects.equals(c.getIdUsuario(), usuario.getIdusuario()) && "ACTIVO".equals(c.getEstado())
                    && c.getToken() != null && c.getValidoDesde() != null && c.getValidoHasta() != null
                    && !momento.isBefore(c.getValidoDesde()) && !momento.isAfter(c.getValidoHasta())
                    && MessageDigest.isEqual(c.getToken().getBytes(StandardCharsets.UTF_8), s.qrToken().getBytes(StandardCharsets.UTF_8)));
            if (!valido) throw revision();
        }
        return intentos.registrar(datos, ejecutor, usuario.getCorreousuario(), ip,
                "verificacion_offline=" + momento, momento).idIntento();
    }

    private static ResponseStatusException revision() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "La verificacion requiere revision; los datos actuales no coinciden.");
    }
}
