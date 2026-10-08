package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class GrupoResponseDto {
    private Integer idGrupo;
    private Integer idAsignatura;
    private String nombreAsignatura;
    private String siglaAsignatura;
    private String nombreGrupo;
    private String horarios;
    private Boolean estadoGrupo;

    public GrupoResponseDto() {}

    public GrupoResponseDto(Integer idGrupo, Integer idAsignatura, String nombreAsignatura, String siglaAsignatura, String nombreGrupo, String horarios, Boolean estadoGrupo) {
        this.idGrupo = idGrupo;
        this.idAsignatura = idAsignatura;
        this.nombreAsignatura = nombreAsignatura;
        this.siglaAsignatura = siglaAsignatura;
        this.nombreGrupo = nombreGrupo;
        this.horarios = horarios;
        this.estadoGrupo = estadoGrupo;
    }

    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }

    public String getNombreAsignatura() { return nombreAsignatura; }
    public void setNombreAsignatura(String nombreAsignatura) { this.nombreAsignatura = nombreAsignatura; }

    public String getSiglaAsignatura() { return siglaAsignatura; }
    public void setSiglaAsignatura(String siglaAsignatura) { this.siglaAsignatura = siglaAsignatura; }

    public String getNombreGrupo() { return nombreGrupo; }
    public void setNombreGrupo(String nombreGrupo) { this.nombreGrupo = nombreGrupo; }

    public String getHorarios() { return horarios; }
    public void setHorarios(String horarios) { this.horarios = horarios; }

    public Boolean getEstadoGrupo() { return estadoGrupo; }
    public void setEstadoGrupo(Boolean estadoGrupo) { this.estadoGrupo = estadoGrupo; }
}
