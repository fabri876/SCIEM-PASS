// "Tu fila: apellidos A – F" (cuando el examen se reparte entre varios operadores)
export default function PildoraFila({ objFila }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#003770] text-white whitespace-nowrap">
      Tu fila: apellidos {objFila.desde} – {objFila.hasta}
    </span>
  );
}
