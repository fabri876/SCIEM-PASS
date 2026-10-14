package bo.edu.umss.windsoft.control_ingreso_backend.qa.sprint2.hu06;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AmbienteExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteExamenService.EstadoHabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HoraOficial;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AdminRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.AmbienteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AforoDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

/**
 * Base de las pruebas de integración de la HU06 (QA · sprint 2).
 *
 * - Usan la base de datos real (perfil "local") y solo corren si se activan con
 *   -Dsupabase.integration=true, igual que las pruebas de integración del equipo.
 * - Cada prueba corre dentro de una transacción que se deshace al terminar:
 *   los ingresos, las incidencias y el cambio de fecha del examen NO quedan guardados.
 * - Lo que el sistema guarda en una transacción propia (historial de auditoría)
 *   sí queda; se reconoce por la IP "QA-PRUEBA-INTEGRACION".
 */
@SpringBootTest(properties = {"spring.jpa.show-sql=false", "logging.level.root=ERROR", "spring.main.banner-mode=off"})
@ActiveProfiles("local")
@Transactional
abstract class IntegracionHu06Base {

    protected static final String IP_QA = "QA-PRUEBA-INTEGRACION";

    /** Estudiante real elegido para la prueba. */
    protected record EstudiantePrueba(Integer codSis, Usuario usuario) {
    }

    @Autowired protected AdminRepository adminRepository;
    @Autowired protected UsuarioRepository usuarioRepository;
    @Autowired protected EstudianteRepository estudianteRepository;
    @Autowired protected AmbienteRepository ambienteRepository;
    @Autowired protected ExamenRepository examenRepository;
    @Autowired protected IngresoRepository ingresoRepository;
    @Autowired protected AmbienteExamenService ambienteExamenService;
    @Autowired protected EstudianteExamenService estudianteExamenService;

    protected Usuario admin;

    @BeforeEach
    void iniciarSesionComoAdministrador() {
        Integer idAdmin = adminRepository.findAll().getFirst().getIdusuario();
        admin = usuarioRepository.findById(idAdmin).orElseThrow();
        UsernamePasswordAuthenticationToken sesion = new UsernamePasswordAuthenticationToken(
                admin.getCorreousuario(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")));
        // El sistema obtiene el id del usuario de aquí (igual que el filtro JWT).
        sesion.setDetails(admin.getIdusuario());
        SecurityContextHolder.getContext().setAuthentication(sesion);
    }

    @AfterEach
    void cerrarSesion() {
        SecurityContextHolder.clearContext();
    }

    /**
     * Toma un aula de examen real con capacidad registrada y lugares libres, y la
     * deja "en curso" (fecha de hoy, de 00:00 a 23:59). El cambio se deshace al final.
     */
    protected Ambiente prepararAulaEnCurso() {
        LocalDate hoy = HoraOficial.hoy();
        Ambiente ambiente = ambienteRepository.findAll().stream()
                .filter(a -> {
                    AforoDto aforo = ambienteExamenService.aforo(a.getIdAmbiente());
                    return aforo.capacidad() != null && aforo.ocupados() + 3 <= aforo.capacidad();
                })
                .filter(a -> ambienteRepository.findByIdAulaYFecha(a.getIdAula(), hoy).isEmpty())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "No hay un aula de examen con capacidad libre para preparar la prueba."));

        Examen examen = examenRepository.findById(ambiente.getIdExamen()).orElseThrow();
        examen.setFechaExamen(hoy);
        examenRepository.saveAndFlush(examen);

        ambiente.setHoraInicio(LocalTime.of(0, 0));
        ambiente.setHoraFin(LocalTime.of(23, 59, 59));
        return ambienteRepository.saveAndFlush(ambiente);
    }

    /** Estudiante real que NO está habilitado para el examen del aula y todavía no ingresó. */
    protected EstudiantePrueba estudianteNoHabilitado(Ambiente ambiente, Integer... excluirCodSis) {
        List<Integer> excluir = Arrays.asList(excluirCodSis);
        return estudianteRepository.findAll().stream()
                .filter(e -> !excluir.contains(e.getCodsisestudiante()))
                .filter(e -> estudianteExamenService.habilitacion(e.getCodsisestudiante(), ambiente).estado()
                        != EstadoHabilitacion.HABILITADO)
                .filter(e -> ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                        e.getCodsisestudiante(), ambiente.getIdAsignatura(), ambiente.getIdExamen()).isEmpty())
                .map(e -> usuarioRepository.findById(e.getIdusuario())
                        .map(u -> new EstudiantePrueba(e.getCodsisestudiante(), u))
                        .orElse(null))
                .filter(p -> p != null && p.usuario().getCorreousuario() != null && p.usuario().getCiusuario() != null)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay un estudiante disponible para la prueba."));
    }

    protected String nombre(Usuario u) {
        return (u.getNombreusuario() + " " + u.getApellidousuario()).trim();
    }

    protected String texto(AforoDto aforo) {
        return aforo.ocupados() + "/" + aforo.capacidad() + " · quedan " + aforo.disponibles();
    }

    /** Deja en la consola una línea que sirve como evidencia del test case. */
    protected void evidencia(String tc, String detalle) {
        System.out.println("[EVIDENCIA " + tc + "] " + detalle);
    }
}
