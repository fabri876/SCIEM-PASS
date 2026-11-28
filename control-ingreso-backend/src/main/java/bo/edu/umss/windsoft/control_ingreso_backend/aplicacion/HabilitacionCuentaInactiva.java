package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
class HabilitacionCuentaInactiva {
    static final String MOTIVO = "Usuario desactivado";
    static final ZoneId ZONA = ZoneId.of("America/La_Paz");
    private final UsuarioRepository usuarios;
    private final ExamenRepository examenes;
    private final AmbienteRepository ambientes;
    private final HabilitacionRepository habilitaciones;
    private final Clock reloj;

    @Autowired
    HabilitacionCuentaInactiva(UsuarioRepository usuarios, ExamenRepository examenes,
            AmbienteRepository ambientes, HabilitacionRepository habilitaciones) {
        this(usuarios, examenes, ambientes, habilitaciones, Clock.system(ZONA));
    }

    HabilitacionCuentaInactiva(UsuarioRepository usuarios, ExamenRepository examenes,
            AmbienteRepository ambientes, HabilitacionRepository habilitaciones, Clock reloj) {
        this.usuarios = usuarios;
        this.examenes = examenes;
        this.ambientes = ambientes;
        this.habilitaciones = habilitaciones;
        this.reloj = reloj.withZone(ZONA);
    }

    Usuario bloquearCuenta(Integer idUsuario) {
        return usuarios.bloquearPorId(idUsuario).orElseThrow(() ->
                new bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException(
                        "No se encontró la cuenta del estudiante."));
    }

    boolean impideHabilitar(Usuario cuenta, Examen examen) {
        return !Boolean.TRUE.equals(cuenta.getEstadousuario()) && esFuturo(examen, LocalDateTime.now(reloj));
    }

    void aplicarAlCrear(Habilitacion nueva, Usuario cuenta, Examen examen) {
        if (Boolean.TRUE.equals(nueva.getEstadohabilitacion()) && impideHabilitar(cuenta, examen))
            inhabilitar(nueva);
    }

    // La transacción llamadora mantiene bloqueada la cuenta hasta confirmar.
    void alDesactivar(Integer idUsuario) {
        LocalDateTime corte = LocalDateTime.now(reloj);
        Map<Integer, Boolean> futuros = new HashMap<>();
        for (Habilitacion fila : habilitaciones.vigentesPorEstudiante(idUsuario)) {
            if (fila.getIdExamen() != null && futuros.computeIfAbsent(fila.getIdExamen(), id ->
                    examenes.findById(id).map(examen -> esFuturo(examen, corte)).orElse(false))) {
                inhabilitar(fila);
            }
        }
    }

    void alReactivarExamen(Examen examen) {
        if (!esFuturo(examen, LocalDateTime.now(reloj))) return;
        Integer idExamen = examen.getIdExamen();
        for (Integer idUsuario : habilitaciones.cuentasConHabilitacionVigente(idExamen)) {
            // Leer las habilitaciones después de adquirir el mismo bloqueo que usa la desactivación.
            usuarios.bloquearPorId(idUsuario)
                    .filter(cuenta -> !Boolean.TRUE.equals(cuenta.getEstadousuario()))
                    .ifPresent(cuenta -> habilitaciones.vigentesPorExamenYEstudiante(idExamen, idUsuario)
                            .forEach(this::inhabilitar));
        }
    }

    boolean esFuturo(Examen examen, LocalDateTime corte) {
        if (!Boolean.TRUE.equals(examen.getEstadoExamen()) || Boolean.TRUE.equals(examen.getCancelado())
                || examen.getFechaExamen() == null) return false;
        return ambientes.findByIdExamen(examen.getIdExamen()).stream()
                .map(Ambiente::getHoraInicio).filter(Objects::nonNull).min(LocalTime::compareTo)
                .map(inicio -> examen.getFechaExamen().atTime(inicio).isAfter(corte)).orElse(false);
    }

    private void inhabilitar(Habilitacion fila) {
        fila.setEstadohabilitacion(false);
        fila.setObservacionhabilitacion(MOTIVO);
    }
}
