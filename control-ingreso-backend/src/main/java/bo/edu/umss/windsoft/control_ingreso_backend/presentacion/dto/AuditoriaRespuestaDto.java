package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public class AuditoriaRespuestaDto {

    private Integer idAuditoria;
    private String tipoOperacion;
    private String usuarioEjecutor;
    private String usuarioAfectado;
    private String detalles;
    private String ipOrigen;
    private LocalDateTime fechaHora;

    public AuditoriaRespuestaDto() {
    }

    public AuditoriaRespuestaDto(Integer idAuditoria, String tipoOperacion, String usuarioEjecutor,
                                  String usuarioAfectado, String detalles, String ipOrigen,
                                  LocalDateTime fechaHora) {
        this.idAuditoria = idAuditoria;
        this.tipoOperacion = tipoOperacion;
        this.usuarioEjecutor = usuarioEjecutor;
        this.usuarioAfectado = usuarioAfectado;
        this.detalles = detalles;
        this.ipOrigen = ipOrigen;
        this.fechaHora = fechaHora;
    }

    public Integer getIdAuditoria() {
        return idAuditoria;
    }

    public void setIdAuditoria(Integer idAuditoria) {
        this.idAuditoria = idAuditoria;
    }

    public String getTipoOperacion() {
        return tipoOperacion;
    }

    public void setTipoOperacion(String tipoOperacion) {
        this.tipoOperacion = tipoOperacion;
    }

    public String getUsuarioEjecutor() {
        return usuarioEjecutor;
    }

    public void setUsuarioEjecutor(String usuarioEjecutor) {
        this.usuarioEjecutor = usuarioEjecutor;
    }

    public String getUsuarioAfectado() {
        return usuarioAfectado;
    }

    public void setUsuarioAfectado(String usuarioAfectado) {
        this.usuarioAfectado = usuarioAfectado;
    }

    public String getDetalles() {
        return detalles;
    }

    public void setDetalles(String detalles) {
        this.detalles = detalles;
    }

    public String getIpOrigen() {
        return ipOrigen;
    }

    public void setIpOrigen(String ipOrigen) {
        this.ipOrigen = ipOrigen;
    }

    public LocalDateTime getFechaHora() {
        return fechaHora;
    }

    public void setFechaHora(LocalDateTime fechaHora) {
        this.fechaHora = fechaHora;
    }
}
