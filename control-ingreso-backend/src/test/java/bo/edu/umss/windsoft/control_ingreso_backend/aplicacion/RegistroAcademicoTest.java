package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CrearUsuarioDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class RegistroAcademicoTest {
    @Mock UsuarioRepository usuarios;
    @Mock AdminRepository admins;
    @Mock DocenteRepository docentes;
    @Mock EstudianteRepository estudiantes;
    @Mock AyudanteRepository ayudantes;
    @Mock GrupoService grupos;
    @Mock EliminacionUsuarioRepository eliminaciones;
    @Mock PasswordEncoder passwords;
    @Mock AuditoriaService auditoria;
    @Mock UsuarioRespuestaMapper mapper;
    @Mock TipoUsuarioResolver roles;
    @InjectMocks UsuarioService servicio;
    private CrearUsuarioDto solicitud(String rol) {
        var dto = new CrearUsuarioDto(); dto.setRol(rol); dto.setNombre("Nombre"); dto.setApellido("Apellido");
        dto.setCi("1234567"); dto.setCorreo("persona@example.test"); dto.setCodigoSis(98765);
        dto.setIdGrupo(7); dto.setIdGrupos(List.of(7, 8)); return dto;
    }
    @Test void noSeRegistranRolesAcademicosSinGrupo() {
        for (String rol : List.of("DOCENTE", "ESTUDIANTE", "OPERADOR")) {
            var dto = solicitud(rol); dto.setIdGrupo(null); dto.setIdGrupos(List.of());
            assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                    () -> servicio.crear(dto, "admin@example.test", "127.0.0.1"));
        }
        verify(usuarios, never()).save(any()); verifyNoInteractions(passwords);
    }
    @Test void registroDocenteVinculaVariosGruposSinRepetir() {
        when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u = i.getArgument(0); u.setIdusuario(5); return u; });
        servicio.crear(solicitud("DOCENTE"), "admin@example.test", "127.0.0.1");
        verify(grupos).validarAccesoRegistro(List.of(7, 8), "DOCENTE");
        verify(grupos).asignarDocenteAGrupo(5, 98765, 7);
        verify(grupos).asignarDocenteAGrupo(5, 98765, 8);
        verify(docentes).save(any());
    }
    @Test void docenteSinContrasenaRecibeSuCiComoContrasenaInicial() {
        var dto=solicitud("DOCENTE"); dto.setCi("1234567-1N"); dto.setContrasena(null);
        when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u=i.getArgument(0); u.setIdusuario(5); return u; });
        servicio.crear(dto,"admin@example.test","127.0.0.1");
        verify(passwords).encode("12345671N");
    }
    @Test void registroEstudianteVinculaVariosGrupos() {
        when(passwords.encode(any())).thenReturn("hash");
        when(usuarios.save(any())).thenAnswer(i -> { Usuario u = i.getArgument(0); u.setIdusuario(5); return u; });
        servicio.crear(solicitud("ESTUDIANTE"), "admin@example.test", "127.0.0.1");
        verify(grupos).inscribirEstudianteAGrupo(5, 98765, 7);
        verify(grupos).inscribirEstudianteAGrupo(5, 98765, 8);
    }
    @Test void noCreaLaPersonaSiNoHayPermisoSobreSusGrupos() {
        doThrow(new AccessDeniedException("Grupo ajeno")).when(grupos).validarAccesoRegistro(any(), any());
        assertThrows(AccessDeniedException.class, () -> servicio.crear(solicitud("ESTUDIANTE"), "doc@example.test", "127.0.0.1"));
        verify(usuarios, never()).save(any()); verify(estudiantes, never()).save(any());
    }

    @org.junit.jupiter.api.AfterEach void limpiarContexto() { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
    private void administrador() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("admin@example.test", null,
                        List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
    }
    private Usuario persona(int id, String correo) {
        Usuario u = new Usuario("1234567", "Persona", "Prueba", 71234567, correo, "hash", true); u.setIdusuario(id); return u;
    }
    @Test void eliminarRequiereAdministrador() {
        assertThrows(AccessDeniedException.class, () -> servicio.eliminar(4, "admin@example.test", "local"));
        verifyNoInteractions(eliminaciones);
    }
    @Test void noEliminaAdministrador() {
        administrador(); when(usuarios.findById(4)).thenReturn(Optional.of(persona(4, "admin@example.test")));
        when(roles.resolver(4)).thenReturn("ADMINISTRADOR");
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                () -> servicio.eliminar(4, "admin@example.test", "local"));
        verifyNoInteractions(eliminaciones);
    }
    @Test void conservarUsuarioConHistorial() {
        administrador(); when(usuarios.findById(4)).thenReturn(Optional.of(persona(4, "estudiante@example.test")));
        when(roles.resolver(4)).thenReturn("ESTUDIANTE");
        when(usuarios.findByCorreousuario("admin@example.test")).thenReturn(Optional.of(persona(1, "admin@example.test")));
        when(eliminaciones.tieneHistorial(4)).thenReturn(true);
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                () -> servicio.eliminar(4, "admin@example.test", "local"));
        verify(eliminaciones, never()).eliminar(any(), any(), any());
    }
    @Test void eliminaCuentaSinHistorialEnUnaOperacion() {
        administrador(); when(usuarios.findById(4)).thenReturn(Optional.of(persona(4, "estudiante@example.test")));
        when(roles.resolver(4)).thenReturn("ESTUDIANTE");
        when(usuarios.findByCorreousuario("admin@example.test")).thenReturn(Optional.of(persona(1, "admin@example.test")));
        servicio.eliminar(4, "admin@example.test", "local");
        verify(eliminaciones).eliminar(eq(4), eq(1), contains("ELIMINACION_USUARIO"));
    }
    @Test void edicionGuardaAsignacionesConLosDatosBasicos() {
        Usuario u = persona(4, "estudiante@example.test"); when(usuarios.findById(4)).thenReturn(Optional.of(u));
        when(roles.resolver(4)).thenReturn("ESTUDIANTE"); when(usuarios.save(u)).thenReturn(u);
        var dto = new bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ActualizarUsuarioDto();
        dto.setNombre("Nombre"); dto.setApellido("Apellido"); dto.setCorreo(u.getCorreousuario()); dto.setIdGrupos(List.of(8));
        servicio.actualizar(4, dto, "admin@example.test", "local");
        verify(grupos).reemplazarGruposUsuario(4, "ESTUDIANTE", List.of(8));
    }
}
