package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

/** Usa el examen y el semestre del grupo; nunca acepta identidades enviadas por el cliente. */
final class VisibilidadExamenSql {
    private VisibilidadExamenSql() {}
    static final String FILTRO="""
        AND (? = 'ADMINISTRADOR'
          OR (? = 'DOCENTE' AND (e.idusuario=? OR EXISTS (
            SELECT 1 FROM docentegrupo v JOIN grupo g ON g.idgrupo=v.idgrupo
            WHERE v.idusuario=? AND g.idsemestre=e.idsemestre AND g.idasignatura=e.idasignatura
              AND (e.idgrupo IS NULL OR g.idgrupo=e.idgrupo))))
          OR (? = 'ESTUDIANTE' AND EXISTS (
            SELECT 1 FROM estudiantegrupo v JOIN grupo g ON g.idgrupo=v.idgrupo
            WHERE v.idusuario=? AND g.idsemestre=e.idsemestre AND g.idasignatura=e.idasignatura
              AND (e.idgrupo IS NULL OR g.idgrupo=e.idgrupo)))
          OR (? IN ('OPERADOR','AYUDANTE') AND EXISTS (
            SELECT 1 FROM ayudantegrupo v JOIN grupo g ON g.idgrupo=v.idgrupo
            WHERE v.idusuario=? AND g.idsemestre=e.idsemestre AND g.idasignatura=e.idasignatura
              AND (e.idgrupo IS NULL OR g.idgrupo=e.idgrupo))))
        """;
    static Object[] parametros(Integer id,String rol) {return new Object[]{rol,rol,id,id,rol,id,rol,id};}
}
