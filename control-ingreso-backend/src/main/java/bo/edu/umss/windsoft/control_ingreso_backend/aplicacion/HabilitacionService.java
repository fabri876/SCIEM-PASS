package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.MotivoInhabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsociarEstudianteExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class HabilitacionService {

    private final HabilitacionRepository habilitacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final MotivoInhabilitacionRepository motivoInhabilitacionRepository;
    private final EstudianteRepository estudianteRepository;
    private final ExamenRepository examenRepository;

    public HabilitacionService(
            HabilitacionRepository habilitacionRepository,
            UsuarioRepository usuarioRepository,
            MotivoInhabilitacionRepository motivoInhabilitacionRepository,
            EstudianteRepository estudianteRepository,
            ExamenRepository examenRepository) {
        this.habilitacionRepository = habilitacionRepository;
        this.usuarioRepository = usuarioRepository;
        this.motivoInhabilitacionRepository = motivoInhabilitacionRepository;
        this.estudianteRepository = estudianteRepository;
        this.examenRepository = examenRepository;
    }

    @Transactional
    public HabilitacionResponseDto asociarEstudiante(AsociarEstudianteExamenRequest request) {
        var examen = examenRepository.findById(request.idExamen())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el examen."));
        if (!examen.getIdAsignatura().equals(request.idAsignatura())) {
            throw new IllegalArgumentException("La asignatura no corresponde al examen.");
        }
        if (habilitacionRepository.existsByIdAsignaturaAndIdExamenAndEstudianteCodsisestudiante(
                request.idAsignatura(), request.idExamen(), request.codigoSis())) {
            throw new IllegalArgumentException("El estudiante ya está asociado a este examen.");
        }
        var estudiante = estudianteRepository.findByCodsisestudiante(request.codigoSis())
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el estudiante."));
        var h = new Habilitacion();
        h.setEstudiante(estudiante);
        h.setIdAsignatura(request.idAsignatura());
        h.setIdExamen(request.idExamen());
        h.setIdUsuario(estudiante.getIdusuario());
        h.setEstadohabilitacion(request.habilitado() == null || request.habilitado());
        h.setObservacionhabilitacion(request.observacion());
        return mapearADto(habilitacionRepository.save(h));
    }

    @Transactional(readOnly = true)
    public List<HabilitacionResponseDto> obtenerTodas() {
        List<Habilitacion> lista = habilitacionRepository.findAllConDetalles();
        return mapearADtosBatch(lista);
    }

    @Transactional(readOnly = true)
    public List<HabilitacionResponseDto> obtenerPorAsignatura(Integer idAsignatura) {
        List<Habilitacion> lista = habilitacionRepository.findByIdAsignaturaConDetalles(idAsignatura);
        return mapearADtosBatch(lista);
    }

    @Transactional(readOnly = true)
    public HabilitacionResponseDto obtenerPorId(Integer idHabilitacion) {
        Habilitacion habilitacion = habilitacionRepository.findByIdConDetalles(idHabilitacion)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la habilitación con ID: " + idHabilitacion));
        return mapearADto(habilitacion);
    }

    @Transactional
    public HabilitacionResponseDto actualizarHabilitacion(Integer idHabilitacion, HabilitacionRequestDto request) {
        Habilitacion habilitacion = habilitacionRepository.findById(idHabilitacion)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la habilitación con ID: " + idHabilitacion));

        Boolean nuevoEstado = request.resolverEstado();
        if (nuevoEstado != null) {
            habilitacion.setEstadohabilitacion(nuevoEstado);
        }

        String textoMotivo = request.resolverTextoMotivo();
        if (textoMotivo == null && request.getIdMotivo() != null) {
            MotivoInhabilitacion m = motivoInhabilitacionRepository.findById(request.getIdMotivo()).orElse(null);
            if (m != null) {
                textoMotivo = m.getNombremotivo();
            }
        }

        if (Boolean.TRUE.equals(habilitacion.getEstadohabilitacion())) {
            // Si queda habilitado, se limpia el motivo de inhabilitación
            habilitacion.setObservacionhabilitacion(null);
        } else if (textoMotivo != null) {
            habilitacion.setObservacionhabilitacion(textoMotivo);
        }

        Habilitacion guardada = habilitacionRepository.save(habilitacion);
        return mapearADto(guardada);
    }

    @Transactional
    public void eliminarAsociacion(Integer idHabilitacion) {
        if (!habilitacionRepository.existsById(idHabilitacion)) {
            throw new RecursoNoEncontradoException("No se encontró la habilitación con ID: " + idHabilitacion);
        }
        habilitacionRepository.deleteById(idHabilitacion);
    }

    // BUG-007 (QA): "Exportar lista oficial" era 100% decorativo, no había
    // ningún endpoint detrás. Reusa Apache POI, ya en el classpath (lo usa
    // CargaMasivaService para LEER Excel; acá se usa para escribirlo).
    @Transactional(readOnly = true)
    public byte[] exportarExcel(Integer idAsignatura) {
        List<HabilitacionResponseDto> lista = idAsignatura != null
                ? obtenerPorAsignatura(idAsignatura)
                : obtenerTodas();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Lista oficial");

            CellStyle estiloEncabezado = workbook.createCellStyle();
            Font fuenteEncabezado = workbook.createFont();
            fuenteEncabezado.setBold(true);
            estiloEncabezado.setFont(fuenteEncabezado);

            String[] columnas = {"Código SIS", "CI", "Nombre", "Apellido", "Correo", "Estado", "Motivo"};
            Row encabezado = sheet.createRow(0);
            for (int i = 0; i < columnas.length; i++) {
                Cell celda = encabezado.createCell(i);
                celda.setCellValue(columnas[i]);
                celda.setCellStyle(estiloEncabezado);
            }

            int numFila = 1;
            for (HabilitacionResponseDto h : lista) {
                Row fila = sheet.createRow(numFila++);
                fila.createCell(0).setCellValue(h.getCodSisEstudiante() != null ? h.getCodSisEstudiante() : 0);
                fila.createCell(1).setCellValue(valorOr(h.getCiEstudiante()));
                fila.createCell(2).setCellValue(valorOr(h.getNombreEstudiante()));
                fila.createCell(3).setCellValue(valorOr(h.getApellidoEstudiante()));
                fila.createCell(4).setCellValue(valorOr(h.getCorreoEstudiante()));
                fila.createCell(5).setCellValue(valorOr(h.getEstado()));
                fila.createCell(6).setCellValue(valorOr(h.getObservacionHabilitacion()));
            }

            for (int i = 0; i < columnas.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream salida = new ByteArrayOutputStream();
            workbook.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el archivo Excel de la lista oficial.", e);
        }
    }

    private String valorOr(String valor) {
        return valor != null ? valor : "";
    }

    private List<HabilitacionResponseDto> mapearADtosBatch(List<Habilitacion> lista) {
        if (lista == null || lista.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Integer> userIds = lista.stream()
                .filter(h -> h.getEstudiante() != null && h.getEstudiante().getIdUsuario() != null)
                .map(h -> h.getEstudiante().getIdUsuario())
                .collect(Collectors.toSet());

        Map<Integer, Usuario> usuariosMap = userIds.isEmpty() ? Collections.emptyMap() :
                usuarioRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(Usuario::getIdusuario, u -> u, (u1, u2) -> u1));

        return lista.stream()
                .map(h -> {
                    Usuario u = (h.getEstudiante() != null && h.getEstudiante().getIdUsuario() != null)
                            ? usuariosMap.get(h.getEstudiante().getIdUsuario()) : null;
                    return HabilitacionResponseDto.fromEntity(h, u);
                })
                .collect(Collectors.toList());
    }

    private HabilitacionResponseDto mapearADto(Habilitacion h) {
        Usuario u = null;
        if (h.getEstudiante() != null && h.getEstudiante().getIdUsuario() != null) {
            u = usuarioRepository.findById(h.getEstudiante().getIdUsuario()).orElse(null);
        }
        return HabilitacionResponseDto.fromEntity(h, u);
    }
}


