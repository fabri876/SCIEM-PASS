package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

public class UsuarioRespuestaDto {

    private Integer idUsuario;
    private String ci;
    private String nombre;
    private String apellido;
    private Integer telefono;
    private String correo;
    private boolean estado;
    private String rol;
    private int intentosFallidos;
    private List<String> permisos;
    private Integer codsisDocente;

    public UsuarioRespuestaDto() {
    }

    // Constructor de 10 parámetros (asigna idUsuario a codsisDocente automáticamente)
    public UsuarioRespuestaDto(Integer idUsuario, String ci, String nombre, String apellido,
                               Integer telefono, String correo, boolean estado, String rol,
                               int intentosFallidos, List<String> permisos) {
        this(idUsuario, ci, nombre, apellido, telefono, correo, estado, rol, intentosFallidos, permisos, idUsuario);
    }

    // Constructor de 11 parámetros
    public UsuarioRespuestaDto(Integer idUsuario, String ci, String nombre, String apellido,
                               Integer telefono, String correo, boolean estado, String rol,
                               int intentosFallidos, List<String> permisos, Integer codsisDocente) {
        this.idUsuario = idUsuario;
        this.ci = ci;
        this.nombre = nombre;
        this.apellido = apellido;
        this.telefono = telefono;
        this.correo = correo;
        this.estado = estado;
        this.rol = rol;
        this.intentosFallidos = intentosFallidos;
        this.permisos = permisos;
        this.codsisDocente = codsisDocente;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getCi() {
        return ci;
    }

    public void setCi(String ci) {
        this.ci = ci;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
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

    public boolean isEstado() {
        return estado;
    }

    public void setEstado(boolean estado) {
        this.estado = estado;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public int getIntentosFallidos() {
        return intentosFallidos;
    }

    public void setIntentosFallidos(int intentosFallidos) {
        this.intentosFallidos = intentosFallidos;
    }

    public List<String> getPermisos() {
        return permisos;
    }

    public void setPermisos(List<String> permisos) {
        this.permisos = permisos;
    }

    public Integer getCodsisDocente() {
        return codsisDocente;
    }

    public void setCodsisDocente(Integer codsisDocente) {
        this.codsisDocente = codsisDocente;
    }
}