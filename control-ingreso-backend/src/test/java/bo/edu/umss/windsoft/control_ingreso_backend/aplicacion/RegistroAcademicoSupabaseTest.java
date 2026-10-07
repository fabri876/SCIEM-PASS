package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CrearUsuarioDto;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Pruebas optativas contra la BD local configurada. Las escrituras se revierten;
 * auditoría se simula porque usa REQUIRES_NEW. Las secuencias pueden avanzar. */
@EnabledIfSystemProperty(named = "supabase.integration", matches = "true")
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@Transactional
class RegistroAcademicoSupabaseTest {
    @Autowired GrupoService grupos;
    @Autowired UsuarioService registros;
    @Autowired HorarioImportacionService importador;
    @Autowired AsignaturaRepository asignaturas;
    @Autowired GrupoRepository grupoRepository;
    @Autowired DocenteRepository docentes;
    @Autowired EstudianteRepository estudiantes;
    @Autowired UsuarioRepository usuarios;
    @Autowired AdminRepository administradores;
    @Autowired DocenteGrupoRepository docenteGrupos;
    @Autowired EstudianteGrupoRepository estudianteGrupos;
    @Autowired DocenteAsignaturaRepository docenteAsignaturas;
    @MockitoBean AuditoriaService auditoria;

    @BeforeEach void autenticar() {
        Usuario admin = usuarios.findById(administradores.findAll().getFirst().getIdusuario()).orElseThrow();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(admin.getCorreousuario(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
    }
    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }

    @Test void guardaPersonaYVariosGruposConRelacionCompatibleConExamenes() {
        Integer idMateria = asignaturas.findAll().getFirst().getIdAsignatura();
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        var g1 = grupos.crearGrupo(idMateria, "QA-" + sufijo + "-A", null);
        var g2 = grupos.crearGrupo(idMateria, "QA-" + sufijo + "-B", null);
        var dto = new CrearUsuarioDto(); dto.setNombre("Prueba"); dto.setApellido("Temporal");
        dto.setCi("QA" + sufijo); dto.setCorreo("qa-" + sufijo + "@example.test"); dto.setRol("DOCENTE");
        int sis = 100_000_000 + Math.abs(sufijo.hashCode() % 800_000_000);
        dto.setCodigoSis(sis); dto.setIdGrupos(List.of(g1.getIdGrupo(), g2.getIdGrupo()));
        var registrado = registros.crear(dto, SecurityContextHolder.getContext().getAuthentication().getName(), "127.0.0.1");
        assertTrue(docenteGrupos.existsByIdUsuarioAndIdGrupo(registrado.getIdUsuario(), g1.getIdGrupo()));
        assertTrue(docenteGrupos.existsByIdUsuarioAndIdGrupo(registrado.getIdUsuario(), g2.getIdGrupo()));
        assertTrue(docenteAsignaturas.existsById(new DocenteAsignaturaId(registrado.getIdUsuario(), sis, idMateria)));
        assertEquals(1, docenteAsignaturas.findByIdIdusuario(registrado.getIdUsuario()).size());
        Estudiante estudiante = estudiantes.findAll().getFirst();
        grupos.vincularUsuario(estudiante.getIdusuario(), "ESTUDIANTE", List.of(g1.getIdGrupo(), g2.getIdGrupo()));
        assertTrue(estudianteGrupos.existsByIdUsuarioAndIdGrupo(estudiante.getIdusuario(), g2.getIdGrupo()));
        grupoRepository.flush();
    }

    @Test void importaHorarioRealDosVecesSinDuplicarNiCrearPersonas() throws Exception {
        String ruta = System.getProperty("horario.test.pdf"); Assumptions.assumeTrue(ruta != null);
        var archivo = new MockMultipartFile("archivo", "horario.pdf", "application/pdf", Files.readAllBytes(Path.of(ruta)));
        long personasAntes = usuarios.count();
        var preview = importador.previsualizar(archivo);
        var primera = importador.confirmarAutomaticamente(archivo);
        grupoRepository.flush();
        long materias = asignaturas.count(), cantidadGrupos = grupoRepository.count();
        var segunda = importador.confirmarAutomaticamente(archivo);
        grupoRepository.flush();
        assertTrue(preview.filas().size() > 0);
        assertEquals(0, segunda.gruposCreados());
        assertEquals(0, segunda.asignaturasCreadas()); assertEquals(0, segunda.gruposCreados());
        assertEquals(materias, asignaturas.count()); assertEquals(cantidadGrupos, grupoRepository.count());
        assertEquals(personasAntes, usuarios.count());
    }
}
