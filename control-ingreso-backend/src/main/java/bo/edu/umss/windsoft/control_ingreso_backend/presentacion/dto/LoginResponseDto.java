package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class LoginResponseDto {

    private String token;
    private String tipoToken = "Bearer";
    private long expiresIn;
    private UsuarioRespuestaDto usuario;

    public LoginResponseDto() {
    }

    public LoginResponseDto(String token, long expiresIn, UsuarioRespuestaDto usuario) {
        this.token = token;
        this.expiresIn = expiresIn;
        this.usuario = usuario;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTipoToken() {
        return tipoToken;
    }

    public void setTipoToken(String tipoToken) {
        this.tipoToken = tipoToken;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(long expiresIn) {
        this.expiresIn = expiresIn;
    }

    public UsuarioRespuestaDto getUsuario() {
        return usuario;
    }

    public void setUsuario(UsuarioRespuestaDto usuario) {
        this.usuario = usuario;
    }
}
