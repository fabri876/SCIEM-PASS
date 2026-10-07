package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class DocenteMateriaDto {
    private Integer idUsuario;
    private Integer codSisDocente;
    private String nombreCompleto;
    private String correo;
    private String ci;

    public DocenteMateriaDto() {}

    public DocenteMateriaDto(Integer idUsuario, Integer codSisDocente, String nombreCompleto, String correo, String ci) {
        this.idUsuario = idUsuario;
        this.codSisDocente = codSisDocente;
        this.nombreCompleto = nombreCompleto;
        this.correo = correo;
        this.ci = ci;
    }

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }

    public Integer getCodSisDocente() { return codSisDocente; }
    public void setCodSisDocente(Integer codSisDocente) { this.codSisDocente = codSisDocente; }

    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getCi() { return ci; }
    public void setCi(String ci) { this.ci = ci; }
}
