package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaSemestre;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

/** Optativa: todas las escrituras se revierten al finalizar cada prueba. */
@EnabledIfSystemProperty(named="supabase.integration", matches="true")
@SpringBootTest(properties={"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off", "spring.jpa.hibernate.ddl-auto=none"})
@ActiveProfiles("local")
@Transactional
class SemestresIntegracionTest {
    @Autowired SemestreService servicio;
    @Autowired SemestreRepository repo;
    @Autowired GrupoRepository grupos;
    @Autowired JdbcTemplate jdbc;
    @Autowired PdfSemestreService pdf;
    @Autowired GrupoService vinculaciones;
    @Autowired UsuarioService registros;
    @org.springframework.test.context.bean.override.mockito.MockitoBean AuditoriaService auditoria;

    @org.junit.jupiter.api.AfterEach void limpiarSesion() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test void cambiaDocenteAgregaGrupoYRegistraDocenteNuevoEn2027GuardandoPdfAnterior() throws Exception {
        var actual = repo.actual(false);
        var anteriores = repo.filasActuales();
        var objetivo = anteriores.stream().filter(f -> !f.docentes().isEmpty()).findFirst().orElseThrow();
        var docentesDisponibles = repo.docentes();
        var otro = docentesDisponibles.stream().filter(d -> !objetivo.docentes().contains(d.nombre()+" "+d.apellido()))
                .filter(d -> docentesDisponibles.stream().filter(p -> (p.nombre()+" "+p.apellido()).equals(d.nombre()+" "+d.apellido())).count()==1)
                .findFirst().orElseThrow();
        String sufijo = java.util.UUID.randomUUID().toString().substring(0,8);
        String nombreNuevo = "Docente Prueba";
        String apellidoNuevo = "Semestre " + sufijo;
        String grupoNuevo = ("QA-" + sufijo).toUpperCase(java.util.Locale.ROOT);
        var siguientes = new java.util.ArrayList<>(anteriores);
        siguientes.set(siguientes.indexOf(objetivo),new FilaSemestre(objetivo.codigo(),objetivo.asignatura(),objetivo.grupo(),List.of(otro.nombre()+" "+otro.apellido())));
        siguientes.add(new FilaSemestre(objetivo.codigo(),objetivo.asignatura(),grupoNuevo,List.of(nombreNuevo+" "+apellidoNuevo)));
        String periodo = "1-"+(actual.anio()+1);
        var archivo = new MockMultipartFile("archivo","nuevo-semestre.pdf","application/pdf",pdf.generar(periodo,siguientes,false));
        long cuentasAntes = jdbc.queryForObject("SELECT count(*) FROM usuario",Long.class);

        var previa = servicio.previsualizar(periodo,archivo);
        assertTrue(previa.diferencias().stream().anyMatch(d -> d.codigo().equals(objetivo.codigo()) && d.grupo().equals(objetivo.grupo()) && d.tipo().equals("CAMBIO_DOCENTE")));
        assertTrue(previa.diferencias().stream().anyMatch(d -> d.grupo().equals(grupoNuevo) && d.tipo().equals("GRUPO_NUEVO")));
        assertTrue(previa.avisos().stream().anyMatch(a -> a.contains(apellidoNuevo)));
        servicio.abrir(periodo,"Prueba integral con rollback",archivo,previa.confirmacion());

        assertEquals(periodo,repo.actual(false).nombre());
        assertEquals(anteriores,repo.filas(actual.id()));
        assertEquals(cuentasAntes,jdbc.queryForObject("SELECT count(*) FROM usuario",Long.class));
        var pendiente = repo.filasActuales().stream().filter(f -> f.grupo().equals(grupoNuevo)).findFirst().orElseThrow();
        assertTrue(pendiente.docentes().isEmpty(),"El PDF no crea cuentas para nombres desconocidos");
        assertEquals(List.of(otro.nombre()+" "+otro.apellido()),repo.filasActuales().stream().filter(f -> f.codigo().equals(objetivo.codigo()) && f.grupo().equals(objetivo.grupo())).findFirst().orElseThrow().docentes());
        byte[] guardado = repo.pdf(actual.id(),false);
        assertNotNull(guardado);
        assertArrayEquals(guardado,servicio.descargar(actual.id(),false));
        try(var documento=org.apache.pdfbox.Loader.loadPDF(guardado)){
            String texto=new org.apache.pdfbox.text.PDFTextStripper().getText(documento);
            assertTrue(texto.contains(actual.nombre()));assertFalse(texto.contains("DATOS SIMULADOS"));
        }
        assertArrayEquals(archivo.getBytes(),repo.pdf(repo.actual(false).id(),true));
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("qa@example.test",null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
        var grupo = grupos.findAll().stream().filter(g -> g.getNombreGrupo().equals(grupoNuevo)).findFirst().orElseThrow();
        var dto = new bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CrearUsuarioDto();
        dto.setNombre(nombreNuevo);dto.setApellido(apellidoNuevo);dto.setCi(("QA"+sufijo).toUpperCase(java.util.Locale.ROOT));dto.setCorreo("qa-semestre-"+sufijo+"@example.test");dto.setRol("DOCENTE");
        dto.setCodigoSis(100_000_000+Math.floorMod(sufijo.hashCode(),800_000_000));dto.setIdGrupos(List.of(grupo.getIdGrupo()));
        var creado = registros.crear(dto,null,"127.0.0.1");
        assertEquals(cuentasAntes+1,jdbc.queryForObject("SELECT count(*) FROM usuario",Long.class));
        assertTrue(servicio.listado(repo.actual(false).id()).stream().anyMatch(f -> f.ci().equals(dto.getCi()) && f.grupo().equals(grupoNuevo)));
        assertFalse(servicio.listado(actual.id()).stream().anyMatch(f -> f.ci().equals(dto.getCi())));
        assertEquals(anteriores,repo.filas(actual.id()));
        assertNotNull(creado.getIdUsuario());
    }

    @Test void cambioConservaElPasadoYRenuevaInclusoLosGruposSinCambios() {
        var anterior = repo.actual(false);
        var filas = repo.filasActuales();
        var listado = repo.listadoActual();
        long cuentas = jdbc.queryForObject("SELECT count(*) FROM usuario", Long.class);
        var anteriores = grupos.findAll().stream().map(g -> g.getIdGrupo()).toList();
        String nuevo = "1-" + (anterior.anio()+1);
        var previa = servicio.previsualizar(nuevo, null);
        assertTrue(previa.diferencias().stream().allMatch(d -> d.tipo().equals("SIN_CAMBIOS")));
        servicio.abrir(nuevo, "Prueba con rollback", null, previa.confirmacion());
        assertEquals("FINALIZADO", repo.obtener(anterior.id()).estado());
        assertEquals(filas, repo.filas(anterior.id()));
        assertEquals(listado,repo.listado(anterior.id()));
        assertEquals(filas.size(), repo.filasActuales().size());
        assertTrue(grupos.findAll().stream().noneMatch(g -> anteriores.contains(g.getIdGrupo())));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM estudiantegrupo WHERE idsemestre=semestre_actual_id()", Integer.class));
        assertEquals(cuentas, jdbc.queryForObject("SELECT count(*) FROM usuario", Long.class));
        assertNotNull(servicio.descargar(anterior.id(), false));
    }
    @Test void importaPdfHistoricoSinCrearCuentasNiModificarCatalogoActual() {
        var actual = repo.actual(false);
        var antes = repo.filasActuales();
        var filas = List.of(new FilaSemestre("8888888", "Asignatura temporal", "1", List.of("Persona ficticia")));
        byte[] bytes = pdf.generar("1-2001", filas, true);
        var archivo = new MockMultipartFile("archivo", "ejemplo.pdf", "application/pdf", bytes);
        servicio.historico("1-2001", "Solo prueba", archivo);
        assertEquals(actual, repo.actual(false));
        assertEquals(antes, repo.filasActuales());
        assertEquals(filas, servicio.leer(archivo));
    }
    @Test void confirmacionIncorrectaNoCierraElSemestre() {
        var actual = repo.actual(false);
        assertThrows(RuntimeException.class, () -> servicio.abrir("1-"+(actual.anio()+1), "", null, "incorrecto"));
        assertEquals(actual, repo.actual(false));
    }
    @Test void permiteReinscribirLaMismaCuentaEnOtroSemestreSinPerderSuInscripcionAnterior() {
        var inscripciones = jdbc.queryForList("SELECT eg.idusuario,eg.codsisestudiante,g.idasignatura,g.nombregrupo FROM estudiantegrupo eg JOIN grupo g USING(idgrupo) WHERE g.idsemestre=semestre_actual_id() LIMIT 1");
        org.junit.jupiter.api.Assumptions.assumeFalse(inscripciones.isEmpty());
        var eg = inscripciones.getFirst();
        int usuario = ((Number)eg.get("idusuario")).intValue();
        int sis = ((Number)eg.get("codsisestudiante")).intValue();
        int asignatura = ((Number)eg.get("idasignatura")).intValue();
        int anterior = repo.actual(false).id();
        String nuevo = "1-"+(repo.actual(false).anio()+1);
        var previa = servicio.previsualizar(nuevo,null);
        servicio.abrir(nuevo,"",null,previa.confirmacion());
        var grupo = grupos.findByIdAsignaturaAndNombreGrupoIgnoreCase(asignatura,(String)eg.get("nombregrupo")).orElseThrow();
        vinculaciones.inscribirEstudianteAGrupo(usuario,sis,grupo.getIdGrupo());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM estudiantegrupo WHERE idusuario=? AND idasignatura=? AND idsemestre=?",Integer.class,usuario,asignatura,anterior));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM estudiantegrupo WHERE idusuario=? AND idasignatura=? AND idsemestre=semestre_actual_id()",Integer.class,usuario,asignatura));
        int otro = repo.nuevoGrupo(asignatura,"QA-OTRO");
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update("INSERT INTO estudiantegrupo(idusuario,codsisestudiante,idgrupo) VALUES (?,?,?)",usuario,sis,otro));
    }
    @Test void laBaseDeDatosRechazaModificarUnGrupoHistorico() {
        var anterior = grupos.findAll().getFirst();
        String nuevo = "1-"+(repo.actual(false).anio()+1);
        var previa = servicio.previsualizar(nuevo,null);
        servicio.abrir(nuevo,"",null,previa.confirmacion());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update("UPDATE grupo SET nombregrupo='NO' WHERE idgrupo=?",anterior.getIdGrupo()));
    }
}
