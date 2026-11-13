// Perfil y menú del ayudante (mismo estilo que el panel del docente).
// En pantallas grandes va a la izquierda; en el celular el menú se muestra como pestañas arriba.
import { NavLink } from "react-router-dom";
import { Home, CalendarDays, History } from "lucide-react";
import { obtenerUsuarioActual } from "../../../services/authService";

const OPCIONES = [
  { strRuta: "/control/conectado", strTexto: "Inicio", Icono: Home },
  { strRuta: "/control/examenes", strTexto: "Mis exámenes", Icono: CalendarDays },
  { strRuta: "/control/registros", strTexto: "Mis registros", Icono: History },
];

const claseOpcion = ({ isActive }) =>
  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer " +
  (isActive ? "bg-[#1A365D] text-white shadow-xs" : "text-slate-700 hover:bg-slate-50");

export function PestanasAyudante() {
  return (
    <nav aria-label="Menú del ayudante" className="lg:hidden flex gap-1 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs">
      {OPCIONES.map(({ strRuta, strTexto, Icono }) => (
        <NavLink
          key={strRuta}
          to={strRuta}
          className={({ isActive }) =>
            "flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap " +
            (isActive ? "bg-[#1A365D] text-white" : "text-slate-700")
          }
        >
          <Icono className="w-4 h-4" /> {strTexto}
        </NavLink>
      ))}
    </nav>
  );
}

export default function BarraLateralAyudante({ boolMovilAbierto = false, onCerrarMovil }) {
  const usuario = obtenerUsuarioActual();
  const strNombre = usuario?.nombre || "Ayudante";
  const strApellido = usuario?.apellido || "";
  const strIniciales = `${strNombre.charAt(0)}${strApellido ? strApellido.charAt(0) : ""}`.toUpperCase();

  return (
    <aside className={`w-[280px] shrink-0 space-y-6 lg:block lg:static lg:z-auto lg:translate-x-0 ${boolMovilAbierto ? "fixed left-0 top-0 bottom-0 z-50 overflow-y-auto translate-x-0 bg-[#F8FAFC] p-4 pt-6 shadow-2xl" : "fixed left-0 top-0 bottom-0 z-50 overflow-y-auto -translate-x-full bg-[#F8FAFC] p-4 pt-6 shadow-2xl lg:translate-x-0"}`}>
      <div className="flex justify-end lg:hidden mb-1">
        <button type="button" onClick={onCerrarMovil} className="rounded-lg px-3 py-1.5 text-sm font-bold text-[#003770] hover:bg-white">Cerrar ×</button>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1A365D] text-white font-black text-xl flex items-center justify-center shadow-md mb-3">
          {strIniciales}
        </div>
        <h3 className="font-extrabold text-[#1A365D] text-sm uppercase">{strNombre} {strApellido}</h3>
        <span className="text-[11px] text-[#1A365D] font-bold mb-4">AYUDANTE</span>
        <div className="w-full border-t border-slate-100 pt-3 text-left text-xs">
          <p className="text-slate-600"><span className="font-bold text-[#1A365D]">C.I.:</span> {usuario?.ci || "-"}</p>
        </div>
      </div>

      <nav aria-label="Menú del ayudante" className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1">
        {OPCIONES.map(({ strRuta, strTexto, Icono }) => (
          <NavLink key={strRuta} to={strRuta} className={claseOpcion}>
            {({ isActive }) => (
              <>
                <Icono className={`w-4 h-4 ${isActive ? "text-white" : "text-[#1A365D]"}`} />
                {strTexto}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
