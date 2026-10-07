package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

public class AyudanteGrupoDetalleDto {
    private Integer idGrupo;
    private String nombreGrupo;
    private String horarios;
    private Integer idAsignatura;
    private String nombreAsignatura;
    private String siglaAsignatura;
    private List<DocenteMateriaDto> docentes;

    public AyudanteGrupoDetalleDto() {}

    public AyudanteGrupoDetalleDto(Integer idGrupo, String nombreGrupo, String horarios, Integer idAsignatura, String nombreAsignatura, String siglaAsignatura, List<DocenteMateriaDto> docentes) {
        this.idGrupo = idGrupo;
        this.nombreGrupo = nombreGrupo;
        this.horarios = horarios;
        this.idAsignatura = idAsignatura;
        this.nombreAsignatura = nombreAsignatura;
        this.siglaAsignatura = siglaAsignatura;
        this.docentes = docentes;
    }

    public Integer getIdGrupo() { return idGrupo; }
    public void setIdGrupo(Integer idGrupo) { this.idGrupo = idGrupo; }

    public String getNombreGrupo() { return nombreGrupo; }
    public void setNombreGrupo(String nombreGrupo) { this.nombreGrupo = nombreGrupo; }

    public String getHorarios() { return horarios; }
    public void setHorarios(String horarios) { this.horarios = horarios; }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }

    public String getNombreAsignatura() { return nombreAsignatura; }
    public void setNombreAsignatura(String nombreAsignatura) { this.nombreAsignatura = nombreAsignatura; }

    public String getSiglaAsignatura() { return siglaAsignatura; }
    public void setSiglaAsignatura(String siglaAsignatura) { this.siglaAsignatura = siglaAsignatura; }

    public List<DocenteMateriaDto> getDocentes() { return docentes; }
    public void setDocentes(List<DocenteMateriaDto> docentes) { this.docentes = docentes; }
}
