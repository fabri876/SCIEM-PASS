package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/** Por qué se bloqueó un ingreso en el punto de control (CHECK ck_intento_motivo). */
public enum MotivoIntento {
    DUPLICADO,
    AMBIENTE_DIFERENTE,
    INHABILITADO,
    EXAMEN_INCORRECTO
}
