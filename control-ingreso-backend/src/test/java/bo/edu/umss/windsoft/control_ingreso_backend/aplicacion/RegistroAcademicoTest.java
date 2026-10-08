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
    @Test void noSeRegistranDocentesNiEstudiantesSinGrupo() {
        for (String rol : List.of("DOCENTE", "ESTUDIANTE")) {
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
}
