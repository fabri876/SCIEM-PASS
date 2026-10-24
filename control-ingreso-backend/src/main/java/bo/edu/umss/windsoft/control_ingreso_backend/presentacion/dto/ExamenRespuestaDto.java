// presentacion/dto/ExamenRespuestaDto.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class ExamenRespuestaDto {

    private Integer idExamen;
    private LocalDate fechaExamen;
    private LocalTime duracionExamen;
    private LocalDate fechaCreacionExamen;
    private Boolean estadoExamen;

    private Integer idAsignatura;
    private Integer idTipoExamen;
    private Integer idUsuario;
    private Integer codsisDocente;

    private String nombreAsignatura;
    private String siglaAsignatura;
    private String nombreTipoExamen;
    private String detalleTipoExamen;
    private String nombreDocente;

    // Grupo asociado al examen (via HorarioRegular → EstudianteGrupo)
    private Integer numeroGrupo;
    private String  nombreGrupo;

    private List<AmbienteRespuestaDto> ambientes;

    private int ingresados;
    private int noLlegan;
    private int inhabilitados;
    private int totalInscritos;

    public ExamenRespuestaDto() {}

    private List<NormaGeneralRespuestaDto> normasGenerales;

    public List<NormaGeneralRespuestaDto> getNormasGenerales() { return normasGenerales; }
    public void setNormasGenerales(List<NormaGeneralRespuestaDto> normasGenerales) { this.normasGenerales = normasGenerales; }

    public Integer getIdExamen() { return idExamen; }
    public void setIdExamen(Integer idExamen) { this.idExamen = idExamen; }

    public LocalDate getFechaExamen() { return fechaExamen; }
    public void setFechaExamen(LocalDate fechaExamen) { this.fechaExamen = fechaExamen; }

    public LocalTime getDuracionExamen() { return duracionExamen; }
    public void setDuracionExamen(LocalTime duracionExamen) { this.duracionExamen = duracionExamen; }

    public LocalDate getFechaCreacionExamen() { return fechaCreacionExamen; }
    public void setFechaCreacionExamen(LocalDate fechaCreacionExamen) { this.fechaCreacionExamen = fechaCreacionExamen; }

    public Boolean getEstadoExamen() { return estadoExamen; }
    public void setEstadoExamen(Boolean estadoExamen) { this.estadoExamen = estadoExamen; }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }

    public Integer getIdTipoExamen() { return idTipoExamen; }
    public void setIdTipoExamen(Integer idTipoExamen) { this.idTipoExamen = idTipoExamen; }

    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }

    public Integer getCodsisDocente() { return codsisDocente; }
    public void setCodsisDocente(Integer codsisDocente) { this.codsisDocente = codsisDocente; }

    public String getNombreAsignatura() { return nombreAsignatura; }
    public void setNombreAsignatura(String nombreAsignatura) { this.nombreAsignatura = nombreAsignatura; }

    public String getSiglaAsignatura() { return siglaAsignatura; }
    public void setSiglaAsignatura(String siglaAsignatura) { this.siglaAsignatura = siglaAsignatura; }

    public String getNombreTipoExamen() { return nombreTipoExamen; }
    public void setNombreTipoExamen(String nombreTipoExamen) { this.nombreTipoExamen = nombreTipoExamen; }

    public String getDetalleTipoExamen() { return detalleTipoExamen; }
    public void setDetalleTipoExamen(String detalleTipoExamen) { this.detalleTipoExamen = detalleTipoExamen; }

    public String getNombreDocente() { return nombreDocente; }
    public void setNombreDocente(String nombreDocente) { this.nombreDocente = nombreDocente; }

    public Integer getNumeroGrupo() { return numeroGrupo; }
    public void setNumeroGrupo(Integer numeroGrupo) { this.numeroGrupo = numeroGrupo; }

    public String getNombreGrupo() { return nombreGrupo; }
    public void setNombreGrupo(String nombreGrupo) { this.nombreGrupo = nombreGrupo; }

    public List<AmbienteRespuestaDto> getAmbientes() { return ambientes; }
    public void setAmbientes(List<AmbienteRespuestaDto> ambientes) { this.ambientes = ambientes; }

    public int getIngresados() { return ingresados; }
    public void setIngresados(int ingresados) { this.ingresados = ingresados; }
    public int getNoLlegan() { return noLlegan; }
    public void setNoLlegan(int noLlegan) { this.noLlegan = noLlegan; }
    public int getInhabilitados() { return inhabilitados; }
    public void setInhabilitados(int inhabilitados) { this.inhabilitados = inhabilitados; }
    public int getTotalInscritos() { return totalInscritos; }
    public void setTotalInscritos(int totalInscritos) { this.totalInscritos = totalInscritos; }
}
