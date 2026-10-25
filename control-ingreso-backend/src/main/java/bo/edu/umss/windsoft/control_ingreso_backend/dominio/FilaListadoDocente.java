package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/** Datos del listado; en históricos son una copia, nunca una consulta de la cuenta actual. */
public record FilaListadoDocente(String codigo, String asignatura, String grupo,
        String nombre, String apellido, String ci, String sis, String correo, String telefono) {}
