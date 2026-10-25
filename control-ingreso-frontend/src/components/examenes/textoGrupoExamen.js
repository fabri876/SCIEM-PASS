// Texto del grupo de un examen para las tarjetas ("Grupo C1").
// El backend manda el grupo del examen (examen.idgrupo). Los exámenes antiguos, que todavía
// no tienen grupo, llegan con todos los grupos de la materia unidos ("A, B, C1"): en ese caso
// no se sabe cuál es y no se muestra nada, para no mostrar un grupo equivocado.
export function textoGrupoExamen(valor) {
  if (valor === undefined || valor === null) return "";
  const str = String(valor).trim();
  if (!str || str.includes(",")) return "";
  return `Grupo ${str.replace(/^grupo\s*/i, "").trim()}`;
}
