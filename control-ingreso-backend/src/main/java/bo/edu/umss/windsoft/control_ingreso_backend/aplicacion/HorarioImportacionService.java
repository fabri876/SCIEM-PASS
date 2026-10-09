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

    public HorarioImportacionService(LectorHorarioPdf lector, AsignaturaRepository asignaturas, GrupoRepository grupos) {
        this.lector = lector; this.asignaturas = asignaturas; this.grupos = grupos;
    }

    @Transactional(readOnly = true)
    public VistaPrevia previsualizar(MultipartFile archivo) {
        var catalogo = asignaturas.findAll();
        var filas = leerCatalogo(archivo).stream().map(f -> {
            var existente = resolverMateria(f, catalogo);
            return new Fila(f.codigoAsignatura(), f.nombreAsignatura(), f.nombreGrupo(), existente == null ? null : existente.getIdAsignatura());
        }).toList();
        return new VistaPrevia(filas);
    }

    @Transactional
    public Resultado confirmarAutomaticamente(MultipartFile archivo) {
        var filas = leerCatalogo(archivo);
        List<Asignatura> catalogo = new ArrayList<>(asignaturas.findAll());
        Set<Integer> idsPrevios = new HashSet<>();
        catalogo.forEach(a -> idsPrevios.add(a.getIdAsignatura()));
        Map<String, Grupo> existentes = new HashMap<>();
        // Una lectura del catálogo de grupos evita consultas repetidas por cada fila del PDF.
        for (var g : grupos.findAll()) existentes.put(clave(g.getIdAsignatura(), g.getNombreGrupo()), g);
        int nuevasAsignaturas = 0, nuevosGrupos = 0;
        Set<Integer> materiasPrevias = new HashSet<>();
        int gruposPrevios = 0;
        for (var fila : filas) {
            Asignatura materia = resolverMateria(fila, catalogo);
            if (materia == null) {
                materia = new Asignatura(); materia.setIdAsignatura(fila.codigoAsignatura());
                materia.setNombreAsignatura(fila.nombreAsignatura()); materia.setCodigoOficial(String.valueOf(fila.codigoAsignatura()));
                materia = asignaturas.save(materia); catalogo.add(materia); nuevasAsignaturas++;
            } else {
                if (idsPrevios.contains(materia.getIdAsignatura())) materiasPrevias.add(materia.getIdAsignatura());
                if (materia.getCodigoOficial() == null) {
                    materia.setCodigoOficial(String.valueOf(fila.codigoAsignatura())); asignaturas.save(materia);
                }
            }
            String clave = clave(materia.getIdAsignatura(), fila.nombreGrupo());
            Grupo grupo = existentes.get(clave);
            if (grupo == null) {
                grupo = grupos.save(new Grupo(materia.getIdAsignatura(), fila.nombreGrupo(), null));
                existentes.put(clave, grupo); nuevosGrupos++;
            } else if (!Boolean.TRUE.equals(grupo.getEstadoGrupo())) {
                throw new SolicitudInvalidaException("El grupo " + fila.nombreGrupo() + " está inactivo. Revíselo antes de importar.");
            } else {
                gruposPrevios++;
            }
        }
        return new Resultado(nuevasAsignaturas, nuevosGrupos, materiasPrevias.size(), gruposPrevios);
    }

    private String clave(Integer materia, String grupo) { return materia + ":" + grupo.trim().toUpperCase(Locale.ROOT); }

    private record MateriaGrupo(Integer codigoAsignatura, String nombreAsignatura, String nombreGrupo) {}

    private List<MateriaGrupo> leerCatalogo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty() || archivo.getSize() > 10 * 1024 * 1024
                || archivo.getOriginalFilename() == null || !archivo.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".pdf"))
            throw new SolicitudInvalidaException("Seleccione un horario PDF de hasta 10 MB.");
        try {
            Map<String, MateriaGrupo> unicas = new LinkedHashMap<>();
            for (var f : lector.leer(archivo.getBytes())) {
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

    private Asignatura resolverMateria(MateriaGrupo fila, List<Asignatura> catalogo) {
        String codigo = String.valueOf(fila.codigoAsignatura());
        List<Asignatura> porCodigo = catalogo.stream().filter(a -> codigo.equals(a.getCodigoOficial())
                || fila.codigoAsignatura().equals(a.getIdAsignatura())).distinct().toList();
        if (porCodigo.size() > 1) throw new SolicitudInvalidaException("El código oficial coincide con dos materias del catálogo. Revise " + codigo);
        Asignatura existente = porCodigo.isEmpty() ? null : porCodigo.getFirst();
        if (existente == null) {
            var porNombre = catalogo.stream().filter(a -> normalizar(a.getNombreAsignatura()).equals(normalizar(fila.nombreAsignatura()))).toList();
            if (porNombre.size() > 1) throw new SolicitudInvalidaException("Hay varias materias con el nombre " + fila.nombreAsignatura() + ". Revise el catálogo antes de importar.");
            existente = porNombre.isEmpty() ? null : porNombre.getFirst();
        }
        if (existente != null && (!normalizar(existente.getNombreAsignatura()).equals(normalizar(fila.nombreAsignatura()))
                || (existente.getCodigoOficial() != null && !codigo.equals(existente.getCodigoOficial()))))
            throw new SolicitudInvalidaException("El código o nombre de " + fila.nombreAsignatura() + " entra en conflicto con el catálogo. Revíselo antes de importar.");
        return existente;
    }
}
