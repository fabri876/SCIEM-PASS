package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

public class CargaMasivaErrorFilaDto {

    private int fila;
    private String ci;
    private String correo;
    private List<String> errores;

    public CargaMasivaErrorFilaDto() {
    }

    public CargaMasivaErrorFilaDto(int fila, String ci, String correo, List<String> errores) {
        this.fila = fila;
        this.ci = ci;
        this.correo = correo;
        this.errores = errores;
    }

    public int getFila() {
        return fila;
    }

    public void setFila(int fila) {
        this.fila = fila;
    }

    public String getCi() {
        return ci;
    }

    public void setCi(String ci) {
        this.ci = ci;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public List<String> getErrores() {
        return errores;
    }

    public void setErrores(List<String> errores) {
        this.errores = errores;
    }
}
