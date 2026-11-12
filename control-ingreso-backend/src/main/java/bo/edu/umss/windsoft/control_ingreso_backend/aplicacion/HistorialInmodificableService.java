package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.SelloAuditoriaRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HistorialInmodificableBloqueDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IntegridadCadenaResultadoDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Servicio de consulta, filtrado forense y verificación de integridad
 * criptográfica
 * para la HU-15: "Historial Inmodificable de las Operaciones del Sistema".
 */
@Service
public class HistorialInmodificableService {

    private static final DateTimeFormatter FORMATTER_OFICIAL = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS",
            Locale.ENGLISH);

    private final AuditoriaRepository auditoriaRepository;
    private final SelloAuditoriaRepository selloRepository;

    public HistorialInmodificableService(AuditoriaRepository auditoriaRepository,
            SelloAuditoriaRepository selloRepository) {
        this.auditoriaRepository = auditoriaRepository;
        this.selloRepository = selloRepository;
    }

    /**
     * Lista los eventos históricos disponibles. No inventa sellos para registros
     * que no fueron sellados al momento de su creación.
     */
    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public List<HistorialInmodificableBloqueDto> listarHistorialInmodificable(
            String moduloFiltro, String ejecutorFiltro, String fechaFiltro,
            String fechaInicio, String fechaFin, String busqueda) {

        List<Auditoria> todosAsc = auditoriaRepository.findAll().stream()
                .sorted(Comparator.comparing(Auditoria::getIdAuditoria, Comparator.nullsLast(Integer::compareTo)))
                .toList();

        Map<Integer, SelloAuditoriaRepository.Sello> sellos = selloRepository.disponible()
                ? selloRepository.listar().stream()
                        .collect(Collectors.toMap(SelloAuditoriaRepository.Sello::idAuditoria, s -> s))
                : Map.of();
        List<HistorialInmodificableBloqueDto> cadenaCompleta = construirCadena(todosAsc, sellos);

        // Filtrar en memoria sobre la cadena construida
        List<HistorialInmodificableBloqueDto> filtrados = new ArrayList<>();
        for (HistorialInmodificableBloqueDto bloque : cadenaCompleta) {
            if (cumpleFiltros(bloque, moduloFiltro, ejecutorFiltro, fechaFiltro, fechaInicio, fechaFin, busqueda)) {
                filtrados.add(bloque);
            }
        }

        // Devolver del más reciente al más antiguo (Criterio 3)
        filtrados.sort((a, b) -> Integer.compare(b.getIdBloque(), a.getIdBloque()));
        return filtrados;
    }

    /**
     * Comprueba la cadena interna disponible; los eventos anteriores sin sello y
     * la ausencia de un punto de control externo se informan expresamente.
     */
    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public IntegridadCadenaResultadoDto verificarIntegridadCadena() {
        List<Auditoria> todosAsc = auditoriaRepository.findAll().stream()
                .sorted(Comparator.comparing(Auditoria::getIdAuditoria, Comparator.nullsLast(Integer::compareTo)))
                .toList();
        if (!selloRepository.disponible()) {
            return new IntegridadCadenaResultadoDto(false, todosAsc.size(),
                    "No es posible verificar la integridad: los eventos no tienen sellos criptográficos almacenados.");
        }
        List<SelloAuditoriaRepository.Sello> sellos = selloRepository.listar();
        var cabeza = selloRepository.cabeza();
        if (cabeza.isEmpty() || sellos.isEmpty()) {
            return new IntegridadCadenaResultadoDto(false, sellos.size(), "No hay cadena sellada verificable.");
        }
        Map<Integer, Auditoria> eventos = todosAsc.stream()
                .collect(Collectors.toMap(Auditoria::getIdAuditoria, a -> a));
        String anterior = AuditoriaHashService.HASH_GENESIS;
        long secuencia = 0;
        for (var sello : sellos) {
            Auditoria evento = eventos.get(sello.idAuditoria());
            if (evento == null || sello.secuencia() != ++secuencia || !anterior.equals(sello.anterior())
                    || !sello.actual().equals(hashPersistido(sello, evento))) {
                return new IntegridadCadenaResultadoDto(false, sellos.size(),
                        "Inconsistencia detectada en la cadena interna.", sello.idAuditoria(),
                        "Sello, secuencia o enlace incorrecto");
            }
            anterior = sello.actual();
        }
        if (cabeza.get().secuencia() != secuencia || !anterior.equals(cabeza.get().hash())) {
            return new IntegridadCadenaResultadoDto(false, sellos.size(), "La cabeza no coincide con el último sello.");
        }
        return new IntegridadCadenaResultadoDto(true, sellos.size(),
                "Cadena interna consistente. Sin punto de control externo no se descarta una reescritura privilegiada. "
                        + (todosAsc.size() - sellos.size()) + " eventos históricos sin sello no se verificaron.");
    }

    private String hashPersistido(SelloAuditoriaRepository.Sello sello, Auditoria aud) {
        return AuditoriaHashService.hashEventoPersistido(sello.secuencia(), sello.anterior(), aud.getIdAuditoria(),
                aud.getIdUsuario(), aud.getFechaAccion(), aud.getAccion());
    }

    private List<HistorialInmodificableBloqueDto> construirCadena(List<Auditoria> listaAsc,
            Map<Integer, SelloAuditoriaRepository.Sello> sellos) {
        List<HistorialInmodificableBloqueDto> resultado = new ArrayList<>();

        for (Auditoria aud : listaAsc) {
            Integer id = aud.getIdAuditoria();
            String fechaOficial = aud.getFechaAccion() != null
                    ? aud.getFechaAccion().format(FORMATTER_OFICIAL)
                    : "";

            String accionCompleta = aud.getAccion() != null ? aud.getAccion() : "";
            String operacion = desglosarOperacion(accionCompleta);
            String modulo = inferirModulo(operacion, accionCompleta);
            String ejecutor = desglosarEjecutor(accionCompleta);
            String ip = desglosarIp(accionCompleta);
            String detalles = desglosarDetalles(accionCompleta);
            var sello = sellos.get(id);

            HistorialInmodificableBloqueDto bloque = new HistorialInmodificableBloqueDto(
                    id,
                    fechaOficial,
                    modulo,
                    operacion,
                    ejecutor,
                    ip,
                    detalles,
                    sello == null ? null : sello.actual(),
                    sello == null ? null : sello.anterior(),
                    sello == null ? "NO_VERIFICABLE"
                             : (sello.actual().equals(hashPersistido(sello, aud)) ? "VALIDO" : "ALTERADO"));

            if (sello != null) {
                bloque.setSecuenciaSello(Long.toString(sello.secuencia()));
                bloque.setUsuarioIdSello(aud.getIdUsuario());
                bloque.setFechaSello(aud.getFechaAccion() == null ? null : aud.getFechaAccion().format(
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS", Locale.ROOT)));
                bloque.setAccionSello(aud.getAccion());
            }

            resultado.add(bloque);
        }

        return resultado;
    }

    private boolean cumpleFiltros(HistorialInmodificableBloqueDto b,
            String modulo, String ejecutor, String fecha,
            String fechaInicio, String fechaFin, String busqueda) {
        if (modulo != null && !modulo.isBlank() && !modulo.equalsIgnoreCase("TODOS")) {
            if (!b.getModulo().equalsIgnoreCase(modulo.trim())) {
                return false;
            }
        }

        if (ejecutor != null && !ejecutor.isBlank()) {
            String term = ejecutor.trim().toLowerCase();
            String ejecutorReal = (b.getUsuarioEjecutor() != null ? b.getUsuarioEjecutor() : "").toLowerCase();
            if (!ejecutorReal.contains(term)) {
                return false;
            }
        }

        if (fecha != null && !fecha.isBlank()) {
            String fechaTrim = fecha.trim();
            String fechaBloque = (b.getFechaHoraOficial() != null && b.getFechaHoraOficial().length() >= 10)
                    ? b.getFechaHoraOficial().substring(0, 10)
                    : "";
            if (!fechaBloque.equals(fechaTrim)) {
                return false;
            }
        }

        if (fechaInicio != null && !fechaInicio.isBlank()) {
            String fechaBloque = (b.getFechaHoraOficial() != null && b.getFechaHoraOficial().length() >= 10)
                    ? b.getFechaHoraOficial().substring(0, 10)
                    : "";
            if (fechaBloque.compareTo(fechaInicio.trim()) < 0) {
                return false;
            }
        }

        if (fechaFin != null && !fechaFin.isBlank()) {
            String fechaBloque = (b.getFechaHoraOficial() != null && b.getFechaHoraOficial().length() >= 10)
                    ? b.getFechaHoraOficial().substring(0, 10)
                    : "";
            if (fechaBloque.compareTo(fechaFin.trim()) > 0) {
                return false;
            }
        }

        if (busqueda != null && !busqueda.isBlank()) {
            String q = busqueda.trim().toLowerCase();
            String contenido = (b.getIdBloque() + " " + b.getModulo() + " " + b.getOperacionEjecutada() + " " +
                    b.getUsuarioEjecutor() + " " + b.getDetalles() + " " + b.getIpOrigen()).toLowerCase();
            if (!contenido.contains(q)) {
                return false;
            }
        }

        return true;
    }

    public static String inferirModulo(String operacion, String accion) {
        String texto = ((operacion != null ? operacion : "") + " " + (accion != null ? accion : "")).toUpperCase();
        if (texto.contains("EXPULSION") || texto.contains("HU-14") || texto.contains("EXPULS")) {
            return "EXPULSIONES";
        }
        if (texto.contains("EXCEPCIONAL") || texto.contains("HU-06")) {
            return "ING_EXCEPCIONAL";
        }
        if (texto.contains("INTENTO_EXAMEN_INCORRECTO") || texto.contains("HU-09") || texto.contains("INGRESO")
                || texto.contains("ACCESO")) {
            return "CONTROL_INGRESO";
        }
        if (texto.contains("HABILITA") || texto.contains("ESTUDIANTE")) {
            return "HABILITACIONES";
        }
        if (texto.contains("CARGA_MASIVA") || texto.contains("NOMINA")) {
            return "CARGA_MASIVA";
        }
        if (texto.contains("EXAMEN") || texto.contains("AULA") || texto.contains("AMBIENTE")) {
            return "EXAMENES";
        }
        if (texto.contains("INCIDENCIA")) {
            return "INCIDENCIAS";
        }
        if (texto.contains("USUARIO") || texto.contains("ROL") || texto.contains("LOGIN") || texto.contains("SESION")) {
            return "USUARIOS";
        }
        return "SEGURIDAD";
    }

    public static String desglosarOperacion(String accion) {
        if (accion == null || accion.isBlank()) {
            return "OPERACION_CRITICA";
        }
        int inicio = accion.indexOf('[');
        int fin = accion.indexOf(']');
        if (inicio >= 0 && fin > inicio) {
            return accion.substring(inicio + 1, fin).trim();
        }
        return "OPERACION_SISTEMA";
    }

    public static String desglosarEjecutor(String accion) {
        if (accion == null)
            return "";
        String[] partes = accion.split(" \\| ", 4);
        if (partes.length > 0) {
            String valor = extraerPrefijo(partes[0], "ejecutor=");
            if (valor != null && !valor.isBlank() && !valor.equals("-")) {
                return valor;
            }
        }
        return "";
    }

    public static String desglosarIp(String accion) {
        if (accion == null)
            return "";
        String[] partes = accion.split(" \\| ", 4);
        if (partes.length > 2) {
            String valor = extraerPrefijo(partes[2], "ip=");
            if (valor != null && !valor.isBlank() && !valor.equals("-")) {
                return valor;
            }
        }
        return "";
    }

    public static String desglosarDetalles(String accion) {
        if (accion == null)
            return "Operación registrada en auditoría inmutable.";
        String[] partes = accion.split(" \\| ", 4);
        if (partes.length > 3 && !partes[3].isBlank()) {
            return partes[3].trim();
        }
        return accion;
    }

    private static String extraerPrefijo(String segmento, String prefijo) {
        int idx = segmento.indexOf(prefijo);
        if (idx < 0) {
            return null;
        }
        String valor = segmento.substring(idx + prefijo.length()).trim();
        return "-".equals(valor) ? null : valor;
    }
}
