package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

public class CargaMasivaRespuestaDto {

    private String mensaje;
    private int totalProcesados;
    private int exitosos;
    private int fallidos;
    private List<CargaMasivaErrorFilaDto> detallesErrores;

    public CargaMasivaRespuestaDto() {
    }

    public CargaMasivaRespuestaDto(String mensaje, int totalProcesados, int exitosos, int fallidos, List<CargaMasivaErrorFilaDto> detallesErrores) {
        this.mensaje = mensaje;
        this.totalProcesados = totalProcesados;
        this.exitosos = exitosos;
        this.fallidos = fallidos;
        this.detallesErrores = detallesErrores;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public int getTotalProcesados() {
        return totalProcesados;
    }

    public void setTotalProcesados(int totalProcesados) {
        this.totalProcesados = totalProcesados;
    }

    public int getExitosos() {
        return exitosos;
    }

    public void setExitosos(int exitosos) {
        this.exitosos = exitosos;
    }

    public int getFallidos() {
        return fallidos;
    }

    public void setFallidos(int fallidos) {
        this.fallidos = fallidos;
    }

    public List<CargaMasivaErrorFilaDto> getDetallesErrores() {
        return detallesErrores;
    }

    public void setDetallesErrores(List<CargaMasivaErrorFilaDto> detallesErrores) {
        this.detallesErrores = detallesErrores;
    }
}
