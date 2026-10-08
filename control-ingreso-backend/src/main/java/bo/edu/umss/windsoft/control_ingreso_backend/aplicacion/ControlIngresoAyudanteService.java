package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoExamen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AsignacionNoActivaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AsignaturaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AyudanteExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.TipoExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.DelegadoExamenDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteResumenDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.JornadaActivaDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.PrimerIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ResultadoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ControlIngresoAyudanteService {

    private static final Logger log = LoggerFactory.getLogger(ControlIngresoAyudanteService.class);
    private static final ZoneId ZONA_HORARIA = ZoneId.of("America/La_Paz");

    private final AyudanteExamenRepository ayudanteExamenRepository;
    private final AsignaturaRepository asignaturaRepository;
    private final ExamenRepository examenRepository;
    private final AmbienteRepository ambienteRepository;
    private final AulaRepository aulaRepository;
    private final TipoExamenRepository tipoExamenRepository;
    private final HabilitacionRepository habilitacionRepository;
    private final IngresoRepository ingresoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;

    public ControlIngresoAyudanteService(AyudanteExamenRepository ayudanteExamenRepository,
                                         AsignaturaRepository asignaturaRepository,
                                         ExamenRepository examenRepository,
                                         AmbienteRepository ambienteRepository,
                                         AulaRepository aulaRepository,
                                         TipoExamenRepository tipoExamenRepository,
                                         HabilitacionRepository habilitacionRepository,
                                         IngresoRepository ingresoRepository,
                                         UsuarioRepository usuarioRepository,
                                         EstudianteRepository estudianteRepository) {
        this.ayudanteExamenRepository = ayudanteExamenRepository;
        this.asignaturaRepository = asignaturaRepository;
        this.examenRepository = examenRepository;
        this.ambienteRepository = ambienteRepository;
        this.aulaRepository = aulaRepository;
        this.tipoExamenRepository = tipoExamenRepository;
        this.habilitacionRepository = habilitacionRepository;
        this.ingresoRepository = ingresoRepository;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
    }

    public List<DelegadoExamenDTO> obtenerDelegadosActivos(Integer idUsuario) {
        List<AyudanteExamen> activas = ayudanteExamenRepository.findByIdIdayudanteAndEstadoAsignacion(idUsuario, "ACTIVO");
        validarSolapamientoAsignaciones(activas);

        return activas.stream()
                .map(this::mapearADelegadoDTO)
                .sorted(Comparator.comparing(DelegadoExamenDTO::fechaExamen, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(DelegadoExamenDTO::horaInicio, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    public JornadaActivaDTO obtenerJornadaActiva(Integer idUsuario) {
        List<AyudanteExamen> activas = ayudanteExamenRepository.findByIdIdayudanteAndEstadoAsignacion(idUsuario, "ACTIVO");
        if (activas.isEmpty()) {
            throw new AsignacionNoActivaException("No tiene asignaciones ACTIVAS para control de ingreso.");
        }

        AyudanteExamen seleccionada;
        if (activas.size() == 1) {
            seleccionada = activas.get(0);
        } else {
            LocalDateTime ahora = LocalDateTime.now(ZONA_HORARIA);
            LocalDate hoy = ahora.toLocalDate();
            LocalTime horaActual = ahora.toLocalTime();

            // 1. En curso
            List<AyudanteExamen> enCurso = activas.stream()
                    .filter(ae -> {
                        Examen ex = obtenerExamen(ae);
                        Ambiente amb = obtenerAmbiente(ae);
                        if (ex == null || amb == null || ex.getFechaExamen() == null) return false;
                        return ex.getFechaExamen().equals(hoy)
                                && !horaActual.isBefore(amb.getHoraInicio())
                                && !horaActual.isAfter(amb.getHoraFin());
                    })
                    .sorted(Comparator.comparing(ae -> obtenerAmbiente(ae).getHoraInicio()))
                    .toList();

            if (!enCurso.isEmpty()) {
                seleccionada = enCurso.get(0);
            } else {
                // 2. Más próxima a iniciar
                Optional<AyudanteExamen> masProxima = activas.stream()
                        .filter(ae -> {
                            Examen ex = obtenerExamen(ae);
                            Ambiente amb = obtenerAmbiente(ae);
                            if (ex == null || amb == null || ex.getFechaExamen() == null) return false;
                            LocalDateTime inicioExamen = LocalDateTime.of(ex.getFechaExamen(), amb.getHoraInicio());
                            return inicioExamen.isAfter(ahora);
                        })
                        .min(Comparator.comparing(ae -> {
                            Examen ex = obtenerExamen(ae);
                            Ambiente amb = obtenerAmbiente(ae);
                            LocalDateTime inicioExamen = LocalDateTime.of(ex.getFechaExamen(), amb.getHoraInicio());
                            return Duration.between(ahora, inicioExamen).abs();
                        }));

                if (masProxima.isPresent()) {
                    seleccionada = masProxima.get();
                } else {
                    seleccionada = activas.stream()
                            .min(Comparator.comparing((AyudanteExamen ae) -> {
                                Examen ex = obtenerExamen(ae);
                                return ex != null ? ex.getFechaExamen() : LocalDate.MAX;
                            }).thenComparing(ae -> {
                                Ambiente amb = obtenerAmbiente(ae);
                                return amb != null ? amb.getHoraInicio() : LocalTime.MAX;
                            }))
                            .orElse(activas.get(0));
                }
            }
        }

        return mapearAJornadaActivaDTO(seleccionada);
    }

    public JornadaActivaDTO obtenerExamenSeleccionado(Integer idUsuario, Integer idAsignatura, Integer idExamen, Integer idAmbiente) {
        bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId id =
                new bo.edu.umss.windsoft.control_ingreso_backend.dominio.AyudanteExamenId(idUsuario, idAsignatura, idExamen, idAmbiente);
        AyudanteExamen asignacion = ayudanteExamenRepository.findById(id)
                .orElseThrow(() -> new AsignacionNoActivaException("No tiene asignado el examen/aula seleccionada."));

        return mapearAJornadaActivaDTO(asignacion);
    }

    @Transactional
    public ResponseEntity<ResultadoIngresoDTO> registrarIngreso(VerificarIngresoRequestDTO dto, Integer idOperador) {
        String query = dto.identificador() != null ? dto.identificador().trim() : "";

        // 1. Búsqueda del Estudiante por C.I. o Código SIS
        Estudiante estudiante = null;
        Usuario usuario = null;

        if (query.matches("^\\d+$")) {
            try {
                Integer codsis = Integer.parseInt(query);
                Optional<Estudiante> estOpt = estudianteRepository.findByCodsisestudiante(codsis);
                if (estOpt.isPresent()) {
                    estudiante = estOpt.get();
                    usuario = usuarioRepository.findById(estudiante.getIdusuario()).orElse(null);
                }
            } catch (NumberFormatException ignored) {
            }
        }

        if (usuario == null) {
            Optional<Usuario> userOpt = usuarioRepository.findByCiusuario(query);
            if (userOpt.isPresent()) {
                usuario = userOpt.get();
                estudiante = estudianteRepository.findByIdusuario(usuario.getIdusuario()).orElse(null);
            }
        }

        if (usuario == null || estudiante == null) {
            ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                    "NO_ENCONTRADO",
                    "ESTUDIANTE NO ENCONTRADO - EL DATO NO EXISTE EN EL SISTEMA. El dato «" + query + "» no corresponde a ningún estudiante registrado.",
                    null,
                    null,
                    null,
                    null
            );
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resultado);
        }

        EstudianteResumenDTO estudianteResumen = new EstudianteResumenDTO(
                usuario.getIdusuario(),
                estudiante.getCodsisestudiante(),
                usuario.getCiusuario(),
                usuario.getNombreusuario() + " " + usuario.getApellidousuario(),
                "Carrera no asignada",
                null
        );

        // 2. Verificación de Habilitación Académica
        Optional<Habilitacion> habOpt = habilitacionRepository
                .findByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(dto.idasignatura(), dto.idexamen(), estudiante.getCodsisestudiante());

        if (habOpt.isEmpty()) {
            habOpt = habilitacionRepository.findByIdAsignaturaAndIdExamenAndIdUsuario(dto.idasignatura(), dto.idexamen(), usuario.getIdusuario());
        }

        if (habOpt.isEmpty() || !Boolean.TRUE.equals(habOpt.get().getEstadohabilitacion())) {
            String motivo = habOpt.map(Habilitacion::getObservacionhabilitacion)
                    .orElse("Estudiante no figura como HABILITADO para este examen.");
            ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                    "INHABILITADO",
                    "INGRESO DENEGADO - ESTUDIANTE INHABILITADO",
                    estudianteResumen,
                    null,
                    null,
                    motivo
            );
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(resultado);
        }

        // 3. Verificación de Ingreso Previo (Duplicado)
        Optional<Ingreso> ingresoPrevio = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                estudiante.getCodsisestudiante(), dto.idasignatura(), dto.idexamen()
        );

        if (ingresoPrevio.isPresent()) {
            Ingreso prev = ingresoPrevio.get();
            Ambiente ambPrev = ambienteRepository.findById(prev.getIdAmbiente()).orElse(null);
            Aula aulaPrev = ambPrev != null ? aulaRepository.findById(ambPrev.getIdAula()).orElse(null) : null;

            String nombreAula = aulaPrev != null ? aulaPrev.getNombreAula() : (ambPrev != null ? "Ambiente #" + ambPrev.getIdAmbiente() : "Aula asignada");
            String ubicacionAula = aulaPrev != null ? aulaPrev.getUbicacionAula() : "";

            PrimerIngresoDTO primerIngreso = new PrimerIngresoDTO(
                    prev.getHoraIngreso(),
                    nombreAula,
                    ubicacionAula
            );

            ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                    "DUPLICADO",
                    "INGRESO DENEGADO - DUPLICADO DETECTADO",
                    estudianteResumen,
                    null,
                    primerIngreso,
                    null
            );
            return ResponseEntity.status(HttpStatus.CONFLICT).body(resultado);
        }

        // 4. Registro Exitoso del Ingreso
        Ingreso nuevoIngreso = new Ingreso();
        nuevoIngreso.setIdUsuarioEstudiante(usuario.getIdusuario());
        nuevoIngreso.setCodsisEstudiante(estudiante.getCodsisestudiante());
        nuevoIngreso.setIdAsignatura(dto.idasignatura());
        nuevoIngreso.setIdExamen(dto.idexamen());
        nuevoIngreso.setIdAmbiente(dto.idambiente());
        nuevoIngreso.setIdUsuarioRegistra(idOperador);
        nuevoIngreso.setFechaIngreso(LocalDate.now(ZONA_HORARIA));
        nuevoIngreso.setHoraIngreso(LocalDateTime.now(ZONA_HORARIA));
        nuevoIngreso.setTipoIngreso(TipoIngreso.NORMAL);
        nuevoIngreso.setMetodoIngreso(dto.metodoIngreso() != null ? dto.metodoIngreso() : MetodoIngreso.MANUAL);

        ingresoRepository.save(nuevoIngreso);

        ResultadoIngresoDTO resultado = new ResultadoIngresoDTO(
                "PERMITIDO",
                "INGRESO PERMITIDO",
                estudianteResumen,
                nuevoIngreso.getHoraIngreso(),
                null,
                null
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(resultado);
    }

    private DelegadoExamenDTO mapearADelegadoDTO(AyudanteExamen ae) {
        Asignatura asig = obtenerAsignatura(ae);
        Examen ex = obtenerExamen(ae);
        Ambiente amb = obtenerAmbiente(ae);
        Aula aula = amb != null ? obtenerAula(amb.getIdAula()) : null;

        String nombreAsig = asig != null ? asig.getNombreAsignatura() : "Sin Asignatura";
        String siglaAsig = asig != null ? asig.getSiglaAsignatura() : "";
        String nombreEx = resolverNombreExamen(ex);
        String nombreAmb = aula != null ? aula.getNombreAula() : (amb != null ? "Ambiente #" + amb.getIdAmbiente() : "Sin Aula");
        String ubicacionAmb = aula != null ? aula.getUbicacionAula() : "";
        LocalDate fechaEx = ex != null ? ex.getFechaExamen() : null;
        LocalTime horaIni = amb != null ? amb.getHoraInicio() : null;
        LocalTime horaFin = amb != null ? amb.getHoraFin() : null;

        String estadoMateria = calcularEstadoMateria(fechaEx, horaIni, horaFin);

        Integer idAsig = ae.getId().getIdasignatura();
        Integer idEx = ae.getId().getIdexamen();
        Integer idAmb = ae.getId().getIdambiente();

        int totalHab = (int) habilitacionRepository.countByIdAsignaturaAndIdExamenAndEstadohabilitacionTrue(idAsig, idEx);
        int inhabilitados = (int) habilitacionRepository.countByIdAsignaturaAndIdExamenAndEstadohabilitacionFalse(idAsig, idEx);
        int ingresaron = (int) ingresoRepository.countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(idAsig, idEx, idAmb);
        int faltantes = Math.max(0, totalHab - ingresaron);

        return new DelegadoExamenDTO(
                ae.getId().getIdayudante(),
                idAsig,
                nombreAsig,
                siglaAsig,
                idEx,
                nombreEx,
                idAmb,
                nombreAmb,
                ubicacionAmb,
                fechaEx,
                horaIni,
                horaFin,
                null,
                ae.getEstadoAsignacion(),
                estadoMateria,
                ingresaron,
                faltantes,
                inhabilitados,
                totalHab
        );
    }

    private JornadaActivaDTO mapearAJornadaActivaDTO(AyudanteExamen ae) {
        Asignatura asig = obtenerAsignatura(ae);
        Examen ex = obtenerExamen(ae);
        Ambiente amb = obtenerAmbiente(ae);
        Aula aula = amb != null ? obtenerAula(amb.getIdAula()) : null;

        String nombreAsig = asig != null ? asig.getNombreAsignatura() : "Sin Asignatura";
        String siglaAsig = asig != null ? asig.getSiglaAsignatura() : "";
        String nombreEx = resolverNombreExamen(ex);
        String nombreAmb = aula != null ? aula.getNombreAula() : (amb != null ? "Ambiente #" + amb.getIdAmbiente() : "Sin Aula");
        String ubicacionAmb = aula != null ? aula.getUbicacionAula() : "";
        LocalDate fechaEx = ex != null ? ex.getFechaExamen() : null;
        LocalTime horaIni = amb != null ? amb.getHoraInicio() : null;
        LocalTime horaFin = amb != null ? amb.getHoraFin() : null;

        String estadoMateria = calcularEstadoMateria(fechaEx, horaIni, horaFin);

        Integer idAsig = ae.getId().getIdasignatura();
        Integer idEx = ae.getId().getIdexamen();
        Integer idAmb = ae.getId().getIdambiente();

        int cantidadOperadores = ayudanteExamenRepository
                .countByIdIdasignaturaAndIdIdexamenAndIdIdambienteAndEstadoAsignacion(idAsig, idEx, idAmb, "ACTIVO");

        int totalHab = (int) habilitacionRepository.countByIdAsignaturaAndIdExamenAndEstadohabilitacionTrue(idAsig, idEx);
        int inhabilitados = (int) habilitacionRepository.countByIdAsignaturaAndIdExamenAndEstadohabilitacionFalse(idAsig, idEx);
        int ingresaron = (int) ingresoRepository.countByIdAsignaturaAndIdExamenAndIdAmbienteAndIdExpulsionIsNull(idAsig, idEx, idAmb);
        int faltantes = Math.max(0, totalHab - ingresaron);

        return new JornadaActivaDTO(
                idAsig,
                nombreAsig,
                siglaAsig,
                idEx,
                nombreEx,
                idAmb,
                nombreAmb,
                ubicacionAmb,
                fechaEx,
                horaIni,
                horaFin,
                null,
                estadoMateria,
                cantidadOperadores,
                ingresaron,
                faltantes,
                inhabilitados,
                totalHab
        );
    }

    private String calcularEstadoMateria(LocalDate fechaExamen, LocalTime horaInicio, LocalTime horaFin) {
        if (fechaExamen == null || horaInicio == null || horaFin == null) {
            return "PROXIMO";
        }
        LocalDateTime ahora = LocalDateTime.now(ZONA_HORARIA);
        LocalDate hoy = ahora.toLocalDate();
        LocalTime horaActual = ahora.toLocalTime();

        if (fechaExamen.isBefore(hoy) || (fechaExamen.equals(hoy) && horaActual.isAfter(horaFin))) {
            return "FINALIZADO";
        }
        if (fechaExamen.equals(hoy) && !horaActual.isBefore(horaInicio) && !horaActual.isAfter(horaFin)) {
            return "EN_CURSO";
        }
        return "PROXIMO";
    }

    private String resolverNombreExamen(Examen ex) {
        if (ex == null) return "Sin Examen";
        if (ex.getDetalleTipoExamen() != null && !ex.getDetalleTipoExamen().isBlank()) {
            return ex.getDetalleTipoExamen();
        }
        if (ex.getIdTipoExamen() != null) {
            Optional<TipoExamen> te = tipoExamenRepository.findById(ex.getIdTipoExamen());
            if (te.isPresent()) return te.get().getNombreTipoExamen();
        }
        return "Examen #" + ex.getIdExamen();
    }

    private Asignatura obtenerAsignatura(AyudanteExamen ae) {
        if (ae.getAsignatura() != null) return ae.getAsignatura();
        return asignaturaRepository.findById(ae.getId().getIdasignatura()).orElse(null);
    }

    private Examen obtenerExamen(AyudanteExamen ae) {
        if (ae.getExamen() != null) return ae.getExamen();
        return examenRepository.findById(ae.getId().getIdexamen()).orElse(null);
    }

    private Ambiente obtenerAmbiente(AyudanteExamen ae) {
        if (ae.getAmbiente() != null) return ae.getAmbiente();
        return ambienteRepository.findById(ae.getId().getIdambiente()).orElse(null);
    }

    private Aula obtenerAula(Integer idAula) {
        if (idAula == null) return null;
        return aulaRepository.findById(idAula).orElse(null);
    }

    private void validarSolapamientoAsignaciones(List<AyudanteExamen> activas) {
        for (int i = 0; i < activas.size(); i++) {
            for (int j = i + 1; j < activas.size(); j++) {
                AyudanteExamen ae1 = activas.get(i);
                AyudanteExamen ae2 = activas.get(j);

                Examen ex1 = obtenerExamen(ae1);
                Examen ex2 = obtenerExamen(ae2);
                Ambiente amb1 = obtenerAmbiente(ae1);
                Ambiente amb2 = obtenerAmbiente(ae2);

                if (ex1 != null && ex2 != null && amb1 != null && amb2 != null
                        && Objects.equals(ex1.getFechaExamen(), ex2.getFechaExamen())
                        && ex1.getFechaExamen() != null) {

                    if (seSuperponen(amb1.getHoraInicio(), amb1.getHoraFin(), amb2.getHoraInicio(), amb2.getHoraFin())) {
                        log.warn("ADVERTENCIA: Solapamiento detectado para el operador ID {} en la fecha {}: " +
                                        "Asignación 1 (Ambiente {}) [{} - {}] vs Asignación 2 (Ambiente {}) [{} - {}]",
                                ae1.getId().getIdayudante(), ex1.getFechaExamen(),
                                amb1.getIdAmbiente(), amb1.getHoraInicio(), amb1.getHoraFin(),
                                amb2.getIdAmbiente(), amb2.getHoraInicio(), amb2.getHoraFin());
                    }
                }
            }
        }
    }

    private boolean seSuperponen(LocalTime ini1, LocalTime fin1, LocalTime ini2, LocalTime fin2) {
        if (ini1 == null || fin1 == null || ini2 == null || fin2 == null) return false;
        return !ini1.isAfter(fin2) && !ini2.isAfter(fin1);
    }
}
