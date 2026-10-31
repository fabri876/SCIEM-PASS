package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HorarioImportacionDto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.text.Normalizer;
import java.util.*;
import java.io.IOException;

/** El horario importa exclusivamente el catálogo; las personas se vinculan al registrarlas. */
@Service
public class HorarioImportacionService {
    private final LectorHorarioPdf lector;
    private final AsignaturaRepository asignaturas;
    private final GrupoRepository grupos;
    private final HorarioCatalogoJdbcRepository escritura;
    private ClasificacionAcademicaRepository clasificacion;

    @org.springframework.beans.factory.annotation.Autowired
    public HorarioImportacionService(LectorHorarioPdf lector, AsignaturaRepository asignaturas, GrupoRepository grupos,
                                     HorarioCatalogoJdbcRepository escritura, ClasificacionAcademicaRepository clasificacion) {
        this(lector,asignaturas,grupos,escritura); this.clasificacion=clasificacion;
    }

    public HorarioImportacionService(LectorHorarioPdf lector, AsignaturaRepository asignaturas, GrupoRepository grupos,
                                     HorarioCatalogoJdbcRepository escritura) {
        this.lector = lector; this.asignaturas = asignaturas; this.grupos = grupos;
        this.escritura = escritura;
    }

    @Transactional(readOnly = true)
    public VistaPrevia previsualizar(MultipartFile archivo) {
        var catalogo = asignaturas.findAll();
        var filas = leerCatalogo(archivo).stream().map(f -> {
            var existente = resolverMateria(f, catalogo);
            return new Fila(f.codigoAsignatura(), f.nombreAsignatura(), f.nombreGrupo(), existente == null ? null : existente.getIdAsignatura());
        }).toList();
        var contexto=contexto(archivo);
        return new VistaPrevia(filas,contexto==null?null:contexto.carrera(),contexto==null?null:contexto.gestion());
    }

    @Transactional
    public Resultado confirmarAutomaticamente(MultipartFile archivo) {
        var filas = leerCatalogo(archivo);
        var contexto=contexto(archivo);
        List<Asignatura> catalogo = new ArrayList<>(asignaturas.findAll());
        Set<Integer> idsPrevios = new HashSet<>();
        catalogo.forEach(a -> idsPrevios.add(a.getIdAsignatura()));
        Map<String, Grupo> existentes = new HashMap<>();
        // Una lectura del catálogo de grupos evita consultas repetidas por cada fila del PDF.
        for (var g : grupos.findAll()) existentes.put(clave(g.getIdAsignatura(), g.getNombreGrupo()), g);
        int nuevasAsignaturas = 0, nuevosGrupos = 0;
        Set<Integer> materiasPrevias = new HashSet<>();
        List<Existente> detalleMaterias = new ArrayList<>(), detalleGrupos = new ArrayList<>();
        int gruposPrevios = 0;
        List<Asignatura> nuevas = new ArrayList<>(), codigos = new ArrayList<>();
        List<Grupo> pendientes = new ArrayList<>();
        Set<Integer> codigosActualizados = new HashSet<>();
        for (var fila : filas) {
            Asignatura materia = resolverMateria(fila, catalogo);
            if (materia == null) {
                materia = new Asignatura(); materia.setIdAsignatura(nuevoId(fila.codigoAsignatura(), catalogo));
                materia.setNombreAsignatura(fila.nombreAsignatura()); materia.setCodigoOficial(String.valueOf(fila.codigoAsignatura()));
                nuevas.add(materia); catalogo.add(materia); nuevasAsignaturas++;
            } else {
                if (idsPrevios.contains(materia.getIdAsignatura()) && materiasPrevias.add(materia.getIdAsignatura()))
                    detalleMaterias.add(new Existente(String.valueOf(fila.codigoAsignatura()),materia.getNombreAsignatura(),null));
                if (materia.getCodigoOficial() == null && codigosActualizados.add(materia.getIdAsignatura())) {
                    var actualizada = new Asignatura(); actualizada.setIdAsignatura(materia.getIdAsignatura());
                    actualizada.setCodigoOficial(String.valueOf(fila.codigoAsignatura())); codigos.add(actualizada);
                }
            }
            String clave = clave(materia.getIdAsignatura(), fila.nombreGrupo());
            Grupo grupo = existentes.get(clave);
            if (grupo == null) {
                grupo = new Grupo(materia.getIdAsignatura(), fila.nombreGrupo(), null); pendientes.add(grupo);
                existentes.put(clave, grupo); nuevosGrupos++;
            } else if (!Boolean.TRUE.equals(grupo.getEstadoGrupo())) {
                throw new SolicitudInvalidaException("El grupo " + fila.nombreGrupo() + " está inactivo. Revíselo antes de importar.");
            } else {
                gruposPrevios++;
                detalleGrupos.add(new Existente(String.valueOf(fila.codigoAsignatura()),materia.getNombreAsignatura(),grupo.getNombreGrupo()));
            }
        }
        escritura.guardar(nuevas, codigos, pendientes);
        if(clasificacion!=null && contexto!=null) {
            var nombre=archivo.getOriginalFilename();
            String plan=nombre!=null && nombre.matches("[0-9]{6}\\.pdf") ? nombre.substring(0,6) : null;
            clasificacion.clasificar(contexto,plan);
        }
        return new Resultado(nuevasAsignaturas, nuevosGrupos, materiasPrevias.size(), gruposPrevios,detalleMaterias,detalleGrupos);
    }

    private ClasificacionHorario contexto(MultipartFile archivo) {
        if(clasificacion==null) return null;
        try {
            var datos=lector.leerClasificacion(archivo.getBytes());
            if(datos!=null && datos.gestion()!=null && !datos.gestion().equals(clasificacion.gestionActual()))
                throw new SolicitudInvalidaException("El horario es de "+datos.gestion()+" y no del semestre actual. Cambie de semestre antes de importar.");
            return datos;
        } catch(IOException ex) {throw new SolicitudInvalidaException("No se pudo leer el horario.");}
    }

    private String clave(Integer materia, String grupo) { return materia + ":" + grupo.trim().toUpperCase(Locale.ROOT); }

    private record MateriaGrupo(Integer codigoAsignatura, String nombreAsignatura, String nombreGrupo) {}

    private List<MateriaGrupo> leerCatalogo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty() || archivo.getSize() > 10 * 1024 * 1024
                || archivo.getOriginalFilename() == null || !archivo.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".pdf"))
            throw new SolicitudInvalidaException("Seleccione un horario PDF de hasta 10 MB.");
        try {
            Map<String, MateriaGrupo> unicas = new LinkedHashMap<>();
            Map<Integer, String> nombres = new HashMap<>();
            for (var f : lector.leer(archivo.getBytes())) {
                String nombrePrevio = nombres.putIfAbsent(f.codigoAsignatura(), normalizar(f.nombreAsignatura()));
                if (nombrePrevio != null && !nombrePrevio.equals(normalizar(f.nombreAsignatura())))
                    throw new SolicitudInvalidaException("El horario contiene nombres contradictorios para el código " + f.codigoAsignatura());
                // Desechar nombres y tipo de personal antes de deduplicar el catálogo.
                var materiaGrupo = new MateriaGrupo(f.codigoAsignatura(), f.nombreAsignatura(), f.nombreGrupo().trim().toUpperCase(Locale.ROOT));
                String clave = clave(f.codigoAsignatura(), f.nombreGrupo());
                var anterior = unicas.putIfAbsent(clave, materiaGrupo);
                if (anterior != null && !normalizar(anterior.nombreAsignatura()).equals(normalizar(f.nombreAsignatura())))
                    throw new SolicitudInvalidaException("El horario contiene nombres contradictorios para el código " + f.codigoAsignatura());
            }
            return new ArrayList<>(unicas.values());
        } catch (IOException ex) { throw new SolicitudInvalidaException("No se pudo leer el archivo."); }
    }

    static String normalizar(String valor) {
        if (valor == null) return "";
        return Normalizer.normalize(valor, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", " ").trim();
    }

    private Integer nuevoId(Integer preferido, List<Asignatura> catalogo) {
        Set<Integer> ocupados = new HashSet<>();
        catalogo.forEach(a -> ocupados.add(a.getIdAsignatura()));
        if (!ocupados.contains(preferido)) return preferido;
        int candidato = 1;
        while (ocupados.contains(candidato)) candidato = Math.incrementExact(candidato);
        return candidato;
    }

    private Asignatura resolverMateria(MateriaGrupo fila, List<Asignatura> catalogo) {
        String codigo = String.valueOf(fila.codigoAsignatura());
        // El nombre es descriptivo: nunca identifica ni fusiona asignaturas.
        List<Asignatura> porCodigo = catalogo.stream()
                .filter(a -> codigo.equals(a.getCodigoOficial())).toList();
        if (porCodigo.size() > 1) throw new SolicitudInvalidaException("El código oficial coincide con dos materias del catálogo. Revise " + codigo);
        Asignatura existente = porCodigo.isEmpty() ? null : porCodigo.getFirst();
        // Compatibilidad con registros antiguos cuyo ID ya era el código oficial.
        if (existente == null) existente = catalogo.stream()
                .filter(a -> a.getCodigoOficial() == null && fila.codigoAsignatura().equals(a.getIdAsignatura()))
                .findFirst().orElse(null);
        if (existente != null && (!normalizar(existente.getNombreAsignatura()).equals(normalizar(fila.nombreAsignatura()))
                || (existente.getCodigoOficial() != null && !codigo.equals(existente.getCodigoOficial()))))
            throw new SolicitudInvalidaException("El código o nombre de " + fila.nombreAsignatura() + " entra en conflicto con el catálogo. Revíselo antes de importar.");
        return existente;
    }
}
