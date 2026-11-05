package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/**
 * DTO de respuesta para la verificación de integridad criptográfica de la cadena WORM completa.
 */
public class IntegridadCadenaResultadoDto {

    private boolean esValido;
    private int totalBloques;
    private String mensaje;
    private Integer idBloqueAfectado;
    private String detalleInconsistencia;

    public IntegridadCadenaResultadoDto() {
    }

    public IntegridadCadenaResultadoDto(boolean esValido, int totalBloques, String mensaje) {
        this.esValido = esValido;
        this.totalBloques = totalBloques;
        this.mensaje = mensaje;
    }

    public IntegridadCadenaResultadoDto(boolean esValido, int totalBloques, String mensaje,
                                       Integer idBloqueAfectado, String detalleInconsistencia) {
        this.esValido = esValido;
        this.totalBloques = totalBloques;
        this.mensaje = mensaje;
        this.idBloqueAfectado = idBloqueAfectado;
        this.detalleInconsistencia = detalleInconsistencia;
    }

    public boolean isEsValido() {
        return esValido;
    }

    public void setEsValido(boolean esValido) {
        this.esValido = esValido;
    }

    public int getTotalBloques() {
        return totalBloques;
    }

    public void setTotalBloques(int totalBloques) {
        this.totalBloques = totalBloques;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public Integer getIdBloqueAfectado() {
        return idBloqueAfectado;
    }

    public void setIdBloqueAfectado(Integer idBloqueAfectado) {
        this.idBloqueAfectado = idBloqueAfectado;
    }

    public String getDetalleInconsistencia() {
        return detalleInconsistencia;
    }

    public void setDetalleInconsistencia(String detalleInconsistencia) {
        this.detalleInconsistencia = detalleInconsistencia;
    }
}
