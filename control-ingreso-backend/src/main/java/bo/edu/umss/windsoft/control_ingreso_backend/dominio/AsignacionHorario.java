package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/** Una asignación del horario, sin días, horas ni aulas. */
public record AsignacionHorario(Integer codigoAsignatura, String nombreAsignatura,
                                String nombreGrupo, String tipo, String nombreDocente) {
    public boolean porDesignar() {
        String nombre = nombreDocente.toUpperCase(java.util.Locale.ROOT);
        return nombre.contains("DESIGNAR") || nombre.contains("DESGINAR");
    }
    public boolean auxiliar() { return "TP".equals(tipo); }
}
