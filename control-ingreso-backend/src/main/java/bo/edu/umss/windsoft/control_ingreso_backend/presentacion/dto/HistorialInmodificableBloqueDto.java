package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/**
 * DTO que representa un bloque criptográfico en el Historial Inmodificable de Auditoría (HU-15).
 * Su estructura coincide exactamente con la consumida por el frontend en historialInmodificableService.js
 * y mostrada en HistorialInmodificable.jsx.
 */
public class HistorialInmodificableBloqueDto {

    private Integer idBloque;
    private String fechaHoraOficial;
    private String modulo;
    private String operacionEjecutada;
    private String usuarioEjecutor;
    private String ipOrigen;
    private String detalles;
    private String selloSha256;
    private String hashBloqueAnterior;
    private String estadoIntegridad;

    public HistorialInmodificableBloqueDto() {
    }

    public HistorialInmodificableBloqueDto(Integer idBloque, String fechaHoraOficial, String modulo,
                                         String operacionEjecutada, String usuarioEjecutor, String ipOrigen,
                                         String detalles, String selloSha256, String hashBloqueAnterior,
                                         String estadoIntegridad) {
        this.idBloque = idBloque;
        this.fechaHoraOficial = fechaHoraOficial;
        this.modulo = modulo;
        this.operacionEjecutada = operacionEjecutada;
        this.usuarioEjecutor = usuarioEjecutor;
        this.ipOrigen = ipOrigen;
        this.detalles = detalles;
        this.selloSha256 = selloSha256;
        this.hashBloqueAnterior = hashBloqueAnterior;
        this.estadoIntegridad = estadoIntegridad;
    }

    public Integer getIdBloque() {
        return idBloque;
    }

    public void setIdBloque(Integer idBloque) {
        this.idBloque = idBloque;
    }

    public String getFechaHoraOficial() {
        return fechaHoraOficial;
    }

    public void setFechaHoraOficial(String fechaHoraOficial) {
        this.fechaHoraOficial = fechaHoraOficial;
    }

    public String getModulo() {
        return modulo;
    }

    public void setModulo(String modulo) {
        this.modulo = modulo;
    }

    public String getOperacionEjecutada() {
        return operacionEjecutada;
    }

    public void setOperacionEjecutada(String operacionEjecutada) {
        this.operacionEjecutada = operacionEjecutada;
    }

    public String getUsuarioEjecutor() {
        return usuarioEjecutor;
    }

    public void setUsuarioEjecutor(String usuarioEjecutor) {
        this.usuarioEjecutor = usuarioEjecutor;
    }

    public String getIpOrigen() {
        return ipOrigen;
    }

    public void setIpOrigen(String ipOrigen) {
        this.ipOrigen = ipOrigen;
    }

    public String getDetalles() {
        return detalles;
    }

    public void setDetalles(String detalles) {
        this.detalles = detalles;
    }

    public String getSelloSha256() {
        return selloSha256;
    }

    public void setSelloSha256(String selloSha256) {
        this.selloSha256 = selloSha256;
    }

    public String getHashBloqueAnterior() {
        return hashBloqueAnterior;
    }

    public void setHashBloqueAnterior(String hashBloqueAnterior) {
        this.hashBloqueAnterior = hashBloqueAnterior;
    }

    public String getEstadoIntegridad() {
        return estadoIntegridad;
    }

    public void setEstadoIntegridad(String estadoIntegridad) {
        this.estadoIntegridad = estadoIntegridad;
    }
}
