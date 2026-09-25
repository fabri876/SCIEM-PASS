package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class AsignaturaResponseDto {

    private Integer idAsignatura;
    private Integer idInscripcion;
    private String nombreAsignatura;
    private String siglaAsignatura;
    private String nombreDocente;
    private Integer estudiantesInscritos;
    private Integer habilitados;
    private Integer inhabilitados;

    public AsignaturaResponseDto() {}

    public AsignaturaResponseDto(Integer idAsignatura, Integer idInscripcion, String nombreAsignatura, String siglaAsignatura, String nombreDocente) {
        this.idAsignatura = idAsignatura;
        this.idInscripcion = idInscripcion;
        this.nombreAsignatura = nombreAsignatura;
        this.siglaAsignatura = siglaAsignatura;
        this.nombreDocente = nombreDocente;
    }

    public AsignaturaResponseDto(Integer idAsignatura, Integer idInscripcion, String nombreAsignatura, String siglaAsignatura, String nombreDocente, Integer estudiantesInscritos, Integer habilitados, Integer inhabilitados) {
        this.idAsignatura = idAsignatura;
        this.idInscripcion = idInscripcion;
        this.nombreAsignatura = nombreAsignatura;
        this.siglaAsignatura = siglaAsignatura;
        this.nombreDocente = nombreDocente;
        this.estudiantesInscritos = estudiantesInscritos;
        this.habilitados = habilitados;
        this.inhabilitados = inhabilitados;
    }

    public Integer getIdAsignatura() { return idAsignatura; }
    public void setIdAsignatura(Integer idAsignatura) { this.idAsignatura = idAsignatura; }

    public Integer getIdInscripcion() { return idInscripcion; }
    public void setIdInscripcion(Integer idInscripcion) { this.idInscripcion = idInscripcion; }

    public String getNombreAsignatura() { return nombreAsignatura; }
    public void setNombreAsignatura(String nombreAsignatura) { this.nombreAsignatura = nombreAsignatura; }

    public String getSiglaAsignatura() { return siglaAsignatura; }
    public void setSiglaAsignatura(String siglaAsignatura) { this.siglaAsignatura = siglaAsignatura; }

    public String getNombreDocente() { return nombreDocente; }
    public void setNombreDocente(String nombreDocente) { this.nombreDocente = nombreDocente; }

    public Integer getEstudiantesInscritos() { return estudiantesInscritos; }
    public void setEstudiantesInscritos(Integer estudiantesInscritos) { this.estudiantesInscritos = estudiantesInscritos; }

    public Integer getHabilitados() { return habilitados; }
    public void setHabilitados(Integer habilitados) { this.habilitados = habilitados; }

    public Integer getInhabilitados() { return inhabilitados; }
    public void setInhabilitados(Integer inhabilitados) { this.inhabilitados = inhabilitados; }
}
