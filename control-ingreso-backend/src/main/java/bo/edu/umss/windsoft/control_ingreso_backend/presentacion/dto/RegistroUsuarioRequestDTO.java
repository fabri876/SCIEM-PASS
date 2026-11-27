package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public class RegistroUsuarioRequestDTO {

    @NotBlank(message = "El primer nombre es obligatorio")
    @Size(max = 50, message = "El primer nombre no puede exceder 50 caracteres")
    private String primerNombre;

    @Size(max = 50, message = "El segundo nombre no puede exceder 50 caracteres")
    private String segundoNombre;

    @NotBlank(message = "El apellido paterno es obligatorio")
    @Size(max = 50, message = "El apellido paterno no puede exceder 50 caracteres")
    private String apellidoPaterno;

    @Size(max = 50, message = "El apellido materno no puede exceder 50 caracteres")
    private String apellidoMaterno;

    private String telefono;

    @NotBlank(message = "El correo electrónico es obligatorio")
    @Email(message = "El formato del correo electrónico no es válido")
    @Size(max = 100, message = "El correo electrónico no puede exceder 100 caracteres")
    private String correo;

    // Opcional: Si no se especifica, la contraseña inicial es automáticamente el carnet de identidad
    private String contrasena;

    @NotBlank(message = "El carnet de identidad es obligatorio")
    @Size(max = 20, message = "El carnet de identidad no puede exceder 20 caracteres")
    private String carnetIdentidad;

    @jakarta.validation.constraints.Pattern(regexp = "[0-9]{9}", message = "El Código SIS debe tener exactamente 9 dígitos.")
    private String codigoSis;

    @NotEmpty(message = "Debe seleccionar al menos un rol (Estudiante, Docente o Ayudante)")
    private List<String> roles;

    // Opcionales para vinculacion con asignatura y grupos
    private Integer idAsignatura;
    private Integer idGrupo;
    private List<Integer> idGrupos;

    public RegistroUsuarioRequestDTO() {
    }

    public RegistroUsuarioRequestDTO(String primerNombre, String segundoNombre, String apellidoPaterno, String apellidoMaterno, String telefono, String correo, String contrasena, String carnetIdentidad, String codigoSis, List<String> roles) {
        this.primerNombre = primerNombre;
        this.segundoNombre = segundoNombre;
        this.apellidoPaterno = apellidoPaterno;
        this.apellidoMaterno = apellidoMaterno;
        this.telefono = telefono;
        this.correo = correo;
        this.contrasena = contrasena;
        this.carnetIdentidad = carnetIdentidad;
        this.codigoSis = codigoSis;
        this.roles = roles;
    }

    public String getPrimerNombre() {
        return primerNombre;
    }

    public void setPrimerNombre(String primerNombre) {
        this.primerNombre = primerNombre;
    }

    public String getSegundoNombre() {
        return segundoNombre;
    }

    public void setSegundoNombre(String segundoNombre) {
        this.segundoNombre = segundoNombre;
    }

    public String getApellidoPaterno() {
        return apellidoPaterno;
    }

    public void setApellidoPaterno(String apellidoPaterno) {
        this.apellidoPaterno = apellidoPaterno;
    }

    public String getApellidoMaterno() {
        return apellidoMaterno;
    }

    public void setApellidoMaterno(String apellidoMaterno) {
        this.apellidoMaterno = apellidoMaterno;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getCarnetIdentidad() {
        return carnetIdentidad;
    }

    public void setCarnetIdentidad(String carnetIdentidad) {
        this.carnetIdentidad = carnetIdentidad;
    }

    public String getCodigoSis() {
        return codigoSis;
    }

    public void setCodigoSis(String codigoSis) {
        this.codigoSis = codigoSis;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }

    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }

    public List<Integer> getIdGrupos() { return idGrupos; }
    public void setIdGrupos(List<Integer> idGrupos) { this.idGrupos = idGrupos; }
}
