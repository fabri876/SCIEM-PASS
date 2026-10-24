// "Sin internet: apellidos A – F" (tramo del ayudante cuando el aula se reparte entre varios)
export default function PildoraFila({ objFila }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#003770] text-white whitespace-nowrap">
      Sin internet: apellidos {objFila.desde} – {objFila.hasta}
    </span>
  );
}
