package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegistroUsuarioRequestDTO {

    @NotBlank(message = "El carnet de identidad es obligatorio")
    private String carnetIdentidad;

    @NotBlank(message = "El primer nombre es obligatorio")
    private String primerNombre;

    private String segundoNombre;

    @NotBlank(message = "El apellido paterno es obligatorio")
    private String apellidoPaterno;

    private String apellidoMaterno;

    private Integer telefono;

    @NotBlank(message = "El correo electrónico es obligatorio")
    @Email(message = "Formato de correo electrónico inválido")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
    private String contrasena;

    private Integer codigoSis;

    private List<String> roles;

    private String fotoUrl;

    private String codigoQr;

    public RegistroUsuarioRequestDTO() {
    }

    public String getCarnetIdentidad() {
        return carnetIdentidad;
    }

    public void setCarnetIdentidad(String carnetIdentidad) {
        this.carnetIdentidad = carnetIdentidad;
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

    public Integer getTelefono() {
        return telefono;
    }

    public void setTelefono(Integer telefono) {
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

    public Integer getCodigoSis() {
        return codigoSis;
    }

    public void setCodigoSis(Integer codigoSis) {
        this.codigoSis = codigoSis;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    public String getCodigoQr() {
        return codigoQr;
    }

    public void setCodigoQr(String codigoQr) {
        this.codigoQr = codigoQr;
    }

    public String obtenerNombreCompleto() {
        if (segundoNombre != null && !segundoNombre.trim().isEmpty()) {
            return primerNombre.trim() + " " + segundoNombre.trim();
        }
        return primerNombre != null ? primerNombre.trim() : "";
    }

    public String obtenerApellidoCompleto() {
        if (apellidoMaterno != null && !apellidoMaterno.trim().isEmpty()) {
            return apellidoPaterno.trim() + " " + apellidoMaterno.trim();
        }
        return apellidoPaterno != null ? apellidoPaterno.trim() : "";
    }
}
