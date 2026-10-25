package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.CambioAmbiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AulaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.CambioAmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * HU10 · Aula asignada de cada estudiante en un examen.
 *
 * Decisión del equipo (10/10/2026): reparto AUTOMÁTICO.
 * 1. Los habilitados del examen se ordenan por apellido y nombre.
 * 2. Se reparten en bloques entre las aulas del examen (ordenadas por nombre),
 * en proporción a su capacidad (si alguna aula no tiene capacidad, por partes
 * iguales).
 * 3. Las reubicaciones ("Reubicar y Autorizar", tabla cambioambiente) tienen
 * prioridad: vale la más reciente de cada estudiante.
 *
 * El escaneo del operador (HU05) y el dashboard (HU10) usan este mismo cálculo,
 * así que siempre coinciden. Es determinista: mientras la lista de habilitados
 * no cambie, nadie cambia de aula.
 */
@Service
public class AsignacionAulaService {

    public record AulaExamen(Ambiente ambiente, String nombre, String ubicacion, Integer capacidad) {
        public Integer idAmbiente() {
            return ambiente.getIdAmbiente();
        }
    }

    public record EstudianteHabilitado(Integer idUsuario, Integer codSis, String ci, String nombreCompleto) {
    }

    /**
     * @param aulas       aulas del examen, en orden
     * @param habilitados habilitados por Código SIS, en orden de apellido
     * @param asignacion  Código SIS → idambiente asignado (reparto + reubicaciones)
     */
    public record Reparto(List<AulaExamen> aulas,
            Map<Integer, EstudianteHabilitado> habilitados,
            Map<Integer, Integer> asignacion) {

        public Optional<AulaExamen> aulaDe(Integer codSis) {
            Integer idAmbiente = asignacion.get(codSis);
            return aulas.stream().filter(a -> a.idAmbiente().equals(idAmbiente)).findFirst();
        }

        public Optional<AulaExamen> aula(Integer idAmbiente) {
            return aulas.stream().filter(a -> a.idAmbiente().equals(idAmbiente)).findFirst();
        }
    }

    private final AmbienteRepository ambienteRepository;
    private final AulaRepository aulaRepository;
    private final HabilitacionRepository habilitacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final CambioAmbienteRepository cambioAmbienteRepository;

    public AsignacionAulaService(AmbienteRepository ambienteRepository, AulaRepository aulaRepository,
            HabilitacionRepository habilitacionRepository, UsuarioRepository usuarioRepository,
            CambioAmbienteRepository cambioAmbienteRepository) {
        this.ambienteRepository = ambienteRepository;
        this.aulaRepository = aulaRepository;
        this.habilitacionRepository = habilitacionRepository;
        this.usuarioRepository = usuarioRepository;
        this.cambioAmbienteRepository = cambioAmbienteRepository;
    }

    /**
     * Aula asignada a un estudiante; vacío si no está habilitado o el examen no
     * tiene aulas.
     */
    @Transactional(readOnly = true)
    public Optional<AulaExamen> aulaAsignada(Integer idAsignatura, Integer idExamen, Integer codSis) {
        return repartir(idAsignatura, idExamen).aulaDe(codSis);
    }

    @Transactional(readOnly = true)
    public Reparto repartir(Integer idAsignatura, Integer idExamen) {
        List<AulaExamen> aulas = aulasDelExamen(idAsignatura, idExamen);
        Map<Integer, EstudianteHabilitado> habilitados = habilitadosOrdenados(idAsignatura, idExamen);
        Map<Integer, Integer> asignacion = new HashMap<>();
        if (aulas.isEmpty()) {
            return new Reparto(aulas, habilitados, asignacion);
        }

        // Reparto en bloques según la cuota de cada aula
        int[] cuotas = calcularCuotas(aulas, habilitados.size());
        int indiceAula = 0;
        int ocupadosEnAula = 0;
        for (Integer codSis : habilitados.keySet()) {
            while (indiceAula < aulas.size() - 1 && ocupadosEnAula >= cuotas[indiceAula]) {
                indiceAula++;
                ocupadosEnAula = 0;
            }
            asignacion.put(codSis, aulas.get(indiceAula).idAmbiente());
            ocupadosEnAula++;
        }

        // Reubicaciones (la más reciente gana)
        List<Integer> idsAmbiente = aulas.stream().map(AulaExamen::idAmbiente).toList();
        for (CambioAmbiente cambio : cambioAmbienteRepository
                .findByIdAmbienteInOrderByFechaHoraCambioAscIdCambioAsc(idsAmbiente)) {
            if (cambio.getCodsisEstudiante() != null) {
                asignacion.put(cambio.getCodsisEstudiante(), cambio.getIdAmbiente());
            }
        }
        return new Reparto(aulas, habilitados, asignacion);
    }

    /**
     * Cuota de estudiantes por aula: proporcional a la capacidad (método del
     * mayor resto) o por partes iguales si alguna aula no tiene capacidad.
     */
    static int[] calcularCuotas(List<AulaExamen> aulas, int totalEstudiantes) {
        int n = aulas.size();
        int[] cuotas = new int[n];
        boolean sinCapacidad = aulas.stream().anyMatch(a -> a.capacidad() == null || a.capacidad() <= 0);
        long capacidadTotal = sinCapacidad ? n : aulas.stream().mapToLong(AulaExamen::capacidad).sum();

        double[] restos = new double[n];
        int asignados = 0;
        for (int i = 0; i < n; i++) {
            long peso = sinCapacidad ? 1 : aulas.get(i).capacidad();
            double exacto = (double) totalEstudiantes * peso / capacidadTotal;
            cuotas[i] = (int) Math.floor(exacto);
            restos[i] = exacto - cuotas[i];
            asignados += cuotas[i];
        }
        // Los que sobran van a las aulas con mayor resto (empate: la primera)
        for (int faltan = totalEstudiantes - asignados; faltan > 0; faltan--) {
            int mejor = 0;
            for (int i = 1; i < n; i++) {
                if (restos[i] > restos[mejor]) {
                    mejor = i;
                }
            }
            cuotas[mejor]++;
            restos[mejor] = -1;
        }
        return cuotas;
    }

    private List<AulaExamen> aulasDelExamen(Integer idAsignatura, Integer idExamen) {
        List<Ambiente> ambientes = ambienteRepository.findByIdExamen(idExamen).stream()
                .filter(a -> idAsignatura == null || idAsignatura.equals(a.getIdAsignatura()))
                .toList();
        Map<Integer, Aula> aulas = aulaRepository.findAllById(ambientes.stream().map(Ambiente::getIdAula).toList())
                .stream().collect(Collectors.toMap(Aula::getIdAula, Function.identity()));

        Collator collator = Collator.getInstance(new Locale("es"));
        return ambientes.stream()
                .map(a -> {
                    Aula aula = aulas.get(a.getIdAula());
                    return new AulaExamen(a,
                            aula != null ? aula.getNombreAula() : "Ambiente #" + a.getIdAmbiente(),
                            aula != null ? aula.getUbicacionAula() : null,
                            aula != null ? aula.getCapacidadAula() : null);
                })
                .sorted(Comparator.comparing(AulaExamen::nombre, collator)
                        .thenComparing(AulaExamen::idAmbiente))
                .toList();
    }

    private Map<Integer, EstudianteHabilitado> habilitadosOrdenados(Integer idAsignatura, Integer idExamen) {
        List<Habilitacion> habilitaciones = habilitacionRepository.findHabilitadosConEstudiante(idAsignatura, idExamen);
        Map<Integer, Usuario> usuarios = usuarioRepository.findAllById(habilitaciones.stream()
                .map(h -> h.getEstudiante().getIdusuario()).distinct().toList())
                .stream().collect(Collectors.toMap(Usuario::getIdusuario, Function.identity()));

        Collator collator = Collator.getInstance(new Locale("es"));
        collator.setStrength(Collator.PRIMARY); // sin distinguir mayúsculas ni tildes
        List<Habilitacion> ordenadas = new ArrayList<>(habilitaciones);
        ordenadas.sort(Comparator
                .comparing((Habilitacion h) -> texto(usuarios.get(h.getEstudiante().getIdusuario()), true), collator)
                .thenComparing(h -> texto(usuarios.get(h.getEstudiante().getIdusuario()), false), collator)
                .thenComparing(h -> h.getEstudiante().getCodsisestudiante()));

        Map<Integer, EstudianteHabilitado> resultado = new LinkedHashMap<>();
        for (Habilitacion h : ordenadas) {
            Usuario u = usuarios.get(h.getEstudiante().getIdusuario());
            Integer codSis = h.getEstudiante().getCodsisestudiante();
            resultado.putIfAbsent(codSis, new EstudianteHabilitado(h.getEstudiante().getIdusuario(), codSis,
                    u != null ? u.getCiusuario() : null,
                    u != null ? (u.getNombreusuario() + " " + u.getApellidousuario()).trim() : "SIS " + codSis));
        }
        return resultado;
    }

    private String texto(Usuario u, boolean apellido) {
        if (u == null) {
            return "";
        }
        String valor = apellido ? u.getApellidousuario() : u.getNombreusuario();
        return valor == null ? "" : valor.trim();
    }
}
