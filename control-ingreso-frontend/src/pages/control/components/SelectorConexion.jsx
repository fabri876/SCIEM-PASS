// Conmutador Online / Offline de la demo (la red real también actualiza el estado).
// en el banner de Inicio y arriba de la pantalla de registro. No se cambió su funcionamiento.
// boolEnBanner: colores translúcidos para que no resalte sobre el banner azul.
import { useOperador } from "../operadorContexto";

export default function SelectorConexion({ boolEnBanner = false }) {
  const { estadoRed, fnCambiarRed } = useOperador();
  const boolEnLinea = estadoRed.net !== "offline";

  const strCaja = boolEnBanner
    ? "bg-white/15 border border-white/30"
    : "bg-white border border-[#CBD5E1] shadow-xs";
  const strOnlineActivo = boolEnBanner ? "bg-white text-[#1A365D] shadow-xs" : "bg-[#003770] text-white shadow-xs";
  const strInactivo = boolEnBanner ? "text-white/80 hover:bg-white/10" : "text-[#64748B] hover:bg-[#F1F5F9]";
  const strEtiqueta = boolEnBanner ? "text-white/85" : "text-[#64748B]";
  const strValor = boolEnBanner
    ? (boolEnLinea ? "text-white" : "text-[#FECACA]")
    : (boolEnLinea ? "text-[#1860A3]" : "text-[#B91C1C]");

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className={"inline-flex items-center gap-1 p-1.5 rounded-2xl " + strCaja}>
        <button
          type="button"
          onClick={() => fnCambiarRed("online")}
          aria-pressed={boolEnLinea}
          className={
            "px-4 h-9 rounded-xl text-xs font-extrabold transition-colors cursor-pointer " +
            (boolEnLinea ? strOnlineActivo : strInactivo)
          }
        >
          Online
        </button>
        <button
          type="button"
          onClick={() => fnCambiarRed("offline")}
          aria-pressed={!boolEnLinea}
          className={
            "px-4 h-9 rounded-xl text-xs font-extrabold transition-colors cursor-pointer " +
            (!boolEnLinea ? "bg-[#B91C1C] text-white shadow-xs" : strInactivo)
          }
        >
          Offline
        </button>
      </div>
      <p className={"text-xs font-bold " + strEtiqueta}>
        Estado actual:{" "}
        <span className={strValor}>
          {boolEnLinea ? "Con red" : "Sin red"}
        </span>
      </p>
    </div>
  );
}