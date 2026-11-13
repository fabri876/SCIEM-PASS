package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * Contrato unificado para la lista oficial del examen.
 * Compatible simultáneamente con:
 * 1. PanelListaOficial (Admin/Docente en frontend web):
 *    espera { ci, apellidos, nombres, sis, estado ("HABILITADO" | "INHABILITADO" | "INGRESO" | "PENDIENTE"), horaIngreso }
 * 2. HU7 Offline (nominaLoader / nominaRepo):
 *    espera { codigoSis, ci, nombre, apellidos, habilitado (boolean), aulaAsignada, qr, qrDesde, qrHasta, qrEstado, marcadoEn, marcadoPor, observacion }
 */
public class EstudianteListaOficialDTO {

    // Se usa internamente al preparar recursos offline. No forma parte del
    // contrato público de la nómina ni se serializa al cliente.
    private Integer idUsuario;

    // Identificación
    private Integer codSisEstudiante;
    private Integer codigoSis;
    private Integer sis;
    private String  ci;
    private String  ciEstudiante;

    // Nombres
    private String  nombres;
    private String  apellidos;
    private String  nombre;              // Nombre completo
    private String  nombreEstudiante;

    // Estado para interfaz web ("HABILITADO" | "INHABILITADO" | "INGRESO" | "PENDIENTE")
    private String  estado;

    // Estado booleano para sync offline
    private Boolean habilitado;
    private Boolean estadoHabilitacion;

    // Detalle de ingreso
    private String  horaIngreso;         // Formato HH:mm:ss para la vista web
    private String  marcadoEn;           // ISO timestamp para offline
    private String  marcadoPor;

    // Aula asignada
    private String  aulaAsignada;
    private Integer idAmbiente;

    // Credencial QR para offline
    private String  qr;
    private String  qrDesde;
    private String  qrHasta;
    private String  qrEstado;

    // Observaciones
    private String  observacion;
    private String  observacionHabilitacion;
    private String  carrera;

    public EstudianteListaOficialDTO() {}

    @JsonIgnore
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }

    // Getters y Setters
    public Integer getCodSisEstudiante() { return codSisEstudiante; }
    public void setCodSisEstudiante(Integer codSisEstudiante) {
        this.codSisEstudiante = codSisEstudiante;
        this.codigoSis = codSisEstudiante;
        this.sis = codSisEstudiante;
    }

    public Integer getCodigoSis() { return codigoSis; }
    public void setCodigoSis(Integer codigoSis) {
        this.codigoSis = codigoSis;
        this.codSisEstudiante = codigoSis;
        this.sis = codigoSis;
    }

    public Integer getSis() { return sis; }
    public void setSis(Integer sis) {
        this.sis = sis;
        this.codSisEstudiante = sis;
        this.codigoSis = sis;
    }

    public String getCi() { return ci; }
    public void setCi(String ci) {
        this.ci = ci;
        this.ciEstudiante = ci;
    }

    public String getCiEstudiante() { return ciEstudiante; }
    public void setCiEstudiante(String ciEstudiante) {
        this.ciEstudiante = ciEstudiante;
        this.ci = ciEstudiante;
    }

    public String getNombres() { return nombres; }
    public void setNombres(String nombres) {
        this.nombres = nombres;
        this.nombreEstudiante = nombres;
    }

    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getNombreEstudiante() { return nombreEstudiante; }
    public void setNombreEstudiante(String nombreEstudiante) { this.nombreEstudiante = nombreEstudiante; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Boolean getHabilitado() { return habilitado; }
    public void setHabilitado(Boolean habilitado) {
        this.habilitado = habilitado;
        this.estadoHabilitacion = habilitado;
    }

    public Boolean getEstadoHabilitacion() { return estadoHabilitacion; }
    public void setEstadoHabilitacion(Boolean estadoHabilitacion) {
        this.estadoHabilitacion = estadoHabilitacion;
        this.habilitado = estadoHabilitacion;
    }

    public String getHoraIngreso() { return horaIngreso; }
    public void setHoraIngreso(String horaIngreso) { this.horaIngreso = horaIngreso; }

    public String getMarcadoEn() { return marcadoEn; }
    public void setMarcadoEn(String marcadoEn) { this.marcadoEn = marcadoEn; }

    public String getMarcadoPor() { return marcadoPor; }
    public void setMarcadoPor(String marcadoPor) { this.marcadoPor = marcadoPor; }

    public String getAulaAsignada() { return aulaAsignada; }
    public void setAulaAsignada(String aulaAsignada) { this.aulaAsignada = aulaAsignada; }

    public Integer getIdAmbiente() { return idAmbiente; }
    public void setIdAmbiente(Integer idAmbiente) { this.idAmbiente = idAmbiente; }

    public String getQr() { return qr; }
    public void setQr(String qr) { this.qr = qr; }

    public String getQrDesde() { return qrDesde; }
    public void setQrDesde(String qrDesde) { this.qrDesde = qrDesde; }

    public String getQrHasta() { return qrHasta; }
    public void setQrHasta(String qrHasta) { this.qrHasta = qrHasta; }

    public String getQrEstado() { return qrEstado; }
    public void setQrEstado(String qrEstado) { this.qrEstado = qrEstado; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) {
        this.observacion = observacion;
        this.observacionHabilitacion = observacion;
    }

    public String getObservacionHabilitacion() { return observacionHabilitacion; }
    public void setObservacionHabilitacion(String observacionHabilitacion) {
        this.observacionHabilitacion = observacionHabilitacion;
        this.observacion = observacionHabilitacion;
    }

    public String getCarrera() { return carrera; }
    public void setCarrera(String carrera) { this.carrera = carrera; }
}
