package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IncidenciaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ReintentoConcurrencia;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AmbienteControlDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CatalogosIncidenciaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CerrarIncidenciaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ConsultaEstudianteDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ContadorDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaDetalleDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IncidenciaListaDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/**
 * HU06 · Incidencias.
 * - catalogos, ambientes, estudiante y POST: DOCENTE, ADMINISTRADOR y OPERADOR.
 * - Todo lo demás: solo DOCENTE (de la materia) y ADMINISTRADOR.
 * (ver SecurityConfig; la materia se valida en el servicio).
 */
@RestController
@RequestMapping("/api/incidencias")
public class IncidenciaController {

    private final IncidenciaService incidenciaService;
    private final IngresoExcepcionalService ingresoExcepcionalService;
    private final AmbienteExamenService ambienteExamenService;
    private final ContextoUsuarioService contextoUsuarioService;

    public IncidenciaController(IncidenciaService incidenciaService,
                                IngresoExcepcionalService ingresoExcepcionalService,
                                AmbienteExamenService ambienteExamenService,
                                ContextoUsuarioService contextoUsuarioService) {
        this.incidenciaService = incidenciaService;
        this.ingresoExcepcionalService = ingresoExcepcionalService;
        this.ambienteExamenService = ambienteExamenService;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @GetMapping("/catalogos")
    public ResponseEntity<CatalogosIncidenciaDto> catalogos() {
        return ResponseEntity.ok(incidenciaService.catalogos());
    }

    /** Aulas de los exámenes del día (o de "fecha") que el usuario puede operar. */
    @GetMapping("/ambientes")
    public ResponseEntity<List<AmbienteControlDto>> ambientesDelDia(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            HttpServletRequest request) {
        return ResponseEntity.ok(ambienteExamenService.listarDelDia(contextoUsuarioService.actual(), fecha, false,
                ClientIpResolver.resolver(request)));
    }

    /**
     * Aulas de todos los exámenes asignados al usuario que ya se tomaron o se
     * toman hoy (más recientes primero). Es la lista para registrar o revisar
     * incidencias, que se pueden cargar después del examen.
     */
    @GetMapping("/aulas-asignadas")
    public ResponseEntity<List<AmbienteControlDto>> aulasAsignadas(HttpServletRequest request) {
        return ResponseEntity.ok(ambienteExamenService.listarAsignadas(contextoUsuarioService.actual(),
                ClientIpResolver.resolver(request)));
    }

    /** Estudiante involucrado: nombre y si ya ingresó, o estado NO_ENCONTRADO. */
    @GetMapping("/estudiante")
    public ResponseEntity<ConsultaEstudianteDto> buscarEstudiante(@RequestParam Integer idAmbiente,
                                                                  @RequestParam String q,
                                                                  HttpServletRequest request) {
        return ResponseEntity.ok(ingresoExcepcionalService.consultar(idAmbiente, q, true,
                ClientIpResolver.resolver(request)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidenciaDetalleDto> registrar(
            @RequestParam String claveSolicitud,
            @RequestParam Integer idAmbiente,
            @RequestParam String tipo,
            @RequestParam String severidad,
            @RequestParam String accion,
            @RequestParam(required = false) Double puntajeReducir,
            @RequestParam String descripcion,
            @RequestParam(required = false) String detalleTipoOtro,
            @RequestParam(required = false) String detalleAccionOtro,
            @RequestParam(required = false) Integer codSisEstudiante,
            @RequestParam(defaultValue = "false") boolean retirarEstudiante,
            @RequestParam(required = false) MultipartFile evidencia,
            HttpServletRequest request) {
        if (claveSolicitud == null || claveSolicitud.isBlank()
                || idAmbiente == null
                || tipo == null || tipo.isBlank()
                || severidad == null || severidad.isBlank()
                || accion == null || accion.isBlank()
                || descripcion == null || descripcion.isBlank()) {
            throw new SolicitudInvalidaException(
                    "Faltan campos obligatorios: claveSolicitud, idAmbiente, tipo, severidad, accion y descripcion son requeridos.");
        }

        // Reintento de concurrencia para la operacion de registro de incidencia.

        IncidenciaDetalleDto respuesta = ReintentoConcurrencia.ejecutar("registro-incidencia",
                () -> incidenciaService.registrar(claveSolicitud, idAmbiente, tipo, severidad, accion,
                        puntajeReducir, descripcion, detalleTipoOtro, detalleAccionOtro,
                        codSisEstudiante, retirarEstudiante, evidencia,
                        ClientIpResolver.resolver(request)));
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    @PostMapping(value = "/{id}/evidencia", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidenciaDetalleDto> adjuntarEvidencia(
            @PathVariable Integer id,
            @RequestParam MultipartFile evidencia,
            HttpServletRequest request) {
        IncidenciaDetalleDto respuesta = incidenciaService.adjuntarEvidencia(id, evidencia,
                ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping
    public ResponseEntity<IncidenciaListaDto> listar(@RequestParam(required = false) Integer idExamen,
                                                     @RequestParam(required = false) Integer idAmbiente,
                                                     @RequestParam(required = false) Integer idAsignatura,
                                                     @RequestParam(required = false) String tipo,
                                                     @RequestParam(required = false) String estado,
                                                     HttpServletRequest request) {
        return ResponseEntity.ok(incidenciaService.listar(idExamen, idAmbiente, idAsignatura, tipo, estado,
                ClientIpResolver.resolver(request)));
    }

    @GetMapping("/exportar")
    public ResponseEntity<byte[]> exportar(@RequestParam(required = false) Integer idExamen,
                                           @RequestParam(required = false) Integer idAmbiente,
                                           @RequestParam(required = false) Integer idAsignatura,
                                           @RequestParam(required = false) String tipo,
                                           @RequestParam(required = false) String estado,
                                           @RequestParam(defaultValue = "false") boolean soloExpulsiones,
                                           HttpServletRequest request) {
        byte[] archivo = incidenciaService.exportarExcel(idExamen, idAmbiente, idAsignatura, tipo, estado,
                soloExpulsiones, ClientIpResolver.resolver(request));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"incidencias.xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(archivo);
    }

    @GetMapping("/abiertas/total")
    public ResponseEntity<ContadorDto> totalAbiertas(HttpServletRequest request) {
        return ResponseEntity.ok(new ContadorDto(incidenciaService.contarAbiertas(ClientIpResolver.resolver(request))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncidenciaDetalleDto> detalle(@PathVariable Integer id, HttpServletRequest request) {
        return ResponseEntity.ok(incidenciaService.detalle(id, ClientIpResolver.resolver(request)));
    }

    @PatchMapping("/{id}/revision")
    public ResponseEntity<IncidenciaDetalleDto> marcarEnRevision(@PathVariable Integer id, HttpServletRequest request) {
        return ResponseEntity.ok(incidenciaService.marcarEnRevision(id, ClientIpResolver.resolver(request)));
    }

    @PatchMapping("/{id}/cierre")
    public ResponseEntity<IncidenciaDetalleDto> cerrar(@PathVariable Integer id,
                                                       @Valid @RequestBody CerrarIncidenciaDto dto,
                                                       HttpServletRequest request) {
        return ResponseEntity.ok(incidenciaService.cerrar(id, dto.resolucion(), ClientIpResolver.resolver(request)));
    }
}
