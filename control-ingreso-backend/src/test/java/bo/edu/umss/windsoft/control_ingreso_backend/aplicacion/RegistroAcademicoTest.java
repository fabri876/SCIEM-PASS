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
    @Mock UsuarioHistorialRepository historial;
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
    @Test void administradorNoPuedeCrearseConCiNiClaveDebil() {
        var dto = solicitud("ADMINISTRADOR");
        for (String clave : new String[]{"", "1234567", "corta"}) {
            dto.setContrasena(clave);
            assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                    () -> servicio.crear(dto, "admin@example.test", "local"));
        }
        verify(usuarios, never()).save(any());
        verifyNoInteractions(passwords);
    }
    @Test void noSeHabilitaCreacionDeAdministradorConClaveValida() {
        var dto = solicitud("ADMINISTRADOR"); dto.setContrasena("Vela$8Nube!49");
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                () -> servicio.crear(dto, "admin@example.test", "local"));
        verify(usuarios, never()).save(any());
    }
    @Test void ascensoAAdministradorSigueRestringido() {
        Usuario u = persona(4, "persona@example.test");
        when(usuarios.findById(4)).thenReturn(Optional.of(u));
        when(roles.resolver(4)).thenReturn("DOCENTE");
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                () -> servicio.cambiarRol(4, "ADMINISTRADOR", null, "admin@example.test", "local"));
        verify(usuarios, never()).save(any());
    }
    @Test void noDegradaAlUnicoAdministrador() {
        Usuario u = persona(4, "admin@example.test");
        when(usuarios.findById(4)).thenReturn(Optional.of(u));
        when(roles.resolver(4)).thenReturn("ADMINISTRADOR");
        when(admins.count()).thenReturn(1L);
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                () -> servicio.cambiarRol(4, "DOCENTE", 98765, "admin@example.test", "local"));
        verify(admins, never()).deleteById(any());
        verify(usuarios, never()).save(any());
    }
    @Test void noDesactivaAlUnicoAdministrador() {
        when(usuarios.findById(4)).thenReturn(Optional.of(persona(4, "admin@example.test")));
        when(roles.resolver(4)).thenReturn("ADMINISTRADOR");
        when(admins.count()).thenReturn(1L);
        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException.class,
                () -> servicio.cambiarEstado(4, false, "admin@example.test", "local"));
        verify(usuarios, never()).save(any());
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

    private Usuario persona(int id, String correo) {
        Usuario u = new Usuario("1234567", "Persona", "Prueba", 71234567, correo, "hash", true); u.setIdusuario(id); return u;
    }
    @Test void cambioDeRolConHistorialConservaElRolActual() {
        when(usuarios.findById(4)).thenReturn(Optional.of(persona(4, "estudiante@example.test")));
        when(roles.resolver(4)).thenReturn("ESTUDIANTE");
        when(historial.tieneHistorial(4)).thenReturn(true);

        assertThrows(bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.ConflictoEstadoException.class,
                () -> servicio.cambiarRol(4, "OPERADOR", null, "admin@example.test", "local"));
        verifyNoInteractions(estudiantes, ayudantes, auditoria);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"DOCENTE", "OPERADOR", "ESTUDIANTE"})
    void cambiarEstadoConservaLaCuentaYSusVinculos(String rol) {
        Usuario usuario = persona(4, "persona@example.test");
        when(usuarios.findById(4)).thenReturn(Optional.of(usuario));
        when(roles.resolver(4)).thenReturn(rol);
        when(usuarios.save(usuario)).thenReturn(usuario);

        servicio.cambiarEstado(4, false, "admin@example.test", "local");
        assertFalse(usuario.getEstadousuario());
        servicio.cambiarEstado(4, true, "admin@example.test", "local");
        assertTrue(usuario.getEstadousuario());
        assertEquals(4, usuario.getIdusuario());
        assertEquals("hash", usuario.getContraseniausuario());
        verifyNoInteractions(grupos, docentes, estudiantes, ayudantes, historial);
        verify(usuarios, times(2)).save(usuario);
        verify(usuarios, never()).deleteById(any());
        verify(auditoria).registrarEnTransaccion(eq("DESACTIVACION_USUARIO"), any(), eq(usuario.getCorreousuario()), any(), any());
        verify(auditoria).registrarEnTransaccion(eq("ACTIVACION_USUARIO"), any(), eq(usuario.getCorreousuario()), any(), any());
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
