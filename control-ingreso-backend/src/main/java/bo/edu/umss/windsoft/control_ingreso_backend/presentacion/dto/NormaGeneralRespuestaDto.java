package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public class NormaGeneralRespuestaDto {

    private Integer idNormaGeneral;
    private String descripcionNorma;

    public NormaGeneralRespuestaDto() {}

    public Integer getIdNormaGeneral() { return idNormaGeneral; }
    public void setIdNormaGeneral(Integer idNormaGeneral) { this.idNormaGeneral = idNormaGeneral; }
    public String getDescripcionNorma() { return descripcionNorma; }
    public void setDescripcionNorma(String descripcionNorma) { this.descripcionNorma = descripcionNorma; }
}